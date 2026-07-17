import {
  AdminAddUserToGroupCommand,
  AdminGetUserCommand,
  CognitoIdentityProviderClient,
  CreateGroupCommand
} from "@aws-sdk/client-cognito-identity-provider";
import {
  DynamoDBClient,
  ScanCommand,
  TransactWriteItemsCommand,
  type AttributeValue
} from "@aws-sdk/client-dynamodb";
import { randomUUID } from "node:crypto";

type ProvisionEvent = {
  identity?: {
    sub?: string;
    username?: string;
    claims?: Record<string, unknown>;
  };
  request?: { headers?: Record<string, string | undefined> };
  arguments: {
    restaurantName: string;
    managerName: string;
    address?: string;
    website?: string;
  };
};

const dynamo = new DynamoDBClient({});
const cognito = new CognitoIdentityProviderClient({});

function requiredEnvironment(name: string) {
  const value = process.env[name] || "";

  if (!value) {
    throw new Error(`Workspace provisioning is missing ${name}.`);
  }

  return value;
}

function cleanSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "restaurant";
}

function tokenClaims(event: ProvisionEvent) {
  if (event.identity?.claims && Object.keys(event.identity.claims).length > 0) return event.identity.claims;

  // AppSync has already validated this token. This fallback handles resolver
  // payloads that retain request headers but omit the expanded identity.
  const token = String(event.request?.headers?.authorization || "").replace(/^Bearer\s+/i, "");
  try {
    return JSON.parse(Buffer.from(token.split(".")[1] || "", "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function getIdentity(event: ProvisionEvent) {
  const claims = tokenClaims(event);
  const cognitoUserId = String(event.identity?.sub || claims.sub || event.identity?.username || claims["cognito:username"] || "");
  const username = String(event.identity?.username || claims["cognito:username"] || cognitoUserId);
  let email = String(claims.email || "").trim().toLowerCase();

  if (!cognitoUserId) {
    throw new Error("Sign in again before creating a restaurant workspace.");
  }

  if (!email) {
    const cognitoUser = await cognito.send(
      new AdminGetUserCommand({ UserPoolId: requiredEnvironment("USER_POOL_ID"), Username: username })
    );
    email = String(cognitoUser.UserAttributes?.find((attribute) => attribute.Name === "email")?.Value || "")
      .trim()
      .toLowerCase();
  }

  if (!email) throw new Error("Your verified email address could not be found. Sign in again.");

  return { cognitoUserId, username, email };
}

function workspaceGroups(restaurantId: string) {
  return {
    tenantGroup: `lineup-${restaurantId}`,
    managerGroup: `lineup-${restaurantId}-managers`
  };
}

async function ensureGroup(userPoolId: string, groupName: string, description: string) {
  try {
    await cognito.send(new CreateGroupCommand({ UserPoolId: userPoolId, GroupName: groupName, Description: description }));
  } catch (error) {
    if ((error as { name?: string }).name !== "GroupExistsException") {
      throw error;
    }
  }
}

async function findProfile(cognitoUserId: string) {
  let exclusiveStartKey: Record<string, AttributeValue> | undefined;

  do {
    const result = await dynamo.send(
      new ScanCommand({
        TableName: requiredEnvironment("USER_PROFILE_TABLE_NAME"),
        FilterExpression: "cognitoUserId = :cognitoUserId",
        ExpressionAttributeValues: { ":cognitoUserId": { S: cognitoUserId } },
        ExclusiveStartKey: exclusiveStartKey
      })
    );

    if (result.Items?.[0]) {
      return result.Items[0];
    }

    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return null;
}

export const handler = async (event: ProvisionEvent) => {
  try {
    const identity = await getIdentity(event);
    const restaurantName = event.arguments.restaurantName?.trim();
    const managerName = event.arguments.managerName?.trim();

    if (!restaurantName || !managerName) {
      throw new Error("Restaurant name and Account Owner name are required.");
    }

    const existingProfile = await findProfile(identity.cognitoUserId);

    if (existingProfile?.activeRestaurantId?.S) {
      throw new Error("This account already belongs to a restaurant workspace. Open the dashboard instead.");
    }

    const restaurantId = randomUUID();
    const userProfileId = existingProfile?.id?.S || randomUUID();
    const membershipId = randomUUID();
    const now = new Date().toISOString();
    const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const groups = workspaceGroups(restaurantId);
    const userPoolId = requiredEnvironment("USER_POOL_ID");

    await ensureGroup(userPoolId, groups.tenantGroup, `Line Up members for ${restaurantName}`);
    await ensureGroup(userPoolId, groups.managerGroup, `Line Up managers for ${restaurantName}`);
    await cognito.send(new AdminAddUserToGroupCommand({ UserPoolId: userPoolId, Username: identity.email, GroupName: groups.tenantGroup }));
    await cognito.send(new AdminAddUserToGroupCommand({ UserPoolId: userPoolId, Username: identity.email, GroupName: groups.managerGroup }));

    await dynamo.send(
      new TransactWriteItemsCommand({
        TransactItems: [
          {
            Put: {
              TableName: requiredEnvironment("RESTAURANT_TABLE_NAME"),
              ConditionExpression: "attribute_not_exists(id)",
              Item: {
                id: { S: restaurantId },
                __typename: { S: "Restaurant" },
                name: { S: restaurantName },
                slug: { S: `${cleanSlug(restaurantName)}-${restaurantId.slice(0, 6)}` },
                plan: { S: "trial" },
                status: { S: "trial" },
                subscriptionStatus: { S: "trialing" },
                trialEndsAt: { S: trialEnd },
                billingEmail: { S: identity.email },
                address: { S: event.arguments.address?.trim() || "" },
                city: { S: event.arguments.address?.trim() || "" },
                website: { S: event.arguments.website?.trim() || "" },
                primaryContactName: { S: managerName },
                primaryContactEmail: { S: identity.email },
                tenantGroup: { S: groups.tenantGroup },
                managerGroup: { S: groups.managerGroup },
                createdAt: { S: now },
                updatedAt: { S: now }
              }
            }
          },
          {
            Put: {
              TableName: requiredEnvironment("USER_PROFILE_TABLE_NAME"),
              Item: {
                id: { S: userProfileId },
                __typename: { S: "UserProfile" },
                cognitoUserId: { S: identity.cognitoUserId },
                name: { S: managerName },
                email: { S: identity.email },
                activeRestaurantId: { S: restaurantId },
                tenantGroup: { S: groups.tenantGroup },
                managerGroup: { S: groups.managerGroup },
                createdAt: { S: existingProfile?.createdAt?.S || now },
                updatedAt: { S: now }
              }
            }
          },
          {
            Put: {
              TableName: requiredEnvironment("MEMBERSHIP_TABLE_NAME"),
              ConditionExpression: "attribute_not_exists(id)",
              Item: {
                id: { S: membershipId },
                __typename: { S: "Membership" },
                restaurantId: { S: restaurantId },
                userProfileId: { S: userProfileId },
                cognitoUserId: { S: identity.cognitoUserId },
                role: { S: "owner" },
                status: { S: "active" },
                tenantGroup: { S: groups.tenantGroup },
                managerGroup: { S: groups.managerGroup },
                createdAt: { S: now },
                updatedAt: { S: now }
              }
            }
          }
        ]
      })
    );

    return { success: true, error: "", restaurantId, userProfileId, membershipId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Restaurant workspace could not be created.",
      restaurantId: "",
      userProfileId: "",
      membershipId: ""
    };
  }
};
