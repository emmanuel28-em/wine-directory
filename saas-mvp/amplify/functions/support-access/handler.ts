import { DynamoDBClient, GetItemCommand, PutItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { randomUUID } from "node:crypto";
import { requireRestaurantRole } from "../shared/restaurantAccess";

type SupportEvent = {
  identity?: { sub?: string; username?: string; claims?: Record<string, unknown> };
  arguments: {
    restaurantId: string;
    title: string;
    category: string;
    description: string;
    expectedBehavior?: string;
    actualBehavior?: string;
    route?: string;
    browserInfo?: string;
  };
};

const dynamo = new DynamoDBClient({});
const allowedCategories = new Set(["upload", "access", "content", "invite", "quiz", "billing", "login", "feature_request", "other"]);

function env(name: string) {
  const value = process.env[name] || "";
  if (!value) throw new Error(`Support intake is missing ${name}.`);
  return value;
}

function identitySubject(event: SupportEvent) {
  return String(event.identity?.sub || event.identity?.claims?.sub || event.identity?.username || "");
}

function clean(value: string | undefined, maximum = 6000) {
  return String(value || "").trim().slice(0, maximum);
}

function triage(category: string, description: string) {
  const text = description.toLowerCase();
  if (category === "feature_request") {
    return {
      severity: "low",
      summary: "Product feedback recorded for review.",
      checks: ["Confirm the desired staff workflow", "Record how many users are affected", "Compare with the current product roadmap"]
    };
  }

  if (text.includes("everyone") || text.includes("all users") || text.includes("site is down") || text.includes("cannot log in")) {
    return {
      severity: "critical",
      summary: "Possible restaurant-wide access interruption.",
      checks: ["Check Amplify hosting health", "Check Cognito sign-in errors", "Confirm the restaurant workspace is active"]
    };
  }

  const checksByCategory: Record<string, string[]> = {
    upload: ["Check file size and type", "Check the S3 upload result", "Confirm a FileAsset record was created", "Confirm the user has manager access"],
    access: ["Confirm the Training Page is published", "Confirm the staff Membership is active", "Confirm Cognito restaurant groups", "Confirm the page belongs to this restaurant"],
    content: ["Confirm the page saved", "Check draft versus published status", "Confirm its Training Category", "Check the staff library filter"],
    invite: ["Check invite status and expiration", "Confirm the invited email matches the login", "Check email delivery status", "Confirm Membership creation"],
    quiz: ["Confirm the quiz is published", "Check QuizQuestion records", "Confirm the passing score", "Check QuizAttempt save errors"],
    billing: ["Check subscription status", "Check recent Stripe webhook delivery", "Confirm the billing email", "Check whether workspace access is paused"],
    login: ["Check Cognito user status", "Confirm the email is verified", "Check active Membership", "Ask the user to sign out and back in"]
  };

  return {
    severity: ["upload", "access", "invite", "billing", "login"].includes(category) ? "high" : "normal",
    summary: category === "other" ? "Support review required." : `Possible ${category.replace("_", " ")} workflow issue.`,
    checks: checksByCategory[category] || ["Reproduce the issue", "Check recent application logs", "Confirm the user's restaurant and role"]
  };
}

async function sendAlert({ reference, restaurantName, reporterEmail, title, category, severity, description }: Record<string, string>) {
  const fromEmail = process.env.LINE_UP_FROM_EMAIL || "";
  const supportEmail = process.env.LINE_UP_SUPPORT_EMAIL || "";
  if (!supportEmail || !fromEmail || fromEmail.includes("not-configured")) return "notConfigured";

  try {
    await new SESClient({}).send(
      new SendEmailCommand({
        Source: fromEmail,
        Destination: { ToAddresses: [supportEmail] },
        Message: {
          Subject: { Data: `[${severity.toUpperCase()}] ${reference} - ${title}` },
          Body: {
            Text: {
              Data: [
                `Restaurant: ${restaurantName}`,
                `Reporter: ${reporterEmail}`,
                `Category: ${category}`,
                `Severity: ${severity}`,
                `Reference: ${reference}`,
                "",
                description,
                "",
                "Open Line Up Platform Support to review this ticket."
              ].join("\n")
            }
          }
        }
      })
    );
    return "sent";
  } catch {
    return "failed";
  }
}

export const handler = async (event: SupportEvent) => {
  try {
    const args = event.arguments;
    const title = clean(args.title, 160);
    const description = clean(args.description);
    const category = clean(args.category, 40);
    if (!title || !description) throw new Error("Describe the problem before sending it.");
    if (!allowedCategories.has(category)) throw new Error("Choose a valid support category.");

    const caller = await requireRestaurantRole({
      identity: event.identity,
      restaurantId: args.restaurantId,
      allowedRoles: ["owner", "admin", "manager", "staff"]
    });
    const [restaurantResult, profileResult] = await Promise.all([
      dynamo.send(new GetItemCommand({ TableName: env("RESTAURANT_TABLE_NAME"), Key: { id: { S: args.restaurantId } } })),
      dynamo.send(new GetItemCommand({ TableName: env("USER_PROFILE_TABLE_NAME"), Key: { id: { S: caller.userProfileId } } }))
    ]);
    const restaurant = restaurantResult.Item;
    const profile = profileResult.Item;
    if (!restaurant) throw new Error("Your restaurant workspace could not be found.");

    const ticketId = randomUUID();
    const reference = `LU-${Date.now().toString(36).toUpperCase()}-${ticketId.slice(0, 4).toUpperCase()}`;
    const now = new Date().toISOString();
    const result = triage(category, description);
    const restaurantName = restaurant.name?.S || "Restaurant";
    const reporterEmail = profile?.email?.S || "";
    const reporterName = profile?.name?.S || reporterEmail || "Line Up user";
    const cognitoUserId = identitySubject(event);

    await dynamo.send(
      new PutItemCommand({
        TableName: env("SUPPORT_TICKET_TABLE_NAME"),
        ConditionExpression: "attribute_not_exists(id)",
        Item: {
          id: { S: ticketId },
          __typename: { S: "SupportTicket" },
          restaurantId: { S: args.restaurantId },
          restaurantName: { S: restaurantName },
          reference: { S: reference },
          title: { S: title },
          category: { S: category },
          severity: { S: result.severity },
          status: { S: "open" },
          description: { S: description },
          expectedBehavior: { S: clean(args.expectedBehavior) },
          actualBehavior: { S: clean(args.actualBehavior) },
          route: { S: clean(args.route, 500) },
          browserInfo: { S: clean(args.browserInfo, 1000) },
          reporterName: { S: reporterName },
          reporterEmail: { S: reporterEmail },
          reporterRole: { S: caller.role },
          reporterUserProfileId: { S: caller.userProfileId },
          reportedByCognitoUserId: { S: cognitoUserId },
          triageSummary: { S: result.summary },
          suggestedChecksJson: { S: JSON.stringify(result.checks) },
          alertStatus: { S: "pending" },
          tenantGroup: { S: restaurant.tenantGroup?.S || `lineup-${args.restaurantId}` },
          managerGroup: { S: restaurant.managerGroup?.S || `lineup-${args.restaurantId}-managers` },
          createdAt: { S: now },
          updatedAt: { S: now }
        }
      })
    );

    const alertStatus = await sendAlert({
      reference,
      restaurantName,
      reporterEmail,
      title,
      category,
      severity: result.severity,
      description
    });
    await dynamo.send(
      new UpdateItemCommand({
        TableName: env("SUPPORT_TICKET_TABLE_NAME"),
        Key: { id: { S: ticketId } },
        UpdateExpression: "SET alertStatus = :alertStatus, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":alertStatus": { S: alertStatus },
          ":updatedAt": { S: new Date().toISOString() }
        }
      })
    );

    return {
      success: true,
      error: "",
      ticketId,
      reference,
      severity: result.severity,
      triageSummary: result.summary,
      alertStatus
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Your support request could not be sent.",
      ticketId: "",
      reference: "",
      severity: "",
      triageSummary: "",
      alertStatus: "failed"
    };
  }
};
