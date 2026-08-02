import { getDataClient } from "./dataClient.js";
import { listQuizAttemptsForRestaurant, listQuizAttemptsForUser } from "./quizzes.js";
import { listTeamMembersForRestaurant } from "./settings.js";
import {
  listMyTrainingAcknowledgements,
  listTrainingAcknowledgementsForRestaurant
} from "./trainingAcknowledgements.js";
import { requireRestaurantId } from "./permissions.js";
import { isTrainingReviewCurrent } from "./studyProgress.js";
import { listTrainingDocsForRestaurant } from "./trainingDocs.js";
import { getWorkspaceGroups } from "./workspaceGroups.js";

function assertNoErrors(result, fallbackMessage) {
  if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join(" "));
  if (!result.data) throw new Error(fallbackMessage);
  return result.data;
}

function dateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function calculateStudyStreak(activityDates = [], now = new Date()) {
  const activeDays = new Set(activityDates.map(dateKey).filter(Boolean));
  if (!activeDays.size) return 0;

  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayKey = dateKey(cursor);
  const yesterday = new Date(cursor);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  if (!activeDays.has(todayKey) && !activeDays.has(dateKey(yesterday))) return 0;
  if (!activeDays.has(todayKey)) cursor.setUTCDate(cursor.getUTCDate() - 1);

  let streak = 0;
  while (activeDays.has(dateKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export function buildLeaderboardMetrics({ acknowledgements = [], attempts = [] }) {
  const reviewedPages = new Set(acknowledgements.map((item) => item.trainingDocId).filter(Boolean)).size;
  const passedQuizzes = new Set(attempts.filter((item) => item.passed).map((item) => item.quizId).filter(Boolean)).size;
  const masteredQuizFacts = new Set();

  attempts.forEach((attempt) => {
    if (!attempt.answersJson) return;
    try {
      JSON.parse(attempt.answersJson).forEach((answer) => {
        if (answer.isCorrect) masteredQuizFacts.add(`${attempt.quizId}:${answer.questionId}`);
      });
    } catch {
      // An older malformed attempt should not prevent the leaderboard loading.
    }
  });

  const activityDates = [
    ...acknowledgements.map((item) => item.reviewedAt),
    ...attempts.map((item) => item.completedAt)
  ].filter(Boolean);
  const lastStudyAt = [...activityDates].sort((a, b) => new Date(b) - new Date(a))[0] || null;

  return {
    reviewedPages,
    passedQuizzes,
    quizFactsMastered: reviewedPages * 5 + masteredQuizFacts.size,
    currentStreak: calculateStudyStreak(activityDates),
    lastStudyAt
  };
}

export async function listLeaderboardForRestaurant(restaurantId) {
  requireRestaurantId(restaurantId);
  const result = await getDataClient().models.LeaderboardEntry.list({
    filter: { restaurantId: { eq: restaurantId } }
  });
  if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join(" "));
  return [...(result.data || [])].sort((left, right) =>
    (right.quizFactsMastered || 0) - (left.quizFactsMastered || 0) ||
    (right.currentStreak || 0) - (left.currentStreak || 0) ||
    (left.displayName || "").localeCompare(right.displayName || "")
  );
}

async function upsertLeaderboardEntry({ restaurantId, profile, membership, acknowledgements, attempts }) {
  const client = getDataClient();
  const metrics = buildLeaderboardMetrics({ acknowledgements, attempts });
  const existingResult = await client.models.LeaderboardEntry.list({
    filter: {
      restaurantId: { eq: restaurantId },
      userProfileId: { eq: profile.id }
    }
  });
  if (existingResult.errors?.length) throw new Error(existingResult.errors.map((error) => error.message).join(" "));

  const payload = {
    restaurantId,
    userProfileId: profile.id,
    cognitoUserId: membership?.cognitoUserId || profile.cognitoUserId,
    displayName: profile.name || "Team Member",
    ...metrics,
    ...getWorkspaceGroups(restaurantId)
  };
  const existing = existingResult.data?.[0];

  return existing
    ? assertNoErrors(await client.models.LeaderboardEntry.update({ id: existing.id, ...payload }), "Leaderboard was not updated.")
    : assertNoErrors(await client.models.LeaderboardEntry.create(payload), "Leaderboard entry was not created.");
}

export async function syncMyLeaderboardEntry({ restaurantId, userProfile, membership }) {
  const [acknowledgements, attempts, trainingDocs] = await Promise.all([
    listMyTrainingAcknowledgements({ restaurantId, userProfileId: userProfile.id }),
    listQuizAttemptsForUser({ restaurantId, userProfileId: userProfile.id }),
    listTrainingDocsForRestaurant(restaurantId)
  ]);
  const trainingDocById = new Map(trainingDocs.map((doc) => [doc.id, doc]));
  const currentAcknowledgements = acknowledgements.filter((item) =>
    isTrainingReviewCurrent(trainingDocById.get(item.trainingDocId), item)
  );
  return upsertLeaderboardEntry({ restaurantId, profile: userProfile, membership, acknowledgements: currentAcknowledgements, attempts });
}

// Managers can refresh the aggregate for the whole restaurant because they
// already have authorized access to team progress. Staff never receive those
// raw records; they read only the safe totals above.
export async function refreshRestaurantLeaderboard(restaurantId) {
  const [members, acknowledgements, attempts, trainingDocs] = await Promise.all([
    listTeamMembersForRestaurant(restaurantId),
    listTrainingAcknowledgementsForRestaurant(restaurantId),
    listQuizAttemptsForRestaurant(restaurantId),
    listTrainingDocsForRestaurant(restaurantId)
  ]);
  const trainingDocById = new Map(trainingDocs.map((doc) => [doc.id, doc]));

  await Promise.all(
    members
      .filter((member) => member.membership?.status === "active" && member.profile)
      .map((member) => upsertLeaderboardEntry({
        restaurantId,
        profile: member.profile,
        membership: member.membership,
        acknowledgements: acknowledgements.filter((item) =>
          item.userProfileId === member.profile?.id &&
          isTrainingReviewCurrent(trainingDocById.get(item.trainingDocId), item)
        ),
        attempts: attempts.filter((item) => item.userProfileId === member.profile?.id)
      }))
  );
}
