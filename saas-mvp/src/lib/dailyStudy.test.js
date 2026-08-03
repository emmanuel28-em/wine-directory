import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDailyStudyQueue,
  countDailyMastered,
  getDailyStudyStorageKey,
  recordDailyStudyResponse
} from "./dailyStudy.js";

function makeDoc({ id, title, collectionId, updatedAt, status = "published" }) {
  return {
    id,
    title,
    collectionId,
    type: "food",
    category: "Primi",
    status,
    updatedAt,
    createdAt: updatedAt,
    contentJson: JSON.stringify({
      summary: `${title} one-liner`,
      allergens: "Dairy, Gluten",
      ingredients: "Parmigiano\nButter\nPasta"
    })
  };
}

test("daily queue prioritizes assigned and recent unreviewed pages", () => {
  const now = new Date("2026-08-03T12:00:00Z");
  const oldDate = "2026-01-01T12:00:00Z";
  const recentDate = "2026-08-02T12:00:00Z";
  const docs = [
    makeDoc({ id: "ordinary", title: "Ordinary", collectionId: "dinner", updatedAt: oldDate }),
    makeDoc({ id: "recent", title: "Recent", collectionId: "dinner", updatedAt: recentDate }),
    makeDoc({ id: "assigned", title: "Assigned", collectionId: "dinner", updatedAt: oldDate })
  ];

  const queue = buildDailyStudyQueue({
    docs,
    collections: [{ id: "dinner", name: "Dinner Menu" }],
    acknowledgements: [],
    assignedTrainingDocIds: new Set(["assigned"]),
    assignedCollectionIds: new Set(),
    practiceProgress: {},
    now
  });

  assert.deepEqual(queue.map((item) => item.trainingDocId), ["assigned", "recent", "ordinary"]);
});

test("daily responses are unique and scoped to restaurant, user, and day", () => {
  const card = { trainingDocId: "dish-1", prompt: "What are the allergens?" };
  const first = recordDailyStudyResponse({}, card, "got-it");
  const second = recordDailyStudyResponse(first, card, "got-it");

  assert.equal(countDailyMastered(second), 1);
  assert.equal(
    getDailyStudyStorageKey("restaurant-1", "user-1", new Date(2026, 7, 3)),
    "lineup-daily-study:restaurant-1:user-1:2026-08-03"
  );
});
