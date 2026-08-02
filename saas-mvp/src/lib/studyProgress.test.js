import assert from "node:assert/strict";
import test from "node:test";
import { buildLeaderboardMetrics, calculateStudyStreak } from "./leaderboard.js";
import { isTrainingReviewCurrent } from "./studyProgress.js";

test("an edited training page returns an older review to needs review", () => {
  const trainingDoc = { updatedAt: "2026-08-02T12:00:00.000Z" };

  assert.equal(
    isTrainingReviewCurrent(trainingDoc, { reviewedAt: "2026-08-02T11:00:00.000Z" }),
    false
  );
  assert.equal(
    isTrainingReviewCurrent(trainingDoc, { reviewedAt: "2026-08-02T13:00:00.000Z" }),
    true
  );
});

test("study streak counts consecutive days and facts mastered without duplicate quiz answers", () => {
  assert.equal(
    calculateStudyStreak(
      ["2026-08-02T12:00:00.000Z", "2026-08-01T12:00:00.000Z", "2026-07-31T12:00:00.000Z"],
      new Date("2026-08-02T18:00:00.000Z")
    ),
    3
  );

  const metrics = buildLeaderboardMetrics({
    acknowledgements: [
      { trainingDocId: "page-1", reviewedAt: "2026-08-02T12:00:00.000Z" },
      { trainingDocId: "page-1", reviewedAt: "2026-08-02T13:00:00.000Z" }
    ],
    attempts: [
      {
        quizId: "quiz-1",
        passed: true,
        completedAt: "2026-08-02T14:00:00.000Z",
        answersJson: JSON.stringify([{ questionId: "question-1", isCorrect: true }])
      },
      {
        quizId: "quiz-1",
        passed: true,
        completedAt: "2026-08-02T15:00:00.000Z",
        answersJson: JSON.stringify([{ questionId: "question-1", isCorrect: true }])
      }
    ]
  });

  assert.equal(metrics.reviewedPages, 1);
  assert.equal(metrics.passedQuizzes, 1);
  assert.equal(metrics.quizFactsMastered, 6);
});
