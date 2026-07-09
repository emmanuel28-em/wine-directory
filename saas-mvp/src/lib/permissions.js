export const ownerRole = "owner";
export const adminManagerRoles = ["owner", "admin", "manager"];
export const activeMemberRoles = ["owner", "admin", "manager", "staff"];

export function isOwner(role) {
  return role === ownerRole;
}

export function isAdminOrManager(role) {
  return role === "admin" || role === "manager" || role === "owner";
}

export function isStaff(role) {
  return role === "staff";
}

export function canManageContent(role) {
  return isAdminOrManager(role);
}

export function canInviteRole(currentRole, invitedRole) {
  if (isOwner(currentRole)) {
    return ["admin", "manager", "staff"].includes(invitedRole);
  }

  if (currentRole === "admin" || currentRole === "manager") {
    return invitedRole === "staff";
  }

  return false;
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
