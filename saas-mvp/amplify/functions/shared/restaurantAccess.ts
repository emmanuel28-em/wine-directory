import { DynamoDBClient, ScanCommand, type AttributeValue } from "@aws-sdk/client-dynamodb";

type AppSyncIdentity = {
  sub?: string;
  username?: string;
  claims?: Record<string, unknown>;
};

const dynamo = new DynamoDBClient({});

function getRequiredEnvironment(name: string) {
  const value = process.env[name] || "";

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function getIdentitySubject(identity?: AppSyncIdentity) {
  const claimSub = typeof identity?.claims?.sub === "string" ? identity.claims.sub : "";
  return identity?.sub || claimSub || identity?.username || "";
}

async function findFirstMatchingItem({
  tableName,
  filterExpression,
  expressionAttributeNames,
  expressionAttributeValues
}: {
  tableName: string;
  filterExpression: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues: Record<string, AttributeValue>;
}) {
  let exclusiveStartKey: Record<string, AttributeValue> | undefined;

  do {
    const result = await dynamo.send(
      new ScanCommand({
        TableName: tableName,
        FilterExpression: filterExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
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

export async function requireRestaurantRole({
  identity,
  restaurantId,
  allowedRoles
}: {
  identity?: AppSyncIdentity;
  restaurantId: string;
  allowedRoles: string[];
}) {
  const cognitoUserId = getIdentitySubject(identity);

  if (!cognitoUserId) {
    throw new Error("A signed-in user is required.");
  }

  const profile = await findFirstMatchingItem({
    tableName: getRequiredEnvironment("USER_PROFILE_TABLE_NAME"),
    filterExpression: "cognitoUserId = :cognitoUserId",
    expressionAttributeValues: {
      ":cognitoUserId": { S: cognitoUserId }
    }
  });
  const userProfileId = profile?.id?.S || "";

  if (!userProfileId) {
    throw new Error("This user is not connected to a Line Up profile.");
  }

  const membership = await findFirstMatchingItem({
    tableName: getRequiredEnvironment("MEMBERSHIP_TABLE_NAME"),
    filterExpression: "restaurantId = :restaurantId AND userProfileId = :userProfileId AND #status = :active",
    expressionAttributeNames: {
      "#status": "status"
    },
    expressionAttributeValues: {
      ":restaurantId": { S: restaurantId },
      ":userProfileId": { S: userProfileId },
      ":active": { S: "active" }
    }
  });
  const role = membership?.role?.S || "";

  if (!allowedRoles.includes(role)) {
    throw new Error("You do not have permission to manage billing for this restaurant.");
  }

  return { role, userProfileId };
}

