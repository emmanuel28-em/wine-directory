import { DynamoDBClient, ScanCommand, type AttributeValue } from "@aws-sdk/client-dynamodb";

type Item = Record<string, AttributeValue>;

const dynamo = new DynamoDBClient({});
const dayMs = 24 * 60 * 60 * 1000;

function env(name: string) {
  const value = process.env[name] || "";
  if (!value) throw new Error(`Platform operations is missing ${name}.`);
  return value;
}

async function scanAll(tableName: string) {
  const records: Item[] = [];
  let exclusiveStartKey: Record<string, AttributeValue> | undefined;
  do {
    const result = await dynamo.send(new ScanCommand({ TableName: tableName, ExclusiveStartKey: exclusiveStartKey }));
    records.push(...(result.Items || []));
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);
  return records;
}

function text(item: Item | undefined, field: string) {
  return item?.[field]?.S || "";
}

function number(item: Item | undefined, field: string) {
  return Number(item?.[field]?.N || 0);
}

function bool(item: Item | undefined, field: string) {
  return Boolean(item?.[field]?.BOOL);
}

function latest(values: string[]) {
  return values.filter(Boolean).sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] || "";
}

function daysUntil(value: string) {
  return value ? Math.ceil((new Date(value).getTime() - Date.now()) / dayMs) : null;
}

function event(type: string, title: string, detail: string, occurredAt: string, tone = "neutral") {
  return { type, title, detail, occurredAt, tone };
}

export async function buildPlatformOperations() {
  const [restaurants, profiles, memberships, invites, tickets, docs, acknowledgements, attempts, imports, billingEvents] = await Promise.all([
    scanAll(env("RESTAURANT_TABLE_NAME")),
    scanAll(env("USER_PROFILE_TABLE_NAME")),
    scanAll(env("MEMBERSHIP_TABLE_NAME")),
    scanAll(env("INVITE_TABLE_NAME")),
    scanAll(env("SUPPORT_TICKET_TABLE_NAME")),
    scanAll(env("TRAINING_DOC_TABLE_NAME")),
    scanAll(env("ACKNOWLEDGEMENT_TABLE_NAME")),
    scanAll(env("QUIZ_ATTEMPT_TABLE_NAME")),
    scanAll(env("IMPORT_RUN_TABLE_NAME")),
    scanAll(env("BILLING_EVENT_TABLE_NAME"))
  ]);
  const profileById = new Map(profiles.map((profile) => [text(profile, "id"), profile]));

  const workspaces = restaurants.map((restaurant) => {
    const restaurantId = text(restaurant, "id");
    const workspaceMemberships = memberships.filter((item) => text(item, "restaurantId") === restaurantId);
    const activeMemberships = workspaceMemberships.filter((item) => text(item, "status") === "active");
    const ownerMembership = activeMemberships.find((item) => text(item, "role") === "owner");
    const ownerProfile = ownerMembership ? profileById.get(text(ownerMembership, "userProfileId")) : undefined;
    const staffProfileIds = new Set(activeMemberships.filter((item) => text(item, "role") === "staff").map((item) => text(item, "userProfileId")));
    const workspaceDocs = docs.filter((item) => text(item, "restaurantId") === restaurantId);
    const publishedDocs = workspaceDocs.filter((item) => text(item, "status") === "published");
    const publishedDocIds = new Set(publishedDocs.map((item) => text(item, "id")));
    const workspaceAcks = acknowledgements.filter((item) => text(item, "restaurantId") === restaurantId);
    const staffAcks = workspaceAcks.filter(
      (item) => staffProfileIds.has(text(item, "userProfileId")) && publishedDocIds.has(text(item, "trainingDocId"))
    );
    const uniqueStaffReviews = new Set(staffAcks.map((item) => `${text(item, "userProfileId")}::${text(item, "trainingDocId")}`)).size;
    const possibleStaffReviews = staffProfileIds.size * publishedDocs.length;
    const staffCompletionRate = possibleStaffReviews ? Math.round((uniqueStaffReviews / possibleStaffReviews) * 100) : 0;
    const workspaceAttempts = attempts.filter((item) => text(item, "restaurantId") === restaurantId);
    const workspaceImports = imports.filter((item) => text(item, "restaurantId") === restaurantId);
    const workspaceTickets = tickets.filter((item) => text(item, "restaurantId") === restaurantId);
    const workspaceBillingEvents = billingEvents.filter((item) => text(item, "restaurantId") === restaurantId);
    const workspaceInvites = invites.filter((item) => text(item, "restaurantId") === restaurantId);
    const openTickets = workspaceTickets.filter((item) => !["resolved", "closed"].includes(text(item, "status")));
    const urgentTickets = openTickets.filter((item) => ["high", "critical"].includes(text(item, "severity")));
    const failedImports = workspaceImports.filter((item) => text(item, "status") === "failed");
    const lastPublishedAt = latest(publishedDocs.map((item) => text(item, "updatedAt") || text(item, "createdAt")));
    const lastActivityAt = latest([
      ...workspaceDocs.map((item) => text(item, "updatedAt")),
      ...workspaceAcks.map((item) => text(item, "reviewedAt")),
      ...workspaceAttempts.map((item) => text(item, "completedAt")),
      ...workspaceImports.map((item) => text(item, "completedAt") || text(item, "startedAt")),
      ...workspaceTickets.map((item) => text(item, "updatedAt") || text(item, "createdAt")),
      ...activeMemberships.map((item) => text(item, "updatedAt") || text(item, "createdAt"))
    ]);
    const trialEndsAt = text(restaurant, "trialEndsAt");
    const trialDaysRemaining = daysUntil(trialEndsAt);
    const subscriptionStatus = text(restaurant, "subscriptionStatus") || text(restaurant, "status") || "trialing";
    const paymentProblem = ["past_due", "unpaid", "incomplete", "paused"].includes(subscriptionStatus);
    const trialEnding = subscriptionStatus === "trialing" && trialDaysRemaining !== null && trialDaysRemaining >= 0 && trialDaysRemaining <= 7;
    const trialExpired = subscriptionStatus === "trialing" && trialDaysRemaining !== null && trialDaysRemaining < 0;
    const stalePublishing = Boolean(lastPublishedAt) && Date.now() - new Date(lastPublishedAt).getTime() > 30 * dayMs;
    const accountAgeDays = Math.max(0, Math.floor((Date.now() - new Date(text(restaurant, "createdAt") || Date.now()).getTime()) / dayMs));
    const stuckOnboarding = accountAgeDays >= 1 && (publishedDocs.length === 0 || activeMemberships.length <= 1);
    const activeRecently = Boolean(lastActivityAt) && Date.now() - new Date(lastActivityAt).getTime() <= 14 * dayMs;
    const attention: Array<{ code: string; label: string; detail: string; priority: number }> = [];

    if (paymentProblem) attention.push({ code: "payment", label: "Payment needs attention", detail: subscriptionStatus.replaceAll("_", " "), priority: 100 });
    if (urgentTickets.length) attention.push({ code: "support", label: `${urgentTickets.length} urgent support request${urgentTickets.length === 1 ? "" : "s"}`, detail: "Open or investigating", priority: 90 });
    if (failedImports.length) attention.push({ code: "import", label: `${failedImports.length} failed import${failedImports.length === 1 ? "" : "s"}`, detail: "Review Library Builder history", priority: 80 });
    if (trialExpired) attention.push({ code: "trial", label: "Trial expired", detail: trialEndsAt, priority: 75 });
    else if (trialEnding) attention.push({ code: "trial", label: `Trial ends in ${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"}`, detail: trialEndsAt, priority: 65 });
    if (stuckOnboarding) attention.push({ code: "onboarding", label: "Onboarding may be stuck", detail: publishedDocs.length ? "No team members added" : "No staff-visible training", priority: 55 });
    if (stalePublishing) attention.push({ code: "stale", label: "No recent publishing", detail: lastPublishedAt, priority: 30 });

    const timeline = [
      event("workspace", "Workspace created", "Restaurant account opened", text(restaurant, "createdAt"), "positive"),
      ...workspaceImports.map((item) => event(
        "import",
        text(item, "status") === "failed" ? "Import failed" : "Training material imported",
        `${number(item, "createdCount")} pages created · ${text(item, "sourceName") || "Library Builder"}`,
        text(item, "completedAt") || text(item, "startedAt"),
        text(item, "status") === "failed" ? "attention" : "positive"
      )),
      ...workspaceBillingEvents.map((item) => event(
        "billing",
        text(item, "eventType").replaceAll(".", " "),
        text(item, "status") || "Stripe event received",
        text(item, "occurredAt"),
        ["past_due", "unpaid"].includes(text(item, "status")) ? "attention" : "neutral"
      )),
      ...workspaceTickets.map((item) => event(
        "support",
        `Support: ${text(item, "title")}`,
        `${text(item, "severity") || "normal"} · ${text(item, "status") || "open"}`,
        text(item, "createdAt"),
        ["high", "critical"].includes(text(item, "severity")) ? "attention" : "neutral"
      )),
      ...(lastPublishedAt ? [event("content", "Training library updated", `${publishedDocs.length} published pages`, lastPublishedAt, "positive")] : []),
      ...(workspaceAttempts.length ? [event("training", "Staff quiz activity", `${workspaceAttempts.length} total attempts`, latest(workspaceAttempts.map((item) => text(item, "completedAt"))), "positive")] : [])
    ].filter((item) => item.occurredAt).sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()).slice(0, 30);

    const roleCounts = activeMemberships.reduce((counts, item) => {
      const role = text(item, "role") || "staff";
      return { ...counts, [role]: (counts[role] || 0) + 1 };
    }, { owner: 0, admin: 0, manager: 0, staff: 0 } as Record<string, number>);

    return {
      id: restaurantId,
      name: text(restaurant, "name"),
      city: text(restaurant, "city"),
      website: text(restaurant, "website"),
      plan: text(restaurant, "plan") || "No plan selected",
      status: text(restaurant, "status") || "trial",
      subscriptionStatus,
      trialEndsAt,
      trialDaysRemaining,
      currentPeriodEnd: text(restaurant, "currentPeriodEnd"),
      billingEmail: text(restaurant, "billingEmail"),
      accountHolder: {
        name: text(restaurant, "primaryContactName") || text(ownerProfile, "name") || "Not set",
        email: text(restaurant, "primaryContactEmail") || text(ownerProfile, "email") || "Not set"
      },
      activeMembers: activeMemberships.length,
      disabledMembers: workspaceMemberships.filter((item) => text(item, "status") === "disabled").length,
      pendingInvites: workspaceInvites.filter((item) => text(item, "status") === "pending").length,
      roleCounts,
      totalPages: workspaceDocs.filter((item) => text(item, "status") !== "archived").length,
      publishedPages: publishedDocs.length,
      draftPages: workspaceDocs.filter((item) => text(item, "status") === "draft").length,
      lastPublishedAt,
      lastActivityAt,
      activeRecently,
      staffCompletionRate,
      quizAttempts: workspaceAttempts.length,
      passedQuizAttempts: workspaceAttempts.filter((item) => bool(item, "passed")).length,
      openSupportCount: openTickets.length,
      urgentSupportCount: urgentTickets.length,
      failedImportCount: failedImports.length,
      importHistory: workspaceImports.sort((left, right) => new Date(text(right, "startedAt")).getTime() - new Date(text(left, "startedAt")).getTime()).slice(0, 15).map((item) => ({
        id: text(item, "id"), status: text(item, "status"), sourceName: text(item, "sourceName"), sourceType: text(item, "sourceType"),
        detectedCount: number(item, "detectedCount"), createdCount: number(item, "createdCount"), skippedCount: number(item, "skippedCount"),
        errorMessage: text(item, "errorMessage"), startedAt: text(item, "startedAt"), completedAt: text(item, "completedAt")
      })),
      supportCases: workspaceTickets.sort((left, right) => new Date(text(right, "createdAt")).getTime() - new Date(text(left, "createdAt")).getTime()).slice(0, 15).map((item) => ({
        id: text(item, "id"), reference: text(item, "reference"), title: text(item, "title"), severity: text(item, "severity"), status: text(item, "status"), createdAt: text(item, "createdAt")
      })),
      billingEvents: workspaceBillingEvents.sort((left, right) => new Date(text(right, "occurredAt")).getTime() - new Date(text(left, "occurredAt")).getTime()).slice(0, 15).map((item) => ({
        id: text(item, "id"), eventType: text(item, "eventType"), status: text(item, "status"), amount: number(item, "amount"), currency: text(item, "currency"), occurredAt: text(item, "occurredAt")
      })),
      attention: attention.sort((left, right) => right.priority - left.priority),
      onboardingStage: publishedDocs.length === 0 ? "Add training" : activeMemberships.length <= 1 ? "Invite team" : "Active",
      timeline
    };
  }).sort((left, right) => (right.attention[0]?.priority || 0) - (left.attention[0]?.priority || 0) || left.name.localeCompare(right.name));

  return {
    generatedAt: new Date().toISOString(),
    workspaces,
    totals: {
      restaurants: workspaces.length,
      needsAttention: workspaces.filter((item) => item.attention.length > 0).length,
      activeCustomers: workspaces.filter((item) => item.activeRecently).length,
      stuckOnboarding: workspaces.filter((item) => item.attention.some((signal) => signal.code === "onboarding")).length,
      failedImports: workspaces.reduce((total, item) => total + item.failedImportCount, 0),
      trialsEnding: workspaces.filter((item) => item.attention.some((signal) => signal.code === "trial")).length,
      paymentProblems: workspaces.filter((item) => item.attention.some((signal) => signal.code === "payment")).length,
      stalePublishing: workspaces.filter((item) => item.attention.some((signal) => signal.code === "stale")).length,
      urgentSupport: workspaces.reduce((total, item) => total + item.urgentSupportCount, 0)
    }
  };
}
