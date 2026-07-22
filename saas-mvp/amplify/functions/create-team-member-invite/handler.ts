import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
  CreateGroupCommand,
  ListUsersCommand,
  type AttributeType
} from "@aws-sdk/client-cognito-identity-provider";
import {
  DynamoDBClient,
  PutItemCommand,
  ScanCommand,
  type AttributeValue
} from "@aws-sdk/client-dynamodb";
import { randomUUID } from "node:crypto";
import { requireRestaurantRole } from "../shared/restaurantAccess";

type TeamMemberInviteEvent = {
  identity?: {
    sub?: string;
    username?: string;
    claims?: Record<string, unknown>;
  };
  arguments: {
    restaurantId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    note?: string;
  };
};

const cognito = new CognitoIdentityProviderClient({});
const dynamo = new DynamoDBClient({});

function env(name: string) {
  const value = process.env[name] || "";
  if (!value) throw new Error(`Team invite is missing ${name}.`);
  return value;
}

function canInviteRole(callerRole: string, invitedRole: string) {
  if (callerRole === "owner") return ["admin", "manager", "staff"].includes(invitedRole);
  if (callerRole === "admin") return ["manager", "staff"].includes(invitedRole);
  if (callerRole === "manager") return invitedRole === "staff";
  return false;
}

function cleanEmail(value: string) {
  return value.trim().toLowerCase();
}

function cleanName(firstName: string, lastName: string, email: string) {
  return `${firstName || ""} ${lastName || ""}`.trim() || email;
}

function workspaceGroups(restaurantId: string) {
  return {
    tenantGroup: `lineup-${restaurantId}`,
    managerGroup: `lineup-${restaurantId}-managers`
  };
}

function attribute(attributes: AttributeType[] | undefined, name: string) {
  return attributes?.find((item) => item.Name === name)?.Value || "";
}

async function ensureGroup(userPoolId: string, groupName: string, description: string) {
  try {
    await cognito.send(new CreateGroupCommand({ UserPoolId: userPoolId, GroupName: groupName, Description: description }));
  } catch (error) {
    if ((error as { name?: string }).name !== "GroupExistsException") throw error;
  }
}

async function findUserByEmail(userPoolId: string, email: string) {
  const escapedEmail = email.replace(/\\/g, "\\\\").replace(/\"/g, '\\"');
  const result = await cognito.send(
    new ListUsersCommand({ UserPoolId: userPoolId, Filter: `email = "${escapedEmail}"`, Limit: 2 })
  );
  return result.Users?.[0] || null;
}

async function createOrFindCognitoUser({
  userPoolId,
  email,
  firstName,
  lastName
}: {
  userPoolId: string;
  email: string;
  firstName: string;
  lastName: string;
}) {
  try {
    const result = await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        DesiredDeliveryMediums: ["EMAIL"],
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
          { Name: "given_name", Value: firstName },
          { Name: "family_name", Value: lastName },
          { Name: "name", Value: cleanName(firstName, lastName, email) }
        ]
      })
    );
    return {
      username: result.User?.Username || email,
      sub: attribute(result.User?.Attributes, "sub"),
      status: "emailSent",
      emailWasSent: true
    };
  } catch (error) {
    if ((error as { name?: string }).name !== "UsernameExistsException") {
      throw error;
    }

    const existingUser = await findUserByEmail(userPoolId, email);
    if (!existingUser?.Username) {
      throw new Error("This person already has a login, but Line Up could not locate the account.");
    }

    try {
      const resendResult = await cognito.send(
        new AdminCreateUserCommand({
          UserPoolId: userPoolId,
          Username: existingUser.Username,
          MessageAction: "RESEND",
          DesiredDeliveryMediums: ["EMAIL"],
          UserAttributes: [
            { Name: "email", Value: email },
            { Name: "email_verified", Value: "true" },
            { Name: "given_name", Value: firstName },
            { Name: "family_name", Value: lastName },
            { Name: "name", Value: cleanName(firstName, lastName, email) }
          ]
        })
      );

      return {
        username: resendResult.User?.Username || existingUser.Username,
        sub: attribute(resendResult.User?.Attributes, "sub"),
        status: "emailResent",
        emailWasSent: true
      };
    } catch {
      // If the person already completed setup, Cognito cannot resend the
      // temporary password email. In that case we still grant workspace access
      // and tell the manager the user can sign in normally.
    }

    const user = await cognito.send(new AdminGetUserCommand({ UserPoolId: userPoolId, Username: existingUser.Username }));
    return {
      username: existingUser.Username,
      sub: attribute(user.UserAttributes, "sub"),
      status: "existingUser",
      emailWasSent: false
    };
  }
}

async function scanFirst(tableName: string, expression: string, values: Record<string, AttributeValue>) {
  let exclusiveStartKey: Record<string, AttributeValue> | undefined;
  do {
    const result = await dynamo.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: expression,
        ExpressionAttributeValues: values,
        ExclusiveStartKey: exclusiveStartKey
      })
    );
    if (result.Items?.[0]) return result.Items[0];
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);
  return null;
}

async function getRestaurantName(restaurantId: string) {
  const restaurant = await scanFirst(env("RESTAURANT_TABLE_NAME"), "id = :id", { ":id": { S: restaurantId } });
  return restaurant?.name?.S || "Restaurant";
}

async function upsertProfileAndMembership({
  restaurantId,
  email,
  firstName,
  lastName,
  role,
  cognitoUserId,
  tenantGroup,
  managerGroup
}: {
  restaurantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  cognitoUserId: string;
  tenantGroup: string;
  managerGroup: string;
}) {
  const now = new Date().toISOString();
  const profile = await scanFirst(env("USER_PROFILE_TABLE_NAME"), "cognitoUserId = :user", {
    ":user": { S: cognitoUserId }
  });
  const userProfileId = profile?.id?.S || randomUUID();
  const membership = await scanFirst(env("MEMBERSHIP_TABLE_NAME"), "restaurantId = :restaurant AND cognitoUserId = :user", {
    ":restaurant": { S: restaurantId },
    ":user": { S: cognitoUserId }
  });
  const membershipId = membership?.id?.S || randomUUID();

  await dynamo.send(
    new PutItemCommand({
      TableName: env("USER_PROFILE_TABLE_NAME"),
      Item: {
        id: { S: userProfileId },
        __typename: { S: "UserProfile" },
        cognitoUserId: { S: cognitoUserId },
        name: { S: cleanName(firstName, lastName, email) },
        email: { S: email },
        activeRestaurantId: { S: restaurantId },
        tenantGroup: { S: tenantGroup },
        managerGroup: { S: managerGroup },
        createdAt: { S: profile?.createdAt?.S || now },
        updatedAt: { S: now }
      }
    })
  );

  await dynamo.send(
    new PutItemCommand({
      TableName: env("MEMBERSHIP_TABLE_NAME"),
      Item: {
        id: { S: membershipId },
        __typename: { S: "Membership" },
        restaurantId: { S: restaurantId },
        userProfileId: { S: userProfileId },
        cognitoUserId: { S: cognitoUserId },
        role: { S: role },
        status: { S: "active" },
        tenantGroup: { S: tenantGroup },
        managerGroup: { S: managerGroup },
        createdAt: { S: membership?.createdAt?.S || now },
        updatedAt: { S: now }
      }
    })
  );

  return { userProfileId, membershipId };
}

async function recordInvite({
  restaurantId,
  email,
  firstName,
  lastName,
  role,
  note,
  invitedBy,
  tenantGroup,
  managerGroup,
  emailWasSent
}: {
  restaurantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  note: string;
  invitedBy: string;
  tenantGroup: string;
  managerGroup: string;
  emailWasSent: boolean;
}) {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  await dynamo.send(
    new PutItemCommand({
      TableName: env("INVITE_TABLE_NAME"),
      Item: {
        id: { S: randomUUID() },
        __typename: { S: "Invite" },
        restaurantId: { S: restaurantId },
        email: { S: email },
        firstName: { S: firstName },
        lastName: { S: lastName },
        role: { S: role },
        status: { S: "accepted" },
        invitedBy: { S: invitedBy },
        inviteToken: { S: randomUUID() },
        note: { S: note },
        expiresAt: { S: expiresAt },
        emailSentAt: emailWasSent ? { S: now } : { NULL: true },
        emailSendStatus: { S: emailWasSent ? "sent" : "notSent" },
        emailSendError: { S: emailWasSent ? "" : "Existing Line Up login; account access was granted without a new email." },
        lastEmailAttemptAt: { S: now },
        tenantGroup: { S: tenantGroup },
        managerGroup: { S: managerGroup },
        createdAt: { S: now },
        updatedAt: { S: now }
      }
    })
  );
}

export const handler = async (event: TeamMemberInviteEvent) => {
  try {
    const restaurantId = event.arguments.restaurantId || "";
    const email = cleanEmail(event.arguments.email || "");
    const firstName = (event.arguments.firstName || "").trim();
    const lastName = (event.arguments.lastName || "").trim();
    const role = event.arguments.role || "staff";
    const note = (event.arguments.note || "").trim();

    if (!restaurantId || !email || !firstName || !lastName) {
      throw new Error("First name, last name, email, and restaurant are required.");
    }
    if (!["admin", "manager", "staff"].includes(role)) {
      throw new Error("Choose a valid role.");
    }

    const caller = await requireRestaurantRole({
      identity: event.identity,
      restaurantId,
      allowedRoles: ["owner", "admin", "manager"]
    });
    if (!canInviteRole(caller.role, role)) {
      throw new Error("You do not have permission to invite that role.");
    }

    const userPoolId = env("USER_POOL_ID");
    const restaurantName = await getRestaurantName(restaurantId);
    const groups = workspaceGroups(restaurantId);
    await ensureGroup(userPoolId, groups.tenantGroup, `Line Up tenant access for ${restaurantName}`);
    await ensureGroup(userPoolId, groups.managerGroup, `Line Up manager access for ${restaurantName}`);

    const cognitoUser = await createOrFindCognitoUser({ userPoolId, email, firstName, lastName });
    if (!cognitoUser.sub) {
      throw new Error("The user account was created, but Cognito did not return a user id.");
    }

    await cognito.send(new AdminAddUserToGroupCommand({ UserPoolId: userPoolId, Username: cognitoUser.username, GroupName: groups.tenantGroup }));
    if (["admin", "manager"].includes(role)) {
      await cognito.send(new AdminAddUserToGroupCommand({ UserPoolId: userPoolId, Username: cognitoUser.username, GroupName: groups.managerGroup }));
    }

    const { userProfileId, membershipId } = await upsertProfileAndMembership({
      restaurantId,
      email,
      firstName,
      lastName,
      role,
      cognitoUserId: cognitoUser.sub,
      tenantGroup: groups.tenantGroup,
      managerGroup: groups.managerGroup
    });

    await recordInvite({
      restaurantId,
      email,
      firstName,
      lastName,
      role,
      note,
      invitedBy: caller.userProfileId,
      tenantGroup: groups.tenantGroup,
      managerGroup: groups.managerGroup,
      emailWasSent: cognitoUser.emailWasSent
    });

    return {
      success: true,
      status: cognitoUser.status,
      error: "",
      email,
      role,
      userProfileId,
      membershipId
    };
  } catch (error) {
    return {
      success: false,
      status: "failed",
      error: error instanceof Error ? error.message : "Team member invite could not be sent.",
      email: event.arguments.email || "",
      role: event.arguments.role || "",
      userProfileId: "",
      membershipId: ""
    };
  }
};
