import { parseContentJson } from "./trainingDocs.js";

export const reviewQuestionCount = 5;
export const reviewPassingScore = 4;

const typeLabels = {
  wine: "Wine",
  cocktail: "Cocktail",
  food: "Food",
  sop: "SOP",
  pastaTasting: "Pasta Tasting",
  custom: "Custom"
};

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanText(value) {
  return String(value || "").trim();
}

function splitList(value) {
  return cleanText(value)
    .split(/\n|,|;|\|/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(values) {
  return [...new Set(values.map(cleanText).filter(Boolean))];
}

function firstSentence(value) {
  const text = cleanText(value);
  return text.split(/(?<=[.!?])\s+/)[0] || text;
}

function studyStatements(value) {
  return unique(
    cleanText(value)
      .split(/\n+|(?<=[.!?])\s+/)
      .map((item) => item.replace(/^[-*•]\s*/, "").trim())
      .filter((item) => item.length >= 18)
  );
}

function shuffle(values) {
  return [...values].sort(() => Math.random() - 0.5);
}

function collectReviewAnswerPool(docs, fieldName) {
  return unique(
    docs.flatMap((doc) => {
      const content = parseContentJson(doc.contentJson);

      if (fieldName === "ingredients") return splitList(content.ingredients);
      if (fieldName === "allergens") return splitList(content.allergens);
      if (fieldName === "summary") return [content.summary];
      if (fieldName === "serviceNotes") return [firstSentence(content.serviceNotes)];
      if (fieldName === "body") return studyStatements(content.body || content.details);
      if (fieldName === "category") return [doc.category, doc.type];

      const facts = content.testableStaffKnowledge || content.quizFacts || [];
      return facts
        .filter((fact) => normalizeValue(fact.label).includes(fieldName))
        .map((fact) => fact.value);
    })
  );
}

function makeReviewChoices({ correctAnswer, pool, fallback = [] }) {
  const wrongAnswers = unique([...pool, ...fallback]).filter((choice) => choice !== correctAnswer).slice(0, 3);
  const choices = unique([correctAnswer, ...wrongAnswers]);

  while (choices.length < 4) {
    choices.push(`Review the training notes option ${choices.length + 1}`);
  }

  return shuffle(choices).slice(0, 4);
}

function addReviewQuestion(questions, question) {
  if (!question.correctAnswer || questions.some((item) => item.prompt === question.prompt)) {
    return;
  }

  questions.push({
    prompt: cleanText(question.prompt),
    choices: unique(question.choices || []),
    correctAnswer: cleanText(question.correctAnswer),
    explanation: cleanText(question.explanation)
  });
}

export function normalizeReviewQuestions(questions) {
  return (Array.isArray(questions) ? questions : [])
    .map((question) => {
      const choices = unique(question.choices || question.choicesText?.split?.("\n") || []);
      const correctAnswer = cleanText(question.correctAnswer);

      return {
        prompt: cleanText(question.prompt),
        choices: choices.includes(correctAnswer) ? choices : unique([correctAnswer, ...choices]),
        correctAnswer,
        explanation: cleanText(question.explanation)
      };
    })
    .filter((question) => question.prompt && question.correctAnswer && question.choices.length >= 2);
}

export function parseReviewQuestionsJson(value) {
  if (!value) return [];

  try {
    return normalizeReviewQuestions(JSON.parse(value));
  } catch {
    return [];
  }
}

export function buildReviewQuestionsForDoc(doc, allDocs, { preferSaved = true } = {}) {
  const content = parseContentJson(doc.contentJson);
  const savedQuestions = normalizeReviewQuestions(content.reviewQuestions);

  if (preferSaved && savedQuestions.length >= reviewQuestionCount) {
    return savedQuestions.slice(0, reviewQuestionCount);
  }

  const title = doc.title || "this item";
  const questions = [];
  const facts = content.testableStaffKnowledge || content.quizFacts || [];

  facts
    .filter((fact) => fact.quizEligible !== false && cleanText(fact.value))
    .forEach((fact) => {
      const label = cleanText(fact.label) || "detail";
      const lowerLabel = normalizeValue(label);
      const poolKey =
        lowerLabel.includes("allergen")
          ? "allergens"
          : lowerLabel.includes("ingredient")
            ? "ingredients"
            : lowerLabel.includes("service")
              ? "serviceNotes"
              : "category";

      addReviewQuestion(questions, {
        prompt: fact.questionHint || `What should staff know about ${label} for ${title}?`,
        correctAnswer: cleanText(fact.value),
        choices: makeReviewChoices({
          correctAnswer: cleanText(fact.value),
          pool: collectReviewAnswerPool(allDocs, poolKey),
          fallback: ["Ask a manager before service", "Check the most recent training page", "Review the dish notes"]
        }),
        explanation: `${label}: ${cleanText(fact.value)}`
      });
    });

  addReviewQuestion(questions, {
    prompt: `What is the correct one-liner for ${title}?`,
    correctAnswer: content.summary,
    choices: makeReviewChoices({
      correctAnswer: content.summary,
      pool: collectReviewAnswerPool(allDocs, "summary"),
      fallback: ["A classic house favorite with seasonal garnish.", "A rich preparation with bright acidity.", "A staff-only note for pre-shift."]
    }),
    explanation: content.summary
  });

  addReviewQuestion(questions, {
    prompt: `What allergens should staff know for ${title}?`,
    correctAnswer: content.allergens,
    choices: makeReviewChoices({
      correctAnswer: content.allergens,
      pool: collectReviewAnswerPool(allDocs, "allergens"),
      fallback: ["Dairy, gluten", "Citrus, allium", "Nuts, egg"]
    }),
    explanation: content.allergens ? `${title} allergens: ${content.allergens}` : ""
  });

  splitList(content.ingredients).slice(0, 2).forEach((ingredient) => {
    addReviewQuestion(questions, {
      prompt: `Which ingredient is used in ${title}?`,
      correctAnswer: ingredient,
      choices: makeReviewChoices({
        correctAnswer: ingredient,
        pool: collectReviewAnswerPool(allDocs, "ingredients"),
        fallback: ["Parmigiano", "Lemon", "Garlic"]
      }),
      explanation: `${ingredient} is listed for ${title}.`
    });
  });

  addReviewQuestion(questions, {
    prompt: `What service note should staff remember for ${title}?`,
    correctAnswer: firstSentence(content.serviceNotes || content.talkingPoints || content.body),
    choices: makeReviewChoices({
      correctAnswer: firstSentence(content.serviceNotes || content.talkingPoints || content.body),
      pool: collectReviewAnswerPool(allDocs, "serviceNotes"),
      fallback: ["Confirm with a manager before promising changes.", "Serve only after the table is cleared.", "This is used during opening sidework."]
    }),
    explanation: firstSentence(content.serviceNotes || content.talkingPoints || content.body)
  });

  // A manager can write naturally instead of filling out a rigid form. Pull
  // useful statements from those notes so every page still receives five
  // study questions before it reaches staff.
  studyStatements([content.body, content.details, content.talkingPoints, content.serviceNotes].filter(Boolean).join("\n"))
    .slice(0, reviewQuestionCount)
    .forEach((statement, index) => {
      addReviewQuestion(questions, {
        prompt: `Which training detail is correct for ${title}? (${index + 1})`,
        correctAnswer: statement,
        choices: makeReviewChoices({
          correctAnswer: statement,
          pool: collectReviewAnswerPool(allDocs, "body"),
          fallback: [
            "This detail is not part of the current training page.",
            "Confirm this with a manager before sharing it with a guest.",
            "This information belongs to a different training item."
          ]
        }),
        explanation: statement
      });
    });

  addReviewQuestion(questions, {
    prompt: `Where is ${title} organized in the training library?`,
    correctAnswer: doc.category || doc.type,
    choices: makeReviewChoices({
      correctAnswer: doc.category || doc.type,
      pool: collectReviewAnswerPool(allDocs, "category"),
      fallback: ["Dinner Menu", "Cocktails", "BTG Wines"]
    }),
    explanation: `${title} is organized as ${doc.category || doc.type}.`
  });

  addReviewQuestion(questions, {
    prompt: "Which training page are you reviewing?",
    correctAnswer: title,
    choices: makeReviewChoices({
      correctAnswer: title,
      pool: allDocs.map((item) => item.title),
      fallback: ["Opening Sidework", "Dinner Menu Overview", "Wine Service Standards"]
    }),
    explanation: `This review check is for ${title}.`
  });

  addReviewQuestion(questions, {
    prompt: `What type of training page is ${title}?`,
    correctAnswer: typeLabels[doc.type] || doc.type,
    choices: makeReviewChoices({
      correctAnswer: typeLabels[doc.type] || doc.type,
      pool: Object.values(typeLabels),
      fallback: ["Food", "Wine", "Cocktail"]
    }),
    explanation: `${title} is saved as ${typeLabels[doc.type] || doc.type}.`
  });

  return shuffle(questions).slice(0, reviewQuestionCount);
}
