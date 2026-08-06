import assert from "node:assert/strict";
import test from "node:test";
import { getFriendlyFirstName } from "./userNames.js";

test("uses a real saved first name", () => {
  assert.equal(getFriendlyFirstName({ name: "Emmanuel Morales", email: "manny@example.com" }), "Emmanuel");
});

test("replaces an open-invite placeholder with the email name", () => {
  assert.equal(getFriendlyFirstName({ name: "Staff Join Link", email: "manny@rezdora.nyc" }), "Manny");
});
