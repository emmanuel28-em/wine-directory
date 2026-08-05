import assert from "node:assert/strict";
import test from "node:test";
import { toManagedSetupInquiry, validateFoundingDemoRequest } from "./foundingCampaign.js";

const validRequest = {
  restaurantName: "Northstar Dining",
  contactFirstName: "Avery",
  contactLastName: "Morgan",
  email: "avery@example.com",
  title: "General Manager",
  staffSize: "20-49 employees",
  currentSystem: "A mix of several places",
  priority: "Menu changes",
  preferredTime: "Tuesday morning",
  notes: "Dinner menu changes weekly."
};

test("founding demo requests require complete contact information", () => {
  assert.equal(validateFoundingDemoRequest(validRequest), "");
  assert.equal(validateFoundingDemoRequest({ ...validRequest, email: "not-an-email" }), "Enter a valid work email.");
  assert.equal(validateFoundingDemoRequest({ ...validRequest, priority: "" }), "Choose the training problem you want to solve first.");
});

test("founding demo requests reuse the secure managed-setup inquiry format", () => {
  const inquiry = toManagedSetupInquiry(validRequest);

  assert.equal(inquiry.restaurantName, "Northstar Dining");
  assert.deepEqual(inquiry.priorities, ["Menu changes"]);
  assert.match(inquiry.notes, /Campaign source: Founding Restaurants/);
  assert.match(inquiry.notes, /Tuesday morning/);
});

