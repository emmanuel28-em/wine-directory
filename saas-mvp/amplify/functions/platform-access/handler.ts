import {
  AdminAddUserToGroupCommand,
  AdminListGroupsForUserCommand,
  AdminRemoveUserFromGroupCommand,
  CognitoIdentityProviderClient,
  CreateGroupCommand,
  ListUsersCommand,
  ListUsersInGroupCommand,
  type UserType
} from "@aws-sdk/client-cognito-identity-provider";
import { buildPlatformOperations } from "./operations";

const OWNER_GROUP = "lineup-platform-owners";
const DEVELOPER_GROUP = "lineup-platform-developers";
const cognito = new CognitoIdentityProviderClient({});

type PlatformAccessEvent = {
  identity?: { sub?: string; username?: string; claims?: Record<string, unknown> };
  arguments?: { email?: string; role?: string; action?: string };
};

function userPoolId() {
  const value = process.env.USER_POOL_ID || "";
  if (!value) throw new Error("Platform access is not configured.");
  return value;
}

function identityUsername(event: PlatformAccessEvent) {
  const claims = event.identity?.claims || {};
  return String(event.identity?.username || claims["cognito:username"] || event.identity?.sub || claims.sub || "");
}

async function ensureGroup(name: string) {
  try {
    await cognito.send(new CreateGroupCommand({ UserPoolId: userPoolId(), GroupName: name }));
  } catch (error) {
    if ((error as { name?: string }).name !== "GroupExistsException") throw error;
  }
}

async function groupsFor(username: string) {
  const result = await cognito.send(
    new AdminListGroupsForUserCommand({ UserPoolId: userPoolId(), Username: username })
  );
  return new Set((result.Groups || []).map((group) => group.GroupName || ""));
}

function platformRole(groups: Set<string>) {
  if (groups.has(OWNER_GROUP)) return "platform_owner";
  if (groups.has(DEVELOPER_GROUP)) return "platform_developer";
  return "";
}

function attribute(user: UserType, name: string) {
  return user.Attributes?.find((item) => item.Name === name)?.Value || "";
}

async function usersInGroup(groupName: string) {
  const users: UserType[] = [];
  let nextToken: string | undefined;
  do {
    const result = await cognito.send(
      new ListUsersInGroupCommand({ UserPoolId: userPoolId(), GroupName: groupName, NextToken: nextToken })
    );
    users.push(...(result.Users || []));
    nextToken = result.NextToken;
  } while (nextToken);
  return users;
}

async function listPlatformUsers() {
  const [owners, developers] = await Promise.all([usersInGroup(OWNER_GROUP), usersInGroup(DEVELOPER_GROUP)]);
  const records = new Map<string, { username: string; email: string; role: string; enabled: boolean; status: string }>();

  for (const user of developers) {
    records.set(user.Username || attribute(user, "email"), {
      username: user.Username || "",
      email: attribute(user, "email"),
      role: "platform_developer",
      enabled: user.Enabled !== false,
      status: user.UserStatus || "UNKNOWN"
    });
  }

  for (const user of owners) {
    records.set(user.Username || attribute(user, "email"), {
      username: user.Username || "",
      email: attribute(user, "email"),
      role: "platform_owner",
      enabled: user.Enabled !== false,
      status: user.UserStatus || "UNKNOWN"
    });
  }

  return Array.from(records.values()).sort((left, right) => left.email.localeCompare(right.email));
}

async function findUserByEmail(email: string) {
  const escapedEmail = email.replace(/\\/g, "\\\\").replace(/\"/g, '\\"');
  const result = await cognito.send(
    new ListUsersCommand({ UserPoolId: userPoolId(), Filter: `email = "${escapedEmail}"`, Limit: 2 })
  );
  const user = result.Users?.[0];
  if (!user?.Username) {
    throw new Error("That person must create a Line Up login before platform access can be granted.");
  }
  return user;
}

async function assertOwnerCanBeRemoved(targetUsername: string, callerUsername: string) {
  if (targetUsername === callerUsername) {
    throw new Error("You cannot remove or downgrade your own Platform Owner access.");
  }
  const owners = await usersInGroup(OWNER_GROUP);
  if (owners.length <= 1) {
    throw new Error("Line Up must always have at least one Platform Owner.");
  }
}

export const handler = async (event: PlatformAccessEvent) => {
  try {
    await Promise.all([ensureGroup(OWNER_GROUP), ensureGroup(DEVELOPER_GROUP)]);
    const callerUsername = identityUsername(event);
    if (!callerUsername) throw new Error("Sign in again to use Platform Control.");

    const callerGroups = await groupsFor(callerUsername);
    const currentRole = platformRole(callerGroups);
    if (!currentRole) throw new Error("Platform access is required.");

    const action = event.arguments?.action || "list";
    if (action === "list") {
      const users = currentRole === "platform_owner" ? await listPlatformUsers() : [];
      const operations = currentRole === "platform_owner" ? await buildPlatformOperations() : { workspaces: [], totals: {} };
      return { success: true, error: "", currentRole, usersJson: JSON.stringify(users), operationsJson: JSON.stringify(operations) };
    }

    if (currentRole !== "platform_owner") {
      throw new Error("Only a Platform Owner can change platform access.");
    }

    const email = String(event.arguments?.email || "").trim().toLowerCase();
    const role = event.arguments?.role || "";
    if (!email || !["platform_owner", "platform_developer"].includes(role)) {
      throw new Error("Choose a valid email and platform role.");
    }
    if (!["grant", "revoke"].includes(action)) throw new Error("Choose a valid access action.");

    const target = await findUserByEmail(email);
    const targetUsername = target.Username || "";
    const targetGroups = await groupsFor(targetUsername);
    const targetGroup = role === "platform_owner" ? OWNER_GROUP : DEVELOPER_GROUP;

    if (action === "grant") {
      if (role === "platform_developer" && targetGroups.has(OWNER_GROUP)) {
        await assertOwnerCanBeRemoved(targetUsername, callerUsername);
        await cognito.send(
          new AdminRemoveUserFromGroupCommand({ UserPoolId: userPoolId(), Username: targetUsername, GroupName: OWNER_GROUP })
        );
      }
      const otherGroup = role === "platform_owner" ? DEVELOPER_GROUP : OWNER_GROUP;
      if (targetGroups.has(otherGroup)) {
        await cognito.send(
          new AdminRemoveUserFromGroupCommand({ UserPoolId: userPoolId(), Username: targetUsername, GroupName: otherGroup })
        );
      }
      await cognito.send(
        new AdminAddUserToGroupCommand({ UserPoolId: userPoolId(), Username: targetUsername, GroupName: targetGroup })
      );
    } else {
      if (role === "platform_owner") await assertOwnerCanBeRemoved(targetUsername, callerUsername);
      await cognito.send(
        new AdminRemoveUserFromGroupCommand({ UserPoolId: userPoolId(), Username: targetUsername, GroupName: targetGroup })
      );
    }

    const users = await listPlatformUsers();
    return { success: true, error: "", currentRole, usersJson: JSON.stringify(users), operationsJson: "" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Platform access could not be updated.",
      currentRole: "",
      usersJson: "[]",
      operationsJson: "{}"
    };
  }
};
