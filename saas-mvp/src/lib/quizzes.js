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

export function parseChoices(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // Fall through to newline parsing.
  }

  return String(value)
    .split("\n")
    .map((choice) => choice.trim())
    .filter(Boolean);
}

export function parseAnswersJson(value) {
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

export async function listQuizzesForRestaurant(restaurantId) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();
  const result = await dataClient.models.Quiz.list({
    filter: {
      restaurantId: {
        eq: restaurantId
      }
    }
  });

  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  return [...(result.data || [])].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
}

export async function createQuiz({ restaurantId, form }) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();

  return assertNoErrors(
    await dataClient.models.Quiz.create({
      restaurantId,
      ...getWorkspaceGroups(restaurantId),
      trainingDocId: form.trainingDocId || null,
      title: form.title.trim(),
      category: form.category.trim(),
      passingScore: Number(form.passingScore) || 80,
      isPublished: form.status ? form.status === "published" : Boolean(form.isPublished)
    }),
    "Quiz was not created."
  );
}

export async function updateQuizPublishStatus({ quiz, restaurantId, isPublished }) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();
  const existing = await dataClient.models.Quiz.get({ id: quiz.id });

  if (existing.errors?.length) {
    throw new Error(existing.errors.map((error) => error.message).join(" "));
  }

  assertSameRestaurant(existing.data, restaurantId, "Quiz");

  return assertNoErrors(
    await dataClient.models.Quiz.update({
      id: quiz.id,
      isPublished
    }),
    "Quiz status was not updated."
  );
}

export async function listQuestionsForQuiz(quizId, restaurantId) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();
  const filter = {
    quizId: {
      eq: quizId
    }
  };

  filter.restaurantId = {
    eq: restaurantId
  };

  const result = await dataClient.models.QuizQuestion.list({
    filter
  });

  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  return result.data || [];
}

export async function createQuizQuestion({ restaurantId, quizId, form }) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();
  const choices = parseChoices(form.choicesText);
  const quiz = await dataClient.models.Quiz.get({ id: quizId });

  if (quiz.errors?.length) {
    throw new Error(quiz.errors.map((error) => error.message).join(" "));
  }

  assertSameRestaurant(quiz.data, restaurantId, "Quiz");

  if (!choices.includes(form.correctAnswer.trim())) {
    throw new Error("Answer choices must include the correct answer.");
  }

  return assertNoErrors(
    await dataClient.models.QuizQuestion.create({
      restaurantId,
      ...getWorkspaceGroups(restaurantId),
      quizId,
      prompt: form.prompt.trim(),
      choicesJson: JSON.stringify(choices),
      correctAnswer: form.correctAnswer.trim(),
      explanation: form.explanation.trim()
    }),
    "Quiz question was not created."
  );
}

export async function updateQuizQuestion({ questionId, restaurantId, form }) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();
  const choices = parseChoices(form.choicesText);
  const existing = await dataClient.models.QuizQuestion.get({ id: questionId });

  if (existing.errors?.length) {
    throw new Error(existing.errors.map((error) => error.message).join(" "));
  }

  assertSameRestaurant(existing.data, restaurantId, "Quiz Question");

  if (!choices.includes(form.correctAnswer.trim())) {
    throw new Error("Answer choices must include the correct answer.");
  }

  return assertNoErrors(
    await dataClient.models.QuizQuestion.update({
      id: questionId,
      prompt: form.prompt.trim(),
      choicesJson: JSON.stringify(choices),
      correctAnswer: form.correctAnswer.trim(),
      explanation: form.explanation.trim()
    }),
    "Quiz question was not updated."
  );
}

export async function deleteQuizQuestion({ questionId, restaurantId }) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();
  const existing = await dataClient.models.QuizQuestion.get({ id: questionId });

  if (existing.errors?.length) {
    throw new Error(existing.errors.map((error) => error.message).join(" "));
  }

  assertSameRestaurant(existing.data, restaurantId, "Quiz Question");

  const result = await dataClient.models.QuizQuestion.delete({ id: questionId });

  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }
}

export async function listQuizAttemptsForRestaurant(restaurantId) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();
  const result = await dataClient.models.QuizAttempt.list({
    filter: {
      restaurantId: {
        eq: restaurantId
      }
    }
  });

  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  return [...(result.data || [])].sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));
}

export async function listQuizAttemptsForUser({ restaurantId, userProfileId }) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();
  const result = await dataClient.models.QuizAttempt.list({
    filter: {
      restaurantId: {
        eq: restaurantId
      },
      userProfileId: {
        eq: userProfileId
      }
    }
  });

  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  return [...(result.data || [])].sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0));
}

export async function saveQuizAttempt({ restaurantId, quiz, userProfileId, cognitoUserId, questions, answers }) {
  requireRestaurantId(restaurantId);
  assertSameRestaurant(quiz, restaurantId, "Quiz");

  if (!quiz.isPublished) {
    throw new Error("This quiz is not published yet.");
  }

  questions.forEach((question) => {
    assertSameRestaurant(question, restaurantId, "Quiz Question");
  });

  const dataClient = getDataClient();
  const answerRows = questions.map((question) => {
    const selectedAnswer = answers[question.id] || "";
    const isCorrect = selectedAnswer === question.correctAnswer;

    return {
      questionId: question.id,
      prompt: question.prompt,
      selectedAnswer,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || "",
      isCorrect
    };
  });
  const correctCount = answerRows.filter((answer) => answer.isCorrect).length;
  const score = questions.length ? Math.round((correctCount / questions.length) * 100) : 0;
  const passingScore = Number(quiz.passingScore) || 80;

  return assertNoErrors(
    await dataClient.models.QuizAttempt.create({
      restaurantId,
      ...getWorkspaceGroups(restaurantId),
      quizId: quiz.id,
      userProfileId,
      cognitoUserId,
      score,
      passed: score >= passingScore,
      answersJson: JSON.stringify(answerRows),
      completedAt: new Date().toISOString()
    }),
    "Quiz attempt was not saved."
  );
}
