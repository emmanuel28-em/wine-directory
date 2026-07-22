import { buildAppUrl } from "./appUrl.js";
import { fetchAuthSession } from "aws-amplify/auth";
import { getDataClient } from "./dataClient.js";
import { canInviteRole, requireRestaurantId } from "./permissions.js";
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

export function makeInviteLink(token) {
  return buildAppUrl(`/accept-invite?token=${encodeURIComponent(token)}`);
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
      ...getWorkspaceGroups(restaurantId),
      email: invite.email.trim().toLowerCase(),
      firstName: invite.firstName.trim(),
      lastName: invite.lastName.trim(),
      role: invite.role,
      status: "pending",
      invitedBy,
      inviteToken,
      note: invite.note.trim(),
      expiresAt: getInviteExpiration(),
      emailSendStatus: "notSent",
      emailSendError: "",
      emailSentAt: null,
      lastEmailAttemptAt: null
    }),
    "Invite was not created."
  );
}

export async function createTeamMemberLoginInvite({ restaurantId, invite, currentRole }) {
  requireRestaurantId(restaurantId);

  if (!canInviteRole(currentRole, invite.role)) {
    throw new Error("You do not have permission to invite that role.");
  }

  const result = await getDataClient().mutations.createTeamMemberInvite({
    restaurantId,
    email: invite.email.trim().toLowerCase(),
    firstName: invite.firstName.trim(),
    lastName: invite.lastName.trim(),
    role: invite.role,
    note: invite.note.trim()
  });

  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  if (!result.data?.success) {
    throw new Error(result.data?.error || "Team member invite could not be sent.");
  }

  return result.data;
}

export async function sendLoginInviteForPendingInvite({ restaurantId, inviteRecord, currentRole }) {
  return createTeamMemberLoginInvite({
    restaurantId,
    currentRole,
    invite: {
      firstName: inviteRecord.firstName || "Team",
      lastName: inviteRecord.lastName || "Member",
      email: inviteRecord.email,
      role: inviteRecord.role,
      note: inviteRecord.note || ""
    }
  });
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
  const result = await dataClient.queries.getInviteDetails({ token });

  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  if (!result.data?.success) {
    return { status: result.data?.status || "error", invite: null, restaurant: null, message: result.data?.error || "This invite is unavailable." };
  }

  const invite = {
    inviteToken: token,
    restaurantId: result.data.restaurantId,
    email: result.data.email,
    firstName: result.data.firstName,
    lastName: result.data.lastName,
    role: result.data.role,
    status: result.data.status,
    expiresAt: result.data.expiresAt
  };

  return {
    status: "ready",
    invite,
    restaurant: { id: result.data.restaurantId, name: result.data.restaurantName },
    message: ""
  };
}

export async function acceptInviteForUser({ invite, user, firstName, lastName }) {
  const dataClient = getDataClient();
  const result = await dataClient.mutations.acceptInvite({
    token: invite.inviteToken,
    firstName: firstName || invite.firstName || "",
    lastName: lastName || invite.lastName || ""
  });

  if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join(" "));
  if (!result.data?.success) throw new Error(result.data?.error || "Invite could not be accepted.");

  await fetchAuthSession({ forceRefresh: true });

  return {
    userProfile: { id: result.data.userProfileId },
    membership: { id: result.data.membershipId, role: result.data.role, restaurantId: result.data.restaurantId }
  };
}

export async function updateInviteEmailStatus({ inviteId, status, error = "" }) {
  const dataClient = getDataClient();
  const now = new Date().toISOString();
  const update = {
    id: inviteId,
    emailSendStatus: status,
    emailSendError: error,
    lastEmailAttemptAt: now
  };

  // Keep emailSentAt as the last successful send time.
  // If a later resend fails, we do not erase the older successful timestamp.
  if (status === "sent") {
    update.emailSentAt = now;
  }

  return assertNoErrors(
    await dataClient.models.Invite.update(update),
    "Invite email status was not updated."
  );
}

export async function sendInviteEmailForInvite({ invite, restaurantName, restaurantId = invite.restaurantId }) {
  if (invite.status !== "pending") {
    throw new Error("Only pending invites can be emailed.");
  }

  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    throw new Error("This invite has expired. Create a new invite.");
  }

  const dataClient = getDataClient();
  const inviteUrl = makeInviteLink(invite.inviteToken);

  try {
    const result = await dataClient.mutations.sendInviteEmail({
      restaurantId,
      toEmail: invite.email,
      firstName: invite.firstName || "",
      restaurantName,
      role: invite.role,
      inviteUrl
    });

    if (result.errors?.length) {
      throw new Error(result.errors.map((error) => error.message).join(" "));
    }

    const emailResult = result.data;

    if (!emailResult?.success) {
      const errorMessage = emailResult?.error || "Email could not be sent.";
      const updatedInvite = await updateInviteEmailStatus({
        inviteId: invite.id,
        status: "failed",
        error: errorMessage
      });

      return {
        invite: updatedInvite,
        success: false,
        error: errorMessage,
        inviteUrl
      };
    }

    const updatedInvite = await updateInviteEmailStatus({
      inviteId: invite.id,
      status: "sent"
    });

    return {
      invite: updatedInvite,
      success: true,
      error: "",
      inviteUrl
    };
  } catch (error) {
    const errorMessage = error.message || "Email could not be sent.";
    const updatedInvite = await updateInviteEmailStatus({
      inviteId: invite.id,
      status: "failed",
      error: errorMessage
    });

    return {
      invite: updatedInvite,
      success: false,
      error: errorMessage,
      inviteUrl
    };
  }
}
