export const FOUNDING_OFFER = Object.freeze({
  setupFee: 500,
  monthlyFee: 99,
  adoptionDays: 30,
  deliveryBusinessDays: 7,
  customerLimit: 3
});

export const STAFF_SIZE_OPTIONS = [
  "Under 20 employees",
  "20-49 employees",
  "50-99 employees",
  "100+ employees"
];

export const TRAINING_SYSTEM_OPTIONS = [
  "Google Docs or Drive",
  "PDFs or printed binders",
  "Sling, 7shifts, Slack, or group messages",
  "Pre-shift meetings and manager coaching",
  "A mix of several places",
  "Something else"
];

export const TRAINING_PRIORITY_OPTIONS = [
  "Menu changes",
  "New-hire onboarding",
  "Wine and beverage knowledge",
  "Cocktail specifications",
  "SOPs and service standards",
  "Seeing who is ready for service"
];

export function validateFoundingDemoRequest(request) {
  const requiredFields = ["restaurantName", "contactFirstName", "contactLastName", "email", "title"];
  const missingField = requiredFields.find((field) => !String(request?.[field] || "").trim());

  if (missingField) return "Complete every required contact field.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email.trim())) return "Enter a valid work email.";
  if (!request.priority) return "Choose the training problem you want to solve first.";
  return "";
}

export function toManagedSetupInquiry(request) {
  const noteLines = [
    "Campaign source: Founding Restaurants",
    "Request type: 15-minute demo",
    `Staff size: ${request.staffSize || "Not provided"}`,
    `Current training system: ${request.currentSystem || "Not provided"}`,
    `Preferred contact time: ${request.preferredTime?.trim() || "Not provided"}`,
    request.notes?.trim() ? `Additional notes: ${request.notes.trim()}` : ""
  ].filter(Boolean);

  return {
    restaurantName: request.restaurantName,
    contactFirstName: request.contactFirstName,
    contactLastName: request.contactLastName,
    email: request.email,
    title: request.title,
    materials: [request.currentSystem || "Existing restaurant training materials"],
    priorities: [request.priority],
    notes: noteLines.join("\n")
  };
}

