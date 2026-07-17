// These deterministic Cognito group names will become the database's tenant boundary.
// They are added to records now so existing data can be backfilled before stricter
// backend authorization is switched on in a separate, recoverable migration.
export function getWorkspaceGroups(restaurantId) {
  if (!restaurantId) {
    throw new Error("A restaurant workspace is required.");
  }

  return {
    tenantGroup: `lineup-${restaurantId}`,
    managerGroup: `lineup-${restaurantId}-managers`
  };
}
