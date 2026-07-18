import { getDataClient } from "./dataClient.js";
import { assertSameRestaurant, requireRestaurantId } from "./permissions.js";
import { getWorkspaceGroups } from "./workspaceGroups.js";

function assertNoErrors(result, fallbackMessage) {
  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  if (!result.data) {
    throw new Error(fallbackMessage);
  }

  return result.data;
}

export async function listStaffGroupsForRestaurant(restaurantId) {
  requireRestaurantId(restaurantId);
  const result = await getDataClient().models.StaffGroup.list({
    filter: { restaurantId: { eq: restaurantId } }
  });

  if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join(" "));
  return [...(result.data || [])].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

export async function listStaffGroupMembersForRestaurant(restaurantId) {
  requireRestaurantId(restaurantId);
  const result = await getDataClient().models.StaffGroupMember.list({
    filter: { restaurantId: { eq: restaurantId } }
  });

  if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join(" "));
  return result.data || [];
}

export async function createStaffGroup({ restaurantId, userProfileId, form }) {
  requireRestaurantId(restaurantId);
  const client = getDataClient();
  const group = assertNoErrors(
    await client.models.StaffGroup.create({
      restaurantId,
      ...getWorkspaceGroups(restaurantId),
      name: form.name.trim(),
      description: form.description.trim(),
      status: "active",
      createdBy: userProfileId,
      updatedBy: userProfileId
    }),
    "Staff group was not created."
  );

  for (const member of form.members || []) {
    await client.models.StaffGroupMember.create({
      restaurantId,
      ...getWorkspaceGroups(restaurantId),
      staffGroupId: group.id,
      userProfileId: member.userProfileId,
      membershipId: member.membershipId,
      status: "active"
    });
  }

  return group;
}

export async function updateStaffGroupMembers({ restaurantId, group, members }) {
  requireRestaurantId(restaurantId);
  assertSameRestaurant(group, restaurantId, "Staff Group");
  const client = getDataClient();
  const existingMembers = await listStaffGroupMembersForRestaurant(restaurantId);
  const existingForGroup = existingMembers.filter((member) => member.staffGroupId === group.id);
  const desiredIds = new Set((members || []).map((member) => member.userProfileId));

  for (const existing of existingForGroup) {
    if (!desiredIds.has(existing.userProfileId) && existing.status !== "removed") {
      await client.models.StaffGroupMember.update({ id: existing.id, status: "removed" });
    }
  }

  for (const member of members || []) {
    const existing = existingForGroup.find((item) => item.userProfileId === member.userProfileId);
    if (existing) {
      if (existing.status !== "active") await client.models.StaffGroupMember.update({ id: existing.id, status: "active" });
    } else {
      await client.models.StaffGroupMember.create({
        restaurantId,
        ...getWorkspaceGroups(restaurantId),
        staffGroupId: group.id,
        userProfileId: member.userProfileId,
        membershipId: member.membershipId,
        status: "active"
      });
    }
  }
}

export async function archiveStaffGroup({ restaurantId, group }) {
  requireRestaurantId(restaurantId);
  assertSameRestaurant(group, restaurantId, "Staff Group");
  return assertNoErrors(
    await getDataClient().models.StaffGroup.update({ id: group.id, status: "archived" }),
    "Staff group was not archived."
  );
}

export async function listTrainingAssignmentsForRestaurant(restaurantId) {
  requireRestaurantId(restaurantId);
  const result = await getDataClient().models.TrainingAssignment.list({
    filter: { restaurantId: { eq: restaurantId } }
  });

  if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join(" "));
  return [...(result.data || [])].sort((a, b) => (a.itemType || "").localeCompare(b.itemType || ""));
}

export async function createTrainingAssignment({ restaurantId, userProfileId, form }) {
  requireRestaurantId(restaurantId);

  return assertNoErrors(
    await getDataClient().models.TrainingAssignment.create({
      restaurantId,
      ...getWorkspaceGroups(restaurantId),
      itemType: form.itemType,
      itemId: form.itemId,
      targetType: form.targetType,
      targetId: form.targetId,
      note: form.note.trim(),
      dueDate: form.dueDate || null,
      status: "active",
      assignedBy: userProfileId
    }),
    "Assignment was not created."
  );
}

export async function archiveTrainingAssignment({ restaurantId, assignment }) {
  requireRestaurantId(restaurantId);
  assertSameRestaurant(assignment, restaurantId, "Assignment");

  return assertNoErrors(
    await getDataClient().models.TrainingAssignment.update({ id: assignment.id, status: "archived" }),
    "Assignment was not archived."
  );
}

export function getAssignedItemIdsForUser({ assignments, groupMembers, userProfileId, itemType }) {
  const activeGroupIds = new Set(
    groupMembers
      .filter((member) => member.status === "active" && member.userProfileId === userProfileId)
      .map((member) => member.staffGroupId)
  );

  return new Set(
    assignments
      .filter((assignment) => assignment.status === "active" && assignment.itemType === itemType)
      .filter(
        (assignment) =>
          (assignment.targetType === "member" && assignment.targetId === userProfileId) ||
          (assignment.targetType === "group" && activeGroupIds.has(assignment.targetId))
      )
      .map((assignment) => assignment.itemId)
  );
}
