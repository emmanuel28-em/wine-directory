import { getDataClient } from "./dataClient.js";
import { assertSameRestaurant, requireRestaurantId } from "./permissions.js";
import { getWorkspaceGroups } from "./workspaceGroups.js";
import { listAllRecords } from "./paginatedList.js";

function assertNoErrors(result, fallbackMessage) {
  if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join(" "));
  if (!result.data) throw new Error(fallbackMessage);
  return result.data;
}

function parseKeys(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? [...new Set(parsed.filter(Boolean))] : [];
  } catch {
    return [];
  }
}

export function getTrainingFactKey(question) {
  return String(question?.prompt || "").trim();
}

export function readTrainingProgress(record, trainingDoc) {
  const currentVersion = trainingDoc?.updatedAt || trainingDoc?.createdAt || "";
  const isCurrent = Boolean(record) && (!currentVersion || record.trainingDocUpdatedAt === currentVersion);

  return {
    record: record || null,
    isCurrent,
    masteredFactKeys: isCurrent ? parseKeys(record.masteredFactKeysJson) : [],
    reviewAgainFactKeys: isCurrent ? parseKeys(record.reviewAgainFactKeysJson) : [],
    completedAt: isCurrent ? record.completedAt || "" : "",
    lastStudiedAt: isCurrent ? record.lastStudiedAt || "" : ""
  };
}

export async function listMyTrainingProgress({ restaurantId, userProfileId }) {
  requireRestaurantId(restaurantId);
  return listAllRecords(getDataClient().models.TrainingDocProgress, {
    filter: {
      restaurantId: { eq: restaurantId },
      userProfileId: { eq: userProfileId }
    }
  });
}

export async function listTrainingProgressForRestaurant(restaurantId) {
  requireRestaurantId(restaurantId);
  return listAllRecords(getDataClient().models.TrainingDocProgress, {
    filter: { restaurantId: { eq: restaurantId } }
  });
}

export async function recordTrainingFactResponse({
  restaurantId,
  trainingDoc,
  userProfileId,
  cognitoUserId,
  existingProgress,
  question,
  response,
  requiredFactCount = 5
}) {
  requireRestaurantId(restaurantId);
  assertSameRestaurant(trainingDoc, restaurantId, "Training Page");

  const factKey = getTrainingFactKey(question);
  if (!factKey) throw new Error("This study fact is missing its question.");

  const current = readTrainingProgress(existingProgress, trainingDoc);
  const mastered = new Set(current.masteredFactKeys);
  const reviewAgain = new Set(current.reviewAgainFactKeys);

  if (response === "got-it") {
    mastered.add(factKey);
    reviewAgain.delete(factKey);
  } else {
    mastered.delete(factKey);
    reviewAgain.add(factKey);
  }

  const now = new Date().toISOString();
  const completedAt = mastered.size >= requiredFactCount ? current.completedAt || now : null;
  const payload = {
    restaurantId,
    trainingDocId: trainingDoc.id,
    userProfileId,
    cognitoUserId,
    masteredFactKeysJson: JSON.stringify([...mastered]),
    reviewAgainFactKeysJson: JSON.stringify([...reviewAgain]),
    trainingDocUpdatedAt: trainingDoc.updatedAt || trainingDoc.createdAt || now,
    lastStudiedAt: now,
    completedAt,
    ...getWorkspaceGroups(restaurantId)
  };
  const client = getDataClient();
  const saved = current.record
    ? assertNoErrors(
        await client.models.TrainingDocProgress.update({ id: current.record.id, ...payload }),
        "Study progress was not updated."
      )
    : assertNoErrors(
        await client.models.TrainingDocProgress.create(payload),
        "Study progress was not created."
      );

  return {
    record: saved,
    masteredFactKeys: [...mastered],
    reviewAgainFactKeys: [...reviewAgain],
    completedAt,
    isComplete: Boolean(completedAt)
  };
}
