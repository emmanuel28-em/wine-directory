import {
  AdminAddUserToGroupCommand,
  AdminGetUserCommand,
  AdminRemoveUserFromGroupCommand,
  CognitoIdentityProviderClient,
  CreateGroupCommand
} from "@aws-sdk/client-cognito-identity-provider";
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
  UpdateItemCommand,
  type AttributeValue
} from "@aws-sdk/client-dynamodb";
import { randomUUID } from "node:crypto";

type InviteAccessEvent = {
  identity?: { sub?: string; username?: string; claims?: Record<string, unknown> };
  fieldName?: string;
  info?: { fieldName?: string };
  request?: { headers?: Record<string, string | undefined> };
  arguments: {
    token?: string;
    firstName?: string;
    lastName?: string;
    restaurantId?: string;
    membershipId?: string;
    action?: string;
    role?: string;
  };
};

const dynamo = new DynamoDBClient({});
const cognito = new CognitoIdentityProviderClient({});

function env(name: string) {
  const value = process.env[name] || "";
  if (!value) throw new Error(`Invite access is missing ${name}.`);
  return value;
}

function tokenClaims(event: InviteAccessEvent) {
  if (event.identity?.claims && Object.keys(event.identity.claims).length > 0) return event.identity.claims;
  const token = String(event.request?.headers?.authorization || "").replace(/^Bearer\s+/i, "");
  try {
    return JSON.parse(Buffer.from(token.split(".")[1] || "", "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function identityFor(event: InviteAccessEvent) {
  const claims = tokenClaims(event);
  const cognitoUserId = String(event.identity?.sub || claims.sub || event.identity?.username || claims["cognito:username"] || "");
  const username = String(event.identity?.username || claims["cognito:username"] || cognitoUserId);
  let email = String(claims.email || "").trim().toLowerCase();
  if (!cognitoUserId) throw new Error("Sign in again to use this invite.");

  if (!email) {
    const cognitoUser = await cognito.send(new AdminGetUserCommand({ UserPoolId: env("USER_POOL_ID"), Username: username }));
    email = String(cognitoUser.UserAttributes?.find((attribute) => attribute.Name === "email")?.Value || "")
      .trim()
      .toLowerCase();
  }

  if (!email) throw new Error("Your verified email address could not be found. Sign in again.");
  return { cognitoUserId, username, email };
}

async function scanFirst(tableName: string, expression: string, values: Record<string, AttributeValue>) {
  let key: Record<string, AttributeValue> | undefined;
  do {
    const result = await dynamo.send(new ScanCommand({ TableName: tableName, FilterExpression: expression, ExpressionAttributeValues: values, ExclusiveStartKey: key }));
    if (result.Items?.[0]) return result.Items[0];
    key = result.LastEvaluatedKey;
  } while (key);
  return null;
}

async function ensureGroup(userPoolId: string, name: string) {
  try {
    await cognito.send(new CreateGroupCommand({ UserPoolId: userPoolId, GroupName: name }));
  } catch (error) {
    if ((error as { name?: string }).name !== "GroupExistsException") throw error;
  }
}

function failure(error: unknown) {
  return { success: false, error: error instanceof Error ? error.message : "Invite could not be processed.", status: "error" };
}

async function manageMember(event: InviteAccessEvent, identity: Awaited<ReturnType<typeof identityFor>>) {
  const restaurantId = event.arguments.restaurantId || "";
  const membershipId = event.arguments.membershipId || "";
  const action = event.arguments.action || "";

  if (!restaurantId || !membershipId || !["changeRole", "disable"].includes(action)) {
    throw new Error("The team member update is incomplete.");
  }

  const callerProfile = await scanFirst(env("USER_PROFILE_TABLE_NAME"), "cognitoUserId = :user", {
    ":user": { S: identity.cognitoUserId }
  });
  if (!callerProfile?.id?.S) throw new Error("Your Line Up profile was not found.");

  const callerMembership = await scanFirst(
    env("MEMBERSHIP_TABLE_NAME"),
    "restaurantId = :restaurant AND userProfileId = :profile",
    { ":restaurant": { S: restaurantId }, ":profile": { S: callerProfile.id.S } }
  );
  if (!callerMembership || callerMembership.status?.S !== "active") {
    throw new Error("You do not have active access to this restaurant.");
  }

  const targetResult = await dynamo.send(
    new GetItemCommand({ TableName: env("MEMBERSHIP_TABLE_NAME"), Key: { id: { S: membershipId } } })
  );
  const target = targetResult.Item;
  if (!target || target.restaurantId?.S !== restaurantId) {
    throw new Error("That team member does not belong to this restaurant.");
  }
  if (target.id?.S === callerMembership.id?.S) throw new Error("You cannot change your own access here.");
  if (target.role?.S === "owner") throw new Error("The Account Owner cannot be changed or disabled.");

  const callerRole = callerMembership.role?.S || "staff";
  let nextRole = target.role?.S || "staff";
  let nextStatus = target.status?.S || "active";

  if (action === "changeRole") {
    if (callerRole !== "owner") throw new Error("Only the Account Owner can change team roles.");
    if (!["admin", "manager", "staff"].includes(event.arguments.role || "")) throw new Error("Choose a valid role.");
    nextRole = event.arguments.role || "staff";
  } else {
    const canDisable = callerRole === "owner" || (callerRole === "admin" && target.role?.S === "staff");
    if (!canDisable) throw new Error("You do not have permission to disable this team member.");
    nextStatus = "disabled";
  }

  const targetProfileResult = await dynamo.send(
    new GetItemCommand({ TableName: env("USER_PROFILE_TABLE_NAME"), Key: { id: target.userProfileId } })
  );
  const targetEmail = targetProfileResult.Item?.email?.S || "";
  if (!targetEmail) throw new Error("The team member login email was not found.");

  const tenantGroup = target.tenantGroup?.S || `lineup-${restaurantId}`;
  const managerGroup = target.managerGroup?.S || `lineup-${restaurantId}-managers`;
  const poolId = env("USER_POOL_ID");
  await ensureGroup(poolId, tenantGroup);
  await ensureGroup(poolId, managerGroup);

  if (nextStatus === "disabled") {
    await cognito.send(new AdminRemoveUserFromGroupCommand({ UserPoolId: poolId, Username: targetEmail, GroupName: tenantGroup }));
    await cognito.send(new AdminRemoveUserFromGroupCommand({ UserPoolId: poolId, Username: targetEmail, GroupName: managerGroup }));
  } else {
    await cognito.send(new AdminAddUserToGroupCommand({ UserPoolId: poolId, Username: targetEmail, GroupName: tenantGroup }));
    if (["admin", "manager"].includes(nextRole)) {
      await cognito.send(new AdminAddUserToGroupCommand({ UserPoolId: poolId, Username: targetEmail, GroupName: managerGroup }));
    } else {
      await cognito.send(new AdminRemoveUserFromGroupCommand({ UserPoolId: poolId, Username: targetEmail, GroupName: managerGroup }));
    }
  }

  const now = new Date().toISOString();
  await dynamo.send(
    new UpdateItemCommand({
      TableName: env("MEMBERSHIP_TABLE_NAME"),
      Key: { id: { S: membershipId } },
      UpdateExpression: "SET #role = :role, #status = :status, updatedAt = :now",
      ExpressionAttributeNames: { "#role": "role", "#status": "status" },
      ExpressionAttributeValues: {
        ":role": { S: nextRole },
        ":status": { S: nextStatus },
        ":now": { S: now }
      }
    })
  );

  return { success: true, error: "", membershipId, role: nextRole, status: nextStatus };
}

export const handler = async (event: InviteAccessEvent) => {
  try {
    const identity = await identityFor(event);
    const fieldName = event.fieldName || event.info?.fieldName;
    if (fieldName === "manageMemberAccess") {
      return await manageMember(event, identity);
    }

    const token = event.arguments.token?.trim();
    if (!token) throw new Error("Invite token is missing.");

    const invite = await scanFirst(env("INVITE_TABLE_NAME"), "inviteToken = :token", { ":token": { S: token } });
    if (!invite) throw new Error("This invite link could not be found.");
    if (invite.status?.S !== "pending") throw new Error(`This invite is ${invite.status?.S || "unavailable"}.`);

    if (invite.expiresAt?.S && new Date(invite.expiresAt.S) < new Date()) {
      await dynamo.send(new UpdateItemCommand({ TableName: env("INVITE_TABLE_NAME"), Key: { id: invite.id }, UpdateExpression: "SET #status = :expired", ExpressionAttributeNames: { "#status": "status" }, ExpressionAttributeValues: { ":expired": { S: "expired" } } }));
      throw new Error("This invite has expired. Ask your manager for a new invite.");
    }

    if ((invite.email?.S || "").toLowerCase() !== identity.email) {
      throw new Error(`This invite was sent to ${invite.email?.S}. Sign in with that email address.`);
    }

    const restaurantId = invite.restaurantId?.S || "";
    const restaurant = await dynamo.send(new GetItemCommand({ TableName: env("RESTAURANT_TABLE_NAME"), Key: { id: { S: restaurantId } } }));
    if (!restaurant.Item) throw new Error("The restaurant workspace was not found.");

    const details = {
      success: true,
      error: "",
      status: "pending",
      restaurantId,
      restaurantName: restaurant.Item.name?.S || "Restaurant",
      email: invite.email?.S || "",
      firstName: invite.firstName?.S || "",
      lastName: invite.lastName?.S || "",
      role: invite.role?.S || "staff",
      expiresAt: invite.expiresAt?.S || ""
    };

    if (fieldName === "getInviteDetails") return details;

    const now = new Date().toISOString();
    const tenantGroup = invite.tenantGroup?.S || `lineup-${restaurantId}`;
    const managerGroup = invite.managerGroup?.S || `lineup-${restaurantId}-managers`;
    const profile = await scanFirst(env("USER_PROFILE_TABLE_NAME"), "cognitoUserId = :user", { ":user": { S: identity.cognitoUserId } });
    const userProfileId = profile?.id?.S || randomUUID();
    const existingMembership = await scanFirst(env("MEMBERSHIP_TABLE_NAME"), "restaurantId = :restaurant AND cognitoUserId = :user", {
      ":restaurant": { S: restaurantId },
      ":user": { S: identity.cognitoUserId }
    });
    const membershipId = existingMembership?.id?.S || randomUUID();
    const displayName = `${event.arguments.firstName || invite.firstName?.S || ""} ${event.arguments.lastName || invite.lastName?.S || ""}`.trim() || identity.email;

    await dynamo.send(new PutItemCommand({
      TableName: env("USER_PROFILE_TABLE_NAME"),
      Item: {
        id: { S: userProfileId }, __typename: { S: "UserProfile" }, cognitoUserId: { S: identity.cognitoUserId },
        name: { S: displayName }, email: { S: identity.email }, activeRestaurantId: { S: restaurantId },
        tenantGroup: { S: tenantGroup }, managerGroup: { S: managerGroup },
        createdAt: { S: profile?.createdAt?.S || now }, updatedAt: { S: now }
      }
    }));
    await dynamo.send(new PutItemCommand({
      TableName: env("MEMBERSHIP_TABLE_NAME"),
      Item: {
        id: { S: membershipId }, __typename: { S: "Membership" }, restaurantId: { S: restaurantId }, userProfileId: { S: userProfileId },
        cognitoUserId: { S: identity.cognitoUserId }, role: { S: invite.role?.S || "staff" }, status: { S: "active" },
        tenantGroup: { S: tenantGroup }, managerGroup: { S: managerGroup },
        createdAt: { S: existingMembership?.createdAt?.S || now }, updatedAt: { S: now }
      }
    }));

    const poolId = env("USER_POOL_ID");
    await ensureGroup(poolId, tenantGroup);
    await cognito.send(new AdminAddUserToGroupCommand({ UserPoolId: poolId, Username: identity.email, GroupName: tenantGroup }));
    if (["owner", "admin", "manager"].includes(invite.role?.S || "")) {
      await ensureGroup(poolId, managerGroup);
      await cognito.send(new AdminAddUserToGroupCommand({ UserPoolId: poolId, Username: identity.email, GroupName: managerGroup }));
    }

    await dynamo.send(new UpdateItemCommand({ TableName: env("INVITE_TABLE_NAME"), Key: { id: invite.id }, UpdateExpression: "SET #status = :accepted, updatedAt = :now", ExpressionAttributeNames: { "#status": "status" }, ExpressionAttributeValues: { ":accepted": { S: "accepted" }, ":now": { S: now } } }));

    return { ...details, status: "accepted", userProfileId, membershipId };
  } catch (error) {
    return failure(error);
  }
};
