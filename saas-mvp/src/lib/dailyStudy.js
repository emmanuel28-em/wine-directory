import { buildReviewQuestionsForDoc, deriveReviewContent } from "./reviewQuestions.js";
import { hasPracticedPrompt } from "./practiceProgress.js";
import { isTrainingReviewCurrent } from "./studyProgress.js";

export const dailyStudyGoal = 12;

const recentWindowMs = 14 * 24 * 60 * 60 * 1000;

function toTime(value) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function dayKey(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDailyStudyStorageKey(restaurantId, userProfileId, now = new Date()) {
  return `lineup-daily-study:${restaurantId || "restaurant"}:${userProfileId || "user"}:${dayKey(now)}`;
}

export function parseDailyStudyProgress(value) {
  if (!value) return { masteredKeys: [], reviewAgainKeys: [] };

  try {
    const parsed = JSON.parse(value);
    return {
      masteredKeys: Array.isArray(parsed?.masteredKeys) ? parsed.masteredKeys : [],
      reviewAgainKeys: Array.isArray(parsed?.reviewAgainKeys) ? parsed.reviewAgainKeys : []
    };
  } catch {
    return { masteredKeys: [], reviewAgainKeys: [] };
  }
}

function cardKey(card) {
  return `${card.trainingDocId}:${card.prompt}`;
}

export function recordDailyStudyResponse(progress, card, response) {
  const key = cardKey(card);
  const current = parseDailyStudyProgress(JSON.stringify(progress || {}));

  if (response === "got-it") {
    return {
      masteredKeys: [...new Set([...current.masteredKeys, key])],
      reviewAgainKeys: current.reviewAgainKeys.filter((item) => item !== key)
    };
  }

  return {
    masteredKeys: current.masteredKeys.filter((item) => item !== key),
    reviewAgainKeys: [...new Set([...current.reviewAgainKeys, key])]
  };
}

export function countDailyMastered(progress) {
  return new Set(progress?.masteredKeys || []).size;
}

function isRecent(doc, now) {
  const updatedAt = toTime(doc.updatedAt || doc.createdAt);
  return Boolean(updatedAt) && now.getTime() - updatedAt <= recentWindowMs;
}

function priorityFor({ assigned, reviewed, recent }) {
  if (assigned && !reviewed) return 0;
  if (recent && !reviewed) return 1;
  if (!reviewed) return 2;
  if (assigned) return 3;
  return 4;
}

// Home intentionally builds a small queue instead of displaying the full
// restaurant catalog. Assignments and recent menu changes come first.
export function buildDailyStudyQueue({
  docs,
  collections,
  acknowledgements,
  assignedTrainingDocIds,
  assignedCollectionIds,
  practiceProgress,
  fileUrlByTrainingDocId = {},
  now = new Date(),
  limit = dailyStudyGoal
}) {
  const publishedDocs = docs.filter((doc) => doc.status === "published");
  const collectionById = new Map(collections.map((collection) => [collection.id, collection]));
  const acknowledgementByDocId = new Map(acknowledgements.map((item) => [item.trainingDocId, item]));

  return publishedDocs
    .map((doc) => {
      const collection = collectionById.get(doc.collectionId);
      const assigned = assignedTrainingDocIds.has(doc.id) || assignedCollectionIds.has(doc.collectionId);
      const reviewed = isTrainingReviewCurrent(doc, acknowledgementByDocId.get(doc.id));
      const questions = buildReviewQuestionsForDoc(doc, publishedDocs);
      const question = questions.find((item) => !hasPracticedPrompt(practiceProgress, doc.id, item.prompt)) || questions[0];
      const content = deriveReviewContent(doc);

      if (!question) return null;

      return {
        id: `${doc.id}:${question.prompt}`,
        trainingDocId: doc.id,
        title: doc.title,
        category: doc.category || collection?.name || doc.type || "Training",
        section: collection?.name || doc.category || doc.type || "Training",
        assigned,
        reviewed,
        recent: isRecent(doc, now),
        updatedAt: doc.updatedAt || doc.createdAt,
        imageUrl: fileUrlByTrainingDocId[doc.id] || "",
        allergens: content.allergens,
        ingredients: content.ingredients,
        summary: content.summary,
        serviceNotes: content.serviceNotes || content.talkingPoints,
        prompt: question.prompt,
        answer: question.correctAnswer,
        explanation: question.explanation,
        priority: priorityFor({ assigned, reviewed, recent: isRecent(doc, now) })
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.priority - right.priority || toTime(right.updatedAt) - toTime(left.updatedAt) || left.title.localeCompare(right.title))
    .slice(0, limit);
}

