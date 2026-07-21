import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { requireRestaurantRole } from "../shared/restaurantAccess";

type InviteEmailEvent = {
  identity?: {
    sub?: string;
    username?: string;
    claims?: Record<string, unknown>;
  };
  arguments: {
    restaurantId: string;
    toEmail: string;
    firstName?: string;
    restaurantName: string;
    role: string;
    inviteUrl: string;
  };
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function roleLabel(role: string) {
  if (role === "admin") return "Admin";
  if (role === "manager") return "Manager";
  if (role === "staff") return "Staff";
  return role;
}

function buildTextBody({ firstName, restaurantName, role, inviteUrl }: InviteEmailEvent["arguments"]) {
  return [
    `Hi ${firstName || "there"},`,
    "",
    `You've been invited to join ${restaurantName} on Line Up.`,
    "",
    "Line Up is where your team can study training material, take quizzes, and track progress before service.",
    "",
    `Your role: ${roleLabel(role)}`,
    "",
    "Accept your invite here:",
    inviteUrl,
    "",
    "If you were not expecting this invite, you can ignore this email.",
    "",
    "-- Line Up"
  ].join("\n");
}

function buildHtmlBody({ firstName, restaurantName, role, inviteUrl }: InviteEmailEvent["arguments"]) {
  const safeFirstName = escapeHtml(firstName || "there");
  const safeRestaurantName = escapeHtml(restaurantName);
  const safeRole = escapeHtml(roleLabel(role));
  const safeInviteUrl = escapeHtml(inviteUrl);

  return `
    <p>Hi ${safeFirstName},</p>
    <p>You've been invited to join <strong>${safeRestaurantName}</strong> on Line Up.</p>
    <p>Line Up is where your team can study training material, take quizzes, and track progress before service.</p>
    <p><strong>Your role:</strong> ${safeRole}</p>
    <p><a href="${safeInviteUrl}">Accept your invite here</a></p>
    <p>If you were not expecting this invite, you can ignore this email.</p>
    <p>-- Line Up</p>
  `;
}

export const handler = async (event: InviteEmailEvent) => {
  const fromEmail = process.env.LINE_UP_FROM_EMAIL || "";
  const { restaurantId, toEmail, restaurantName, role, inviteUrl } = event.arguments;

  if (!fromEmail || fromEmail.includes("not-configured")) {
    return {
      success: false,
      status: "notConfigured",
      error: "Email is not configured. Set LINE_UP_FROM_EMAIL and verify it in Amazon SES."
    };
  }

  if (!restaurantId || !toEmail || !restaurantName || !inviteUrl) {
    return {
      success: false,
      status: "failed",
      error: "Invite email is missing required information."
    };
  }

  const ses = new SESClient({});

  try {
    const caller = await requireRestaurantRole({
      identity: event.identity,
      restaurantId,
      allowedRoles: ["owner", "admin", "manager"]
    });

    const canSendRole =
      caller.role === "owner" ||
      (caller.role === "admin" && ["manager", "staff"].includes(role)) ||
      (caller.role === "manager" && role === "staff");
    if (!canSendRole) throw new Error("You do not have permission to email an invite for that role.");

    await ses.send(
      new SendEmailCommand({
        Source: fromEmail,
        Destination: {
          ToAddresses: [toEmail]
        },
        Message: {
          Subject: {
            Data: "You've been invited to Line Up"
          },
          Body: {
            Text: {
              Data: buildTextBody(event.arguments)
            },
            Html: {
              Data: buildHtmlBody(event.arguments)
            }
          }
        }
      })
    );

    return {
      success: true,
      status: "sent",
      error: ""
    };
  } catch (error) {
    return {
      success: false,
      status: "failed",
      error: error instanceof Error ? error.message : "Amazon SES could not send this invite email."
    };
  }
};
