import { buildReviewQuestionsForDoc, deriveReviewContent } from "./reviewQuestions.js";
import { hasPracticedPrompt } from "./practiceProgress.js";
import { isTrainingReviewCurrent } from "./studyProgress.js";
import { getTrainingFactKey, readTrainingProgress } from "./trainingProgress.js";

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
  if (!value) return { masteredKeys: [], reviewAgainKeys: [], ratingByKey: {} };

  try {
    const parsed = JSON.parse(value);
    return {
      masteredKeys: Array.isArray(parsed?.masteredKeys) ? parsed.masteredKeys : [],
      reviewAgainKeys: Array.isArray(parsed?.reviewAgainKeys) ? parsed.reviewAgainKeys : [],
      ratingByKey: parsed?.ratingByKey && typeof parsed.ratingByKey === "object" ? parsed.ratingByKey : {}
    };
  } catch {
    return { masteredKeys: [], reviewAgainKeys: [], ratingByKey: {} };
  }
}

function cardKey(card) {
  return `${card.trainingDocId}:${card.prompt}`;
}

export function recordDailyStudyResponse(progress, card, response) {
  const key = cardKey(card);
  const current = parseDailyStudyProgress(JSON.stringify(progress || {}));
  const rating = response === "easy" ? "easy" : response === "hard" || response === "review-again" ? "hard" : "good";

  if (rating === "good" || rating === "easy") {
    return {
      masteredKeys: [...new Set([...current.masteredKeys, key])],
      reviewAgainKeys: current.reviewAgainKeys.filter((item) => item !== key),
      ratingByKey: { ...current.ratingByKey, [key]: rating }
    };
  }

  return {
    masteredKeys: current.masteredKeys.filter((item) => item !== key),
    reviewAgainKeys: [...new Set([...current.reviewAgainKeys, key])],
    ratingByKey: { ...current.ratingByKey, [key]: rating }
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

function ratingPriority(rating, mastered, reviewAgain) {
  if (reviewAgain || rating === "hard") return 0;
  if (!mastered) return 1;
  if (rating === "good") return 3;
  if (rating === "easy") return 5;
  return 2;
}

// Home intentionally builds a small queue instead of displaying the full
// restaurant catalog. Assignments and recent menu changes come first.
export function buildDailyStudyQueue({
  docs,
  collections,
  acknowledgements,
  assignedTrainingDocIds,
  assignedCollectionIds,
  practiceProgress = {},
  progressRecords = [],
  fileUrlByTrainingDocId = {},
  dailyProgress = {},
  sectionFilter = "",
  priorityOnly = false,
  now = new Date(),
  limit = dailyStudyGoal
}) {
  const publishedDocs = docs.filter((doc) => doc.status === "published");
  const collectionById = new Map(collections.map((collection) => [collection.id, collection]));
  const acknowledgementByDocId = new Map(acknowledgements.map((item) => [item.trainingDocId, item]));
  const progressByDocId = new Map(progressRecords.map((item) => [item.trainingDocId, item]));
  const daily = parseDailyStudyProgress(JSON.stringify(dailyProgress || {}));
  const normalizedSectionFilter = String(sectionFilter || "").trim().toLowerCase();

  return publishedDocs
    .map((doc) => {
      const collection = collectionById.get(doc.collectionId);
      const section = collection?.name || doc.category || doc.type || "Training";
      if (normalizedSectionFilter && section.toLowerCase() !== normalizedSectionFilter) return [];

      const assigned = assignedTrainingDocIds.has(doc.id) || assignedCollectionIds.has(doc.collectionId);
      const reviewed = isTrainingReviewCurrent(doc, acknowledgementByDocId.get(doc.id));
      const recent = isRecent(doc, now);
      if (priorityOnly && reviewed && !assigned && !recent) return [];

      const questions = buildReviewQuestionsForDoc(doc, publishedDocs);
      const serverProgress = readTrainingProgress(progressByDocId.get(doc.id), doc);
      const content = deriveReviewContent(doc);

      return questions.map((question, questionIndex) => {
        const factKey = getTrainingFactKey(question);
        const dailyKey = `${doc.id}:${question.prompt}`;
        const rating = daily.ratingByKey[dailyKey] || "";
        const mastered = serverProgress.masteredFactKeys.includes(factKey)
          || hasPracticedPrompt(practiceProgress, doc.id, question.prompt)
          || daily.masteredKeys.includes(dailyKey);
        const reviewAgain = serverProgress.reviewAgainFactKeys.includes(factKey);

        return {
          id: `${doc.id}:${factKey}`,
          trainingDocId: doc.id,
          trainingDoc: doc,
          title: doc.title,
          category: doc.category || collection?.name || doc.type || "Training",
          section,
          assigned,
          reviewed,
          mastered,
          recent,
          rating,
          updatedAt: doc.updatedAt || doc.createdAt,
          imageUrl: fileUrlByTrainingDocId[doc.id] || "",
          allergens: content.allergens,
          ingredients: content.ingredients,
          summary: content.summary,
          serviceNotes: content.serviceNotes || content.talkingPoints,
          prompt: question.prompt,
          answer: question.correctAnswer,
          explanation: question.explanation,
          question,
          questionIndex,
          factKey,
          priority: priorityFor({ assigned, reviewed, recent }) * 10
            + ratingPriority(rating, mastered, reviewAgain)
        };
      });
    })
    .flat()
    .filter(Boolean)
    .sort((left, right) => left.priority - right.priority || toTime(right.updatedAt) - toTime(left.updatedAt) || left.title.localeCompare(right.title))
    .slice(0, limit);
}
