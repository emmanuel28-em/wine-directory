import { getDataClient } from "./dataClient.js";
import { canInviteRole, requireRestaurantId } from "./permissions.js";
import { listFirst } from "./workspace.js";

function assertNoErrors(result, fallbackMessage) {
  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  if (!result.data) {
    throw new Error(fallbackMessage);
  }

  return result.data;
}

function makeInviteToken() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getInviteExpiration() {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString();
}

function getUserEmail(user, fallback = "") {
  return user?.signInDetails?.loginId || user?.username || fallback;
}

export function makeInviteLink(token) {
  return `${window.location.origin}/accept-invite?token=${encodeURIComponent(token)}`;
}

export async function createInvite({ restaurantId, invite, invitedBy, currentRole }) {
  requireRestaurantId(restaurantId);

  if (!canInviteRole(currentRole, invite.role)) {
    throw new Error("You do not have permission to invite that role.");
  }

  const dataClient = getDataClient();
  const inviteToken = makeInviteToken();

  return assertNoErrors(
    await dataClient.models.Invite.create({
      restaurantId,
      email: invite.email.trim().toLowerCase(),
      firstName: invite.firstName.trim(),
      lastName: invite.lastName.trim(),
      role: invite.role,
      status: "pending",
      invitedBy,
      inviteToken,
      note: invite.note.trim(),
      expiresAt: getInviteExpiration()
    }),
    "Invite was not created."
  );
}

export async function listInvitesForRestaurant(restaurantId) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();
  const result = await dataClient.models.Invite.list({
    filter: {
      restaurantId: {
        eq: restaurantId
      }
    }
  });

  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  return [...(result.data || [])].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export async function getPendingInviteByToken(token) {
  const dataClient = getDataClient();
  const invite = await listFirst(dataClient.models.Invite, {
    inviteToken: {
      eq: token
    }
  });

  if (!invite) {
    return {
      status: "missing",
      invite: null,
      restaurant: null,
      message: "This invite link could not be found."
    };
  }

  if (invite.status !== "pending") {
    return {
      status: invite.status,
      invite,
      restaurant: null,
      message: `This invite is ${invite.status}.`
    };
  }

  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    await dataClient.models.Invite.update({
      id: invite.id,
      status: "expired"
    });

    return {
      status: "expired",
      invite,
      restaurant: null,
      message: "This invite has expired."
    };
  }

  const restaurantResult = await dataClient.models.Restaurant.get({ id: invite.restaurantId });

  if (restaurantResult.errors?.length) {
    throw new Error(restaurantResult.errors.map((error) => error.message).join(" "));
  }

  return {
    status: "ready",
    invite,
    restaurant: restaurantResult.data,
    message: ""
  };
}

export async function acceptInviteForUser({ invite, user, firstName, lastName }) {
  const dataClient = getDataClient();
  const latestInviteResult = await dataClient.models.Invite.get({ id: invite.id });

  if (latestInviteResult.errors?.length) {
    throw new Error(latestInviteResult.errors.map((error) => error.message).join(" "));
  }

  const latestInvite = latestInviteResult.data;

  if (!latestInvite) {
    throw new Error("This invite could not be found.");
  }

  if (latestInvite.status !== "pending") {
    throw new Error(`This invite is ${latestInvite.status}. Ask your manager for a new invite.`);
  }

  if (latestInvite.expiresAt && new Date(latestInvite.expiresAt) < new Date()) {
    await dataClient.models.Invite.update({
      id: latestInvite.id,
      status: "expired"
    });
    throw new Error("This invite has expired. Ask your manager for a new invite.");
  }

  const userEmail = getUserEmail(user).toLowerCase();
  const inviteEmail = (latestInvite.email || "").toLowerCase();

  if (inviteEmail && userEmail !== inviteEmail) {
    throw new Error(`This invite was sent to ${latestInvite.email}. Sign in with that email address to accept it.`);
  }

  const name = `${firstName || latestInvite.firstName || ""} ${lastName || latestInvite.lastName || ""}`.trim() || userEmail;
  const existingProfile = await listFirst(dataClient.models.UserProfile, {
    cognitoUserId: {
      eq: user.userId
    }
  });

  const userProfile = existingProfile
    ? assertNoErrors(
        await dataClient.models.UserProfile.update({
          id: existingProfile.id,
          name,
          email: userEmail,
          activeRestaurantId: latestInvite.restaurantId
        }),
        "User profile was not updated."
      )
    : assertNoErrors(
        await dataClient.models.UserProfile.create({
          cognitoUserId: user.userId,
          name,
          email: userEmail,
          activeRestaurantId: latestInvite.restaurantId
        }),
        "User profile was not created."
      );

  const membershipResult = await dataClient.models.Membership.list({
    filter: {
      userProfileId: {
        eq: userProfile.id
      }
    }
  });

  if (membershipResult.errors?.length) {
    throw new Error(membershipResult.errors.map((error) => error.message).join(" "));
  }

  const existingMembership = (membershipResult.data || []).find((membershipItem) => membershipItem.restaurantId === latestInvite.restaurantId);

  const membership = existingMembership
    ? assertNoErrors(
        await dataClient.models.Membership.update({
          id: existingMembership.id,
          role: latestInvite.role,
          status: "active"
        }),
        "Membership was not updated."
      )
    : assertNoErrors(
        await dataClient.models.Membership.create({
          restaurantId: latestInvite.restaurantId,
          userProfileId: userProfile.id,
          role: latestInvite.role,
          status: "active"
        }),
        "Membership was not created."
      );

  await dataClient.models.Invite.update({
    id: latestInvite.id,
    status: "accepted"
  });

  return {
    userProfile,
    membership
  };
}
