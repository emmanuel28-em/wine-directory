import { getDataClient } from "./dataClient.js";

export function parsePlatformUsers(value) {
  try {
    return JSON.parse(value || "[]");
  } catch {
    return [];
  }
}

export function parsePlatformOperations(value) {
  try {
    const parsed = JSON.parse(value || "{}");
    return {
      generatedAt: parsed.generatedAt || "",
      totals: parsed.totals || {},
      workspaces: Array.isArray(parsed.workspaces) ? parsed.workspaces : []
    };
  } catch {
    return { generatedAt: "", totals: {}, workspaces: [] };
  }
}

// Platform Control uses one backend query so customer operations data stays
// behind the platform-owner permission check instead of being rebuilt in pages.
export async function loadPlatformOperations() {
  const accessResult = await getDataClient().queries.getPlatformAccess();
  if (accessResult.errors?.length) throw new Error(accessResult.errors.map((error) => error.message).join(" "));
  if (!accessResult.data?.success) throw new Error(accessResult.data?.error || "Platform access could not be loaded.");

  return {
    currentRole: accessResult.data.currentRole || "",
    users: parsePlatformUsers(accessResult.data.usersJson),
    operations: parsePlatformOperations(accessResult.data.operationsJson)
  };
}

export function formatPlatformDate(value, fallback = "Not recorded") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function formatPlatformDateTime(value, fallback = "Not recorded") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

export function formatRelativeActivity(value) {
  if (!value) return "No activity yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No activity yet";
  const diffDays = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ago`;
}

export function subscriptionLabel(status) {
  const labels = {
    trialing: "Trial",
    active: "Active",
    past_due: "Past due",
    canceled: "Canceled",
    paused: "Paused",
    unpaid: "Unpaid",
    incomplete: "Incomplete"
  };
  return labels[status] || status || "Trial";
}

export function signalTone(code) {
  if (["payment", "support", "import", "trial"].includes(code)) return "attention";
  if (code === "onboarding") return "warning";
  return "neutral";
}
