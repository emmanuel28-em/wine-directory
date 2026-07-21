import { getUrl, uploadData } from "aws-amplify/storage";
import { getDataClient } from "./dataClient.js";
import { assertSameRestaurant, canInviteRole, isOwner, requireRestaurantId } from "./permissions.js";

function assertNoErrors(result, fallbackMessage) {
  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  if (!result.data) {
    throw new Error(fallbackMessage);
  }

  return result.data;
}

function cleanPathPart(value) {
  return String(value || "file")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "file";
}

function canChangeMemberRole({ currentRole, targetMembership, nextRole }) {
  if (targetMembership.role === "owner") {
    return false;
  }

  if (isOwner(currentRole)) {
    return ["admin", "manager", "staff"].includes(nextRole);
  }

  // Admins can organize day-to-day restaurant roles, but only the Account
  // Owner can appoint another Admin.
  return currentRole === "admin" && !["owner", "admin"].includes(targetMembership.role) && ["manager", "staff"].includes(nextRole);
}

function canDisableMember({ currentRole, currentMembershipId, targetMembership }) {
  if (targetMembership.id === currentMembershipId) {
    return false;
  }

  if (targetMembership.role === "owner") {
    return false;
  }

  if (isOwner(currentRole)) {
    return true;
  }

  return currentRole === "admin" && ["manager", "staff"].includes(targetMembership.role);
}

async function getMembershipForRestaurant({ dataClient, membershipId, restaurantId }) {
  const result = await dataClient.models.Membership.get({ id: membershipId });

  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  assertSameRestaurant(result.data, restaurantId, "Team Member");
  return result.data;
}

export async function updateRestaurantProfile({ restaurantId, form }) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();
  const existing = await dataClient.models.Restaurant.get({ id: restaurantId });

  if (existing.errors?.length) {
    throw new Error(existing.errors.map((error) => error.message).join(" "));
  }

  if (!existing.data) {
    throw new Error("Restaurant workspace was not found.");
  }

  return assertNoErrors(
    await dataClient.models.Restaurant.update({
      id: restaurantId,
      name: form.name.trim(),
      address: form.address.trim(),
      city: form.city.trim(),
      website: form.website.trim(),
      primaryContactName: form.primaryContactName.trim(),
      primaryContactEmail: form.primaryContactEmail.trim() || null
    }),
    "Restaurant profile was not updated."
  );
}

export async function uploadRestaurantLogo({ restaurantId, file }) {
  requireRestaurantId(restaurantId);

  if (!file) {
    throw new Error("Choose a logo file first.");
  }

  if (file.type && !file.type.startsWith("image/")) {
    throw new Error("Restaurant logo must be an image file.");
  }

  const dataClient = getDataClient();
  const fileName = cleanPathPart(file.name);
  const storageKey = `restaurants/${restaurantId}/settings/logo/${Date.now()}-${fileName}`;

  await uploadData({
    path: storageKey,
    data: file,
    options: {
      contentType: file.type || "image/*"
    }
  }).result;

  return assertNoErrors(
    await dataClient.models.Restaurant.update({
      id: restaurantId,
      logoStorageKey: storageKey
    }),
    "Restaurant logo was not saved."
  );
}

export async function getRestaurantLogoUrl(restaurant) {
  if (!restaurant?.logoStorageKey) {
    return "";
  }

  const result = await getUrl({
    path: restaurant.logoStorageKey,
    options: {
      expiresIn: 900
    }
  });

  return result.url.toString();
}

export async function listTeamMembersForRestaurant(restaurantId) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();
  const membershipResult = await dataClient.models.Membership.list({
    filter: {
      restaurantId: {
        eq: restaurantId
      }
    }
  });

  if (membershipResult.errors?.length) {
    throw new Error(membershipResult.errors.map((error) => error.message).join(" "));
  }

  const members = await Promise.all(
    (membershipResult.data || []).map(async (membership) => {
      const profileResult = await dataClient.models.UserProfile.get({ id: membership.userProfileId });

      if (profileResult.errors?.length) {
        throw new Error(profileResult.errors.map((error) => error.message).join(" "));
      }

      return {
        membership,
        profile: profileResult.data || null
      };
    })
  );

  return members.sort((a, b) => (a.profile?.name || "").localeCompare(b.profile?.name || ""));
}

export async function updateMemberRole({ restaurantId, currentRole, membershipId, nextRole }) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();
  const targetMembership = await getMembershipForRestaurant({ dataClient, membershipId, restaurantId });

  if (!canChangeMemberRole({ currentRole, targetMembership, nextRole })) {
    throw new Error("You do not have permission to change this role.");
  }

  const result = await dataClient.mutations.manageMemberAccess({
    restaurantId,
    membershipId,
    action: "changeRole",
    role: nextRole
  });
  if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join(" "));
  if (!result.data?.success) throw new Error(result.data?.error || "Member role was not updated.");
  return result.data;
}

export async function disableMember({ restaurantId, currentRole, currentMembershipId, membershipId }) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();
  const targetMembership = await getMembershipForRestaurant({ dataClient, membershipId, restaurantId });

  if (!canDisableMember({ currentRole, currentMembershipId, targetMembership })) {
    throw new Error("You do not have permission to disable this member.");
  }

  const result = await dataClient.mutations.manageMemberAccess({
    restaurantId,
    membershipId,
    action: "disable"
  });
  if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join(" "));
  if (!result.data?.success) throw new Error(result.data?.error || "Member was not disabled.");
  return result.data;
}

export async function revokeInvite({ restaurantId, invite }) {
  requireRestaurantId(restaurantId);
  assertSameRestaurant(invite, restaurantId, "Invite");

  if (invite.status !== "pending") {
    throw new Error("Only pending invites can be revoked.");
  }

  const dataClient = getDataClient();
  return assertNoErrors(
    await dataClient.models.Invite.update({
      id: invite.id,
      status: "revoked"
    }),
    "Invite was not revoked."
  );
}

export async function updateCurrentUserName({ userProfileId, name }) {
  const dataClient = getDataClient();

  return assertNoErrors(
    await dataClient.models.UserProfile.update({
      id: userProfileId,
      name: name.trim()
    }),
    "Display name was not updated."
  );
}

export { canChangeMemberRole, canDisableMember, canInviteRole };
