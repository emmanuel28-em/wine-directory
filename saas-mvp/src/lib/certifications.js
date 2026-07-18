import { getDataClient } from "./dataClient.js";
import { assertSameRestaurant, requireRestaurantId } from "./permissions.js";
import { getWorkspaceGroups } from "./workspaceGroups.js";

function assertNoErrors(result, fallbackMessage) {
  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  if (!result.data) {
    throw new Error(fallbackMessage);
  }

  return result.data;
}

export function parseRequiredQuizIds(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function listCertificationsForRestaurant(restaurantId) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();
  const result = await dataClient.models.Certification.list({
    filter: {
      restaurantId: {
        eq: restaurantId
      }
    }
  });

  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  return [...(result.data || [])].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
}

export async function createCertification({ restaurantId, userProfileId, form }) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();

  return assertNoErrors(
    await dataClient.models.Certification.create({
      restaurantId,
      ...getWorkspaceGroups(restaurantId),
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      status: form.status || "draft",
      requiredQuizIdsJson: JSON.stringify(form.requiredQuizIds || []),
      createdBy: userProfileId,
      updatedBy: userProfileId
    }),
    "Certification was not created."
  );
}

export async function updateCertification({ certificationId, restaurantId, userProfileId, form }) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();
  const existing = await dataClient.models.Certification.get({ id: certificationId });

  if (existing.errors?.length) {
    throw new Error(existing.errors.map((error) => error.message).join(" "));
  }

  assertSameRestaurant(existing.data, restaurantId, "Certification");

  return assertNoErrors(
    await dataClient.models.Certification.update({
      id: certificationId,
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category.trim(),
      status: form.status || "draft",
      requiredQuizIdsJson: JSON.stringify(form.requiredQuizIds || []),
      updatedBy: userProfileId
    }),
    "Certification was not updated."
  );
}

export async function archiveCertification({ certification, restaurantId }) {
  requireRestaurantId(restaurantId);
  assertSameRestaurant(certification, restaurantId, "Certification");
  const dataClient = getDataClient();

  return assertNoErrors(
    await dataClient.models.Certification.update({
      id: certification.id,
      status: "archived"
    }),
    "Certification was not archived."
  );
}

export function getBestPassedAttemptsByQuiz(attempts) {
  const passedByQuiz = new Map();

  attempts
    .filter((attempt) => attempt.passed)
    .forEach((attempt) => {
      const current = passedByQuiz.get(attempt.quizId);
      if (!current || Number(attempt.score || 0) > Number(current.score || 0)) {
        passedByQuiz.set(attempt.quizId, attempt);
      }
    });

  return passedByQuiz;
}

export function getCertificationProgress({ certification, quizzes, attempts }) {
  const requiredQuizIds = parseRequiredQuizIds(certification.requiredQuizIdsJson);
  const quizById = new Map(quizzes.map((quiz) => [quiz.id, quiz]));
  const passedByQuiz = getBestPassedAttemptsByQuiz(attempts);
  const requirements = requiredQuizIds.map((quizId) => ({
    quizId,
    quiz: quizById.get(quizId),
    attempt: passedByQuiz.get(quizId),
    complete: passedByQuiz.has(quizId)
  }));
  const completedCount = requirements.filter((requirement) => requirement.complete).length;

  return {
    requiredQuizIds,
    requirements,
    completedCount,
    totalCount: requiredQuizIds.length,
    earned: requiredQuizIds.length > 0 && completedCount === requiredQuizIds.length
  };
}
