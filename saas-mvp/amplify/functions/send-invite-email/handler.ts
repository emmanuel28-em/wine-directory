import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

type InviteEmailEvent = {
  arguments: {
    toEmail: string;
    firstName?: string;
    restaurantName: string;
    role: string;
    inviteUrl: string;
  };
};

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
  return `
    <p>Hi ${firstName || "there"},</p>
    <p>You've been invited to join <strong>${restaurantName}</strong> on Line Up.</p>
    <p>Line Up is where your team can study training material, take quizzes, and track progress before service.</p>
    <p><strong>Your role:</strong> ${roleLabel(role)}</p>
    <p><a href="${inviteUrl}">Accept your invite here</a></p>
    <p>If you were not expecting this invite, you can ignore this email.</p>
    <p>-- Line Up</p>
  `;
}

export const handler = async (event: InviteEmailEvent) => {
  const fromEmail = process.env.LINE_UP_FROM_EMAIL || "";
  const { toEmail, restaurantName, inviteUrl } = event.arguments;

  if (!fromEmail || fromEmail.includes("not-configured")) {
    return {
      success: false,
      status: "notConfigured",
      error: "Email is not configured. Set LINE_UP_FROM_EMAIL and verify it in Amazon SES."
    };
  }

  if (!toEmail || !restaurantName || !inviteUrl) {
    return {
      success: false,
      status: "failed",
      error: "Invite email is missing required information."
    };
  }

  const ses = new SESClient({});

  try {
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
