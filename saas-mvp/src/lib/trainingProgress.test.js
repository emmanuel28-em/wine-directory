import assert from "node:assert/strict";
import test from "node:test";
import { getTrainingFactKey, readTrainingProgress } from "./trainingProgress.js";

test("training fact progress is scoped to the current content version", () => {
  const record = {
    trainingDocUpdatedAt: "2026-08-03T12:00:00.000Z",
    masteredFactKeysJson: JSON.stringify(["Fact one", "Fact two"]),
    reviewAgainFactKeysJson: JSON.stringify(["Fact three"]),
    completedAt: "2026-08-03T13:00:00.000Z"
  };

  const current = readTrainingProgress(record, { updatedAt: "2026-08-03T12:00:00.000Z" });
  assert.deepEqual(current.masteredFactKeys, ["Fact one", "Fact two"]);
  assert.equal(current.completedAt, "2026-08-03T13:00:00.000Z");

  const stale = readTrainingProgress(record, { updatedAt: "2026-08-04T09:00:00.000Z" });
  assert.deepEqual(stale.masteredFactKeys, []);
  assert.deepEqual(stale.reviewAgainFactKeys, []);
  assert.equal(stale.completedAt, "");
});

test("training facts use the visible prompt as a stable key", () => {
  assert.equal(getTrainingFactKey({ prompt: "  What allergens are present?  " }), "What allergens are present?");
});
