const placeholderNames = new Set(["staff", "staff join link", "team member", "team"]);

function titleCase(value) {
  return value
    .split(/[._+\-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

// Open staff links used to carry the placeholder name "Staff Join Link".
// Never show that internal label as a person's name in the training app.
export function getFriendlyFirstName(userProfile) {
  const savedName = String(userProfile?.name || "").trim();
  const normalizedName = savedName.toLowerCase();

  if (savedName && !placeholderNames.has(normalizedName)) {
    return savedName.split(/\s+/)[0];
  }

  const emailName = String(userProfile?.email || "").split("@")[0];
  return titleCase(emailName).split(/\s+/)[0] || "there";
}
