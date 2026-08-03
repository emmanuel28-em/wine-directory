import { getDataClient } from "./dataClient.js";
import { assertSameRestaurant, requireRestaurantId } from "./permissions.js";
import { getWorkspaceGroups } from "./workspaceGroups.js";
import { listAllRecords } from "./paginatedList.js";

export const emptyTrainingDocForm = {
  collectionId: "",
  sectionIds: [],
  contentType: "foodItem",
  title: "",
  category: "",
  status: "draft",
  tags: "",
  summary: "",
  body: "",
  details: "",
  allergens: "",
  ingredients: "",
  talkingPoints: "",
  serviceNotes: "",
  quizFactsJson: "[]",
  reviewQuestionsJson: "[]"
};

const contentTypeToModelType = {
  foodItem: "food",
  wine: "wine",
  cocktail: "cocktail",
  sop: "sop",
  serviceStandard: "custom",
  menuOverview: "custom",
  tastingMenuCourse: "pastaTasting",
  eventNote: "custom",
  custom: "custom"
};

const modelTypeToContentType = {
  food: "foodItem",
  wine: "wine",
  cocktail: "cocktail",
  sop: "sop",
  pastaTasting: "tastingMenuCourse",
  custom: "custom"
};

function assertNoErrors(result, fallbackMessage) {
  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  if (!result.data) {
    throw new Error(fallbackMessage);
  }

  return result.data;
}

export function buildContentJson(form) {
  const testableStaffKnowledge = parseQuizFacts(form.quizFactsJson);
  const reviewQuestions = parseReviewQuestionsJson(form.reviewQuestionsJson);

  return JSON.stringify({
    tags: form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    sectionIds: Array.isArray(form.sectionIds)
      ? form.sectionIds
      : form.collectionId
        ? [form.collectionId]
        : [],
    contentType: form.contentType,
    summary: form.summary.trim(),
    body: form.body.trim(),
    details: form.details.trim(),
    allergens: form.allergens.trim(),
    ingredients: form.ingredients.trim(),
    talkingPoints: form.talkingPoints.trim(),
    serviceNotes: form.serviceNotes.trim(),
    // The UI calls these "Testable Staff Knowledge" because that is clearer for restaurant managers.
    // quizFacts remains here so older quiz code can still read the same facts later.
    testableStaffKnowledge,
    quizFacts: testableStaffKnowledge,
    // These are the exact card-level review questions staff answer before a page is marked reviewed.
    reviewQuestions
  });
}

export function parseQuizFacts(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cleanText(value) {
  return String(value || "").trim();
}

function unique(values) {
  return [...new Set(values.map(cleanText).filter(Boolean))];
}

export function parseReviewQuestionsJson(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((question) => {
        const correctAnswer = cleanText(question.correctAnswer);
        const choices = unique(Array.isArray(question.choices) ? question.choices : []);

        return {
          prompt: cleanText(question.prompt),
          choices: choices.includes(correctAnswer) ? choices : unique([correctAnswer, ...choices]),
          correctAnswer,
          explanation: cleanText(question.explanation)
        };
      })
      .filter((question) => question.prompt && question.correctAnswer && question.choices.length >= 2);
  } catch {
    return [];
  }
}

export function parseContentJson(contentJson) {
  if (!contentJson) {
    return {
      tags: [],
      sectionIds: [],
      summary: "",
      body: "",
      details: "",
      allergens: "",
      ingredients: "",
      talkingPoints: "",
      serviceNotes: "",
      quizFacts: [],
      testableStaffKnowledge: [],
      reviewQuestions: []
    };
  }

  try {
    return {
      tags: [],
      sectionIds: [],
      summary: "",
      body: "",
      details: "",
      allergens: "",
      ingredients: "",
      talkingPoints: "",
      serviceNotes: "",
      quizFacts: [],
      testableStaffKnowledge: [],
      reviewQuestions: [],
      ...JSON.parse(contentJson)
    };
  } catch {
    return {
      tags: [],
      sectionIds: [],
      summary: "",
      body: contentJson,
      details: contentJson,
      allergens: "",
      ingredients: "",
      talkingPoints: "",
      serviceNotes: "",
      quizFacts: [],
      testableStaffKnowledge: [],
      reviewQuestions: []
    };
  }
}

export function docToForm(doc) {
  const content = parseContentJson(doc.contentJson);

  return {
    collectionId: doc.collectionId || "",
    sectionIds: Array.isArray(content.sectionIds) && content.sectionIds.length
      ? content.sectionIds
      : doc.collectionId
        ? [doc.collectionId]
        : [],
    contentType: content.contentType || modelTypeToContentType[doc.type] || "custom",
    title: doc.title || "",
    category: doc.category || "",
    status: doc.status || "draft",
    tags: Array.isArray(content.tags) ? content.tags.join(", ") : "",
    summary: content.summary || content.shortDescription || "",
    body: content.body || "",
    details: content.details || "",
    allergens: content.allergens || "",
    ingredients: content.ingredients || "",
    talkingPoints: content.talkingPoints || "",
    serviceNotes: content.serviceNotes || "",
    quizFactsJson: JSON.stringify(content.testableStaffKnowledge || content.quizFacts || [], null, 2),
    reviewQuestionsJson: JSON.stringify(content.reviewQuestions || [], null, 2)
  };
}

export async function listTrainingDocsForRestaurant(restaurantId) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();
  const records = await listAllRecords(dataClient.models.TrainingDoc, {
    filter: {
      restaurantId: {
        eq: restaurantId
      }
    }
  });

  return records.sort((a, b) => {
    const titleCompare = (a.title || "").localeCompare(b.title || "");
    return (a.type || "").localeCompare(b.type || "") || titleCompare;
  });
}

export async function saveTrainingDoc({ form, editingDocId, restaurantId, userProfileId }) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();
  const payload = {
    restaurantId,
    ...getWorkspaceGroups(restaurantId),
    collectionId: Array.isArray(form.sectionIds) && form.sectionIds.length ? form.sectionIds[0] : form.collectionId || null,
    type: contentTypeToModelType[form.contentType] || "custom",
    title: form.title.trim(),
    category: form.category.trim(),
    status: form.status,
    contentJson: buildContentJson(form),
    updatedBy: userProfileId
  };

  if (editingDocId) {
    const existing = await dataClient.models.TrainingDoc.get({ id: editingDocId });

    if (existing.errors?.length) {
      throw new Error(existing.errors.map((error) => error.message).join(" "));
    }

    assertSameRestaurant(existing.data, restaurantId, "Training Page");

    return assertNoErrors(
      await dataClient.models.TrainingDoc.update({
        id: editingDocId,
        ...payload
      }),
      "Training doc was not updated."
    );
  }

  return assertNoErrors(
    await dataClient.models.TrainingDoc.create({
      ...payload,
      imageKeys: [],
      createdBy: userProfileId
    }),
    "Training doc was not created."
  );
}

export async function updateTrainingDocStatus({ doc, status, restaurantId, userProfileId }) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();
  const existing = await dataClient.models.TrainingDoc.get({ id: doc.id });

  if (existing.errors?.length) {
    throw new Error(existing.errors.map((error) => error.message).join(" "));
  }

  assertSameRestaurant(existing.data, restaurantId, "Training Page");

  return assertNoErrors(
    await dataClient.models.TrainingDoc.update({
      id: doc.id,
      status,
      updatedBy: userProfileId
    }),
    "Training doc status was not updated."
  );
}

export async function deleteTrainingDoc({ docId, restaurantId }) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();
  const existing = await dataClient.models.TrainingDoc.get({ id: docId });

  if (existing.errors?.length) {
    throw new Error(existing.errors.map((error) => error.message).join(" "));
  }

  assertSameRestaurant(existing.data, restaurantId, "Training Page");

  const result = await dataClient.models.TrainingDoc.delete({ id: docId });

  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }
}
