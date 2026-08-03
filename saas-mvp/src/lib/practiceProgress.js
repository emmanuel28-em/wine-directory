export const practiceSessionSize = 8;

function cleanText(value) {
  return String(value || "").trim();
}

export function getPracticeStorageKey(restaurantId, userProfileId) {
  return `lineup-practice:${restaurantId || "restaurant"}:${userProfileId || "user"}`;
}

export function parsePracticeProgress(value) {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function markPracticePrompt(progress, { trainingDocId, prompt }) {
  const cleanPrompt = cleanText(prompt);
  if (!trainingDocId || !cleanPrompt) return progress || {};

  const currentPrompts = Array.isArray(progress?.[trainingDocId]?.masteredPrompts)
    ? progress[trainingDocId].masteredPrompts
    : [];

  return {
    ...(progress || {}),
    [trainingDocId]: {
      masteredPrompts: [...new Set([...currentPrompts, cleanPrompt])],
      practicedAt: new Date().toISOString()
    }
  };
}

export function countPracticedPrompts(progress, trainingDocId, questions = []) {
  const masteredPrompts = new Set(progress?.[trainingDocId]?.masteredPrompts || []);
  return questions.filter((question) => masteredPrompts.has(cleanText(question.prompt))).length;
}

export function hasPracticedPrompt(progress, trainingDocId, prompt) {
  return (progress?.[trainingDocId]?.masteredPrompts || []).includes(cleanText(prompt));
}
