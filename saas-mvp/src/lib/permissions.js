export const ownerRole = "owner";
export const billingRoles = ["owner"];
export const ownerAdminRoles = ["owner", "admin"];
export const adminManagerRoles = ["owner", "admin", "manager"];
export const activeMemberRoles = ["owner", "admin", "manager", "staff"];

export const rolePermissionSummary = [
  {
    role: "owner",
    label: "Account Owner",
    description: "Handles billing, plan decisions, and final account control. This may be the owner, operator, or business contact."
  },
  {
    role: "admin",
    label: "Admin",
    description: "Runs the workspace day to day. Best for GMs, AGMs, directors, or senior leaders who add training information, create quizzes, assign training, and manage team access."
  },
  {
    role: "manager",
    label: "Manager",
    description: "Keeps training moving. Best for floor managers, wine leaders, bar leaders, head bartenders, and head somms."
  },
  {
    role: "staff",
    label: "Staff",
    description: "Studies published training, takes quizzes, earns certifications, and tracks readiness before going live on the floor."
  }
];

export function isOwner(role) {
  return role === ownerRole;
}

export function isAdminOrManager(role) {
  return role === "admin" || role === "manager" || role === "owner";
}

export function isOwnerOrAdmin(role) {
  return role === "owner" || role === "admin";
}

export function isStaff(role) {
  return role === "staff";
}

export function canManageContent(role) {
  return isAdminOrManager(role);
}

export function canManageBilling(role) {
  return isOwner(role);
}

export function canEditRestaurantProfile(role) {
  return isOwnerOrAdmin(role);
}

export function canManageTeamRoles(role) {
  return role === "owner" || role === "admin";
}

export function canInviteRole(currentRole, invitedRole) {
  if (isOwner(currentRole)) {
    return ["admin", "manager", "staff"].includes(invitedRole);
  }

  if (currentRole === "admin") {
    return ["manager", "staff"].includes(invitedRole);
  }

  if (currentRole === "manager") {
    return invitedRole === "staff";
  }

  return false;
}

export function getAssignableMemberRoles(currentRole) {
  if (isOwner(currentRole)) {
    return ["admin", "manager", "staff"];
  }

  if (currentRole === "admin") {
    return ["manager", "staff"];
  }

  return [];
}

export function canViewStaffProgress(role) {
  return isAdminOrManager(role);
}

export function canManageQuizzes(role) {
  return isAdminOrManager(role);
}

export function requireRestaurantId(restaurantId) {
  if (!restaurantId) {
    throw new Error("A restaurant workspace is required before using this feature.");
  }

  return restaurantId;
}

export function assertActiveWorkspace(workspace) {
  if (!workspace || workspace.status !== "ready" || workspace.membership?.status !== "active" || !workspace.restaurant?.id) {
    throw new Error("An active restaurant workspace is required.");
  }

  return workspace.restaurant.id;
}

export function assertSameRestaurant(record, restaurantId, recordName = "Record") {
  requireRestaurantId(restaurantId);

  if (!record) {
    throw new Error(`${recordName} was not found.`);
  }

  if (record.restaurantId !== restaurantId) {
    throw new Error(`${recordName} does not belong to this restaurant workspace.`);
  }

  return record;
}
