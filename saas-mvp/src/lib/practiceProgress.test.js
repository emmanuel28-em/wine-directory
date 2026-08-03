import assert from "node:assert/strict";
import test from "node:test";
import {
  countPracticedPrompts,
  getPracticeStorageKey,
  markPracticePrompt,
  parsePracticeProgress
} from "./practiceProgress.js";

test("stores unique practiced prompts for each training page", () => {
  const first = markPracticePrompt({}, { trainingDocId: "dish-1", prompt: "Which allergen is present?" });
  const second = markPracticePrompt(first, { trainingDocId: "dish-1", prompt: "Which allergen is present?" });

  assert.deepEqual(second["dish-1"].masteredPrompts, ["Which allergen is present?"]);
  assert.equal(
    countPracticedPrompts(second, "dish-1", [
      { prompt: "Which allergen is present?" },
      { prompt: "What is the one-liner?" }
    ]),
    1
  );
});

test("parses saved practice safely and scopes its storage key", () => {
  assert.deepEqual(parsePracticeProgress("not-json"), {});
  assert.equal(getPracticeStorageKey("restaurant-1", "user-1"), "lineup-practice:restaurant-1:user-1");
});
