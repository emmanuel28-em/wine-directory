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

const freeformHeadings = {
  oneliner: "summary",
  oneLiner: "summary",
  stafftalkingpoint: "summary",
  summary: "summary",
  allergies: "allergens",
  allergens: "allergens",
  ingredient: "ingredients",
  ingredients: "ingredients",
  description: "description",
  details: "description",
  trainingnotes: "description",
  talkingpoints: "talkingPoints",
  servicenotes: "serviceNotes",
  method: "method",
  glass: "glassware",
  glassware: "glassware",
  garnish: "garnish",
  mise: "mise",
  ice: "ice"
};

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanText(value) {
  return String(value || "").trim();
}

function cleanListItem(value) {
  return cleanText(value)
    .replace(/^[-*•]+\s*/, "")
    .replace(/^_+|_+$/g, "")
    .trim();
}

function isMeaningful(value) {
  const text = cleanText(value);
  return Boolean(text) && !/^(?:n\/?a|tbd|unknown|not provided|not available|[-_*\s]+)$/i.test(text);
}

function splitList(value) {
  return cleanText(value)
    .split(/\n|,|;|\|/)
    .map(cleanListItem)
    .filter(isMeaningful);
}

function unique(values) {
  const seen = new Set();

  return values.map(cleanText).filter((value) => {
    const normalized = normalizeValue(value);
    if (!isMeaningful(value) || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function firstSentence(value) {
  const text = cleanText(value);
  return text.split(/(?<=[.!?])\s+/)[0] || text;
}

function normalizeHeading(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function appendSection(sections, key, value) {
  const nextValue = cleanListItem(value);
  if (!isMeaningful(nextValue)) return;
  sections[key] = sections[key] ? `${sections[key]}\n${nextValue}` : nextValue;
}

// Managers can paste a complete tech sheet into the free-writing editor. This
// parser recovers the quiz-worthy sections without forcing them to fill out a
// second rigid form.
function extractFreeformSections(value) {
  const sections = {};
  let activeKey = "";

  cleanText(value).split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || /^\*?asterisk means/i.test(line)) return;

    const headingMatch = line.match(/^([^:]{2,40}):\s*(.*)$/);
    const standaloneKey = freeformHeadings[normalizeHeading(line)];

    if (headingMatch) {
      const key = freeformHeadings[normalizeHeading(headingMatch[1])];
      activeKey = key || "";
      if (key) appendSection(sections, key, headingMatch[2]);
      return;
    }

    if (standaloneKey) {
      activeKey = standaloneKey;
      return;
    }

    if (activeKey) appendSection(sections, activeKey, line);
  });

  return sections;
}

function factValue(content, labelName) {
  const facts = content.testableStaffKnowledge || content.quizFacts || [];
  const match = facts.find((fact) => normalizeValue(fact.label).includes(labelName));
  return cleanText(match?.value);
}

function hasUsefulSummary(value) {
  return isMeaningful(value) && !/^(?:price|method|glass(?:ware)?|garnish|ice|mise|allerg(?:y|ies|ens?)|ingredients?)\s*:/i.test(cleanText(value));
}

export function deriveReviewContent(doc) {
  const content = parseContentJson(doc.contentJson);
  const freeform = extractFreeformSections([content.body, content.details].filter(Boolean).join("\n"));
  const summaryCandidates = [
    freeform.summary,
    content.summary,
    content.oneLiner,
    factValue(content, "one liner"),
    firstSentence(content.talkingPoints),
    firstSentence(freeform.talkingPoints),
    firstSentence(freeform.description),
    firstSentence(content.details)
  ];

  return {
    ...content,
    summary: summaryCandidates.find(hasUsefulSummary) || "",
    allergens: [content.allergens, freeform.allergens, factValue(content, "allergen")].find(isMeaningful) || "",
    ingredients: [content.ingredients, freeform.ingredients, factValue(content, "ingredient")].find(isMeaningful) || "",
    talkingPoints: [content.talkingPoints, freeform.talkingPoints].find(isMeaningful) || "",
    serviceNotes: [content.serviceNotes, freeform.serviceNotes].find(isMeaningful) || "",
    description: [freeform.description, content.details, content.body].find(isMeaningful) || "",
    method: [content.method, freeform.method].find(isMeaningful) || "",
    glassware: [content.glassware, freeform.glassware, factValue(content, "glass")].find(isMeaningful) || "",
    garnish: [content.garnish, freeform.garnish, factValue(content, "garnish")].find(isMeaningful) || "",
    mise: [content.mise, freeform.mise].find(isMeaningful) || "",
    ice: [content.ice, freeform.ice].find(isMeaningful) || ""
  };
}

function studyStatements(value) {
  return unique(
    cleanText(value)
      .split(/\n+|(?<=[.!?])\s+/)
      .map(cleanListItem)
      .filter((item) => item.length >= 18 && !freeformHeadings[normalizeHeading(item)])
  );
}

function shuffle(values) {
  return [...values].sort(() => Math.random() - 0.5);
}

function collectReviewAnswerPool(docs, fieldName) {
  return unique(
    docs.flatMap((doc) => {
      const content = deriveReviewContent(doc);

      if (fieldName === "ingredients") return splitList(content.ingredients);
      if (fieldName === "allergens") return [content.allergens];
      if (fieldName === "summary") return [content.summary];
      if (fieldName === "serviceNotes") return [firstSentence(content.serviceNotes || content.talkingPoints)];
      if (fieldName === "body") return studyStatements(content.description);
      if (fieldName === "category") return [doc.category, doc.type];
      if (fieldName === "producer") return [content.producer];
      if (fieldName === "region") return [content.region];
      if (fieldName === "grape") return [content.grape, content.grapes, content.varietal];
      if (fieldName === "vintage") return [content.vintage];
      if (fieldName === "farming") return [content.farming, content.farmingPractices];
      if (fieldName === "glassware") return [content.glassware];
      if (fieldName === "garnish") return [content.garnish];
      if (fieldName === "mise") return [content.mise];
      if (fieldName === "method") return [content.method];
      return [];
    })
  );
}

function makeReviewChoices({ correctAnswer, pool, fallback = [], exclude = [] }) {
  const excluded = new Set([correctAnswer, ...exclude].map(normalizeValue));
  const wrongAnswers = unique([...pool, ...fallback])
    .filter((choice) => !excluded.has(normalizeValue(choice)))
    .slice(0, 3);
  return shuffle(unique([correctAnswer, ...wrongAnswers])).slice(0, 4);
}

function addReviewQuestion(questions, question) {
  const choices = unique(question.choices || []);
  const correctAnswer = cleanText(question.correctAnswer);

  if (
    !isMeaningful(question.prompt)
    || !isMeaningful(correctAnswer)
    || choices.length < 2
    || !choices.some((choice) => normalizeValue(choice) === normalizeValue(correctAnswer))
    || questions.some((item) => item.prompt === cleanText(question.prompt))
  ) {
    return;
  }

  questions.push({
    prompt: cleanText(question.prompt),
    choices,
    correctAnswer,
    explanation: cleanText(question.explanation)
  });
}

function hasPlaceholderChoice(question) {
  return question.choices.some((choice) => /review the training notes option|add more training|not provided|\btbd\b/i.test(choice));
}

function savedQuestionsMatchCurrentContent(questions, doc, content) {
  if (questions.length < reviewQuestionCount || questions.some(hasPlaceholderChoice)) return false;

  const requirements = [];
  const ingredients = splitList(content.ingredients);

  if (content.summary) requirements.push({ term: /one[- ]?liner|description|talking point/i, answers: [content.summary] });
  if (content.allergens) requirements.push({ term: /allergen/i, answers: [content.allergens] });
  if (ingredients.length) requirements.push({ term: /ingredient/i, answers: ingredients });

  return requirements.every(({ term, answers }) =>
    questions.some((question) =>
      term.test(question.prompt)
      && answers.some((answer) => normalizeValue(answer) === normalizeValue(question.correctAnswer))
    )
  );
}

export function normalizeReviewQuestions(questions) {
  return (Array.isArray(questions) ? questions : [])
    .map((question) => {
      const choices = unique(question.choices || question.choicesText?.split?.("\n") || []);
      const correctAnswer = cleanText(question.correctAnswer);

      return {
        prompt: cleanText(question.prompt),
        choices: choices.some((choice) => normalizeValue(choice) === normalizeValue(correctAnswer))
          ? choices
          : unique([correctAnswer, ...choices]),
        correctAnswer,
        explanation: cleanText(question.explanation)
      };
    })
    .filter((question) => isMeaningful(question.prompt) && isMeaningful(question.correctAnswer) && question.choices.length >= 2);
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
  const content = deriveReviewContent(doc);
  const savedQuestions = normalizeReviewQuestions(content.reviewQuestions);

  if (preferSaved && savedQuestionsMatchCurrentContent(savedQuestions, doc, content)) {
    return savedQuestions.slice(0, reviewQuestionCount);
  }

  const title = doc.title || "this item";
  const questions = [];
  const ingredients = splitList(content.ingredients);
  const isFoodOrDrink = ["food", "cocktail", "pastaTasting"].includes(doc.type);
  const sameTypeDocs = allDocs.filter((candidate) => candidate.type === doc.type);
  const comparisonDocs = sameTypeDocs.length > 1 ? sameTypeDocs : allDocs;

  // Food and beverage staff should encounter these core facts first. They are
  // regenerated from the latest page content whenever old saved questions are
  // incomplete or no longer match the current tech sheet.
  addReviewQuestion(questions, {
    prompt: `What is the correct one-liner for ${title}?`,
    correctAnswer: content.summary,
    choices: makeReviewChoices({
      correctAnswer: content.summary,
      pool: collectReviewAnswerPool(comparisonDocs, "summary"),
      fallback: [
        "A seasonal preparation with a bright, savory finish.",
        "A classic house preparation designed for sharing.",
        "A rich preparation balanced by fresh acidity."
      ]
    }),
    explanation: content.summary
  });

  if (isFoodOrDrink) {
    addReviewQuestion(questions, {
      prompt: `What allergens should staff know for ${title}?`,
      correctAnswer: content.allergens,
      choices: makeReviewChoices({
        correctAnswer: content.allergens,
        pool: collectReviewAnswerPool(comparisonDocs, "allergens"),
        fallback: ["Dairy and gluten", "Citrus and allium", "Tree nuts and egg"]
      }),
      explanation: content.allergens ? `${title} allergens: ${content.allergens}` : ""
    });

    ingredients.slice(0, 2).forEach((ingredient, ingredientIndex) => {
      addReviewQuestion(questions, {
        prompt: ingredientIndex === 0
          ? `Which ingredient is used in ${title}?`
          : `Which additional ingredient is used in ${title}?`,
        correctAnswer: ingredient,
        choices: makeReviewChoices({
          correctAnswer: ingredient,
          pool: collectReviewAnswerPool(comparisonDocs, "ingredients"),
          exclude: ingredients,
          fallback: ["Parmigiano", "Lemon", "Garlic", "Extra virgin olive oil"]
        }),
        explanation: `${ingredient} is listed as an ingredient for ${title}.`
      });
    });
  }

  if (doc.type === "wine") {
    [
      ["Who produces", "producer", content.producer, "Producer"],
      ["What region is", "region", content.region, "Region"],
      ["What grape or varietal is used for", "grape", content.grape || content.grapes || content.varietal, "Grape or varietal"],
      ["What vintage is", "vintage", content.vintage, "Vintage"],
      ["What farming practice is used for", "farming", content.farming || content.farmingPractices, "Farming"]
    ].forEach(([promptStart, poolName, answer, label]) => {
      addReviewQuestion(questions, {
        prompt: `${promptStart} ${title}?`,
        correctAnswer: answer,
        choices: makeReviewChoices({
          correctAnswer: answer,
          pool: collectReviewAnswerPool(comparisonDocs, poolName),
          fallback: poolName === "vintage"
            ? ["2024", "2023", "2022", "2021"]
            : ["Piemonte", "Toscana", "Emilia-Romagna", "Veneto"]
        }),
        explanation: answer ? `${label}: ${answer}` : ""
      });
    });
  }

  if (doc.type === "cocktail") {
    [
      ["What glassware is used for", "glassware", content.glassware, ["Coupe", "Collins", "Nick & Nora", "Rocks"]],
      ["What is the garnish for", "garnish", content.garnish, ["Lemon twist", "Orange peel", "Fresh flowers", "No garnish"]]
    ].forEach(([promptStart, poolName, answer, fallback]) => {
      addReviewQuestion(questions, {
        prompt: `${promptStart} ${title}?`,
        correctAnswer: answer,
        choices: makeReviewChoices({ correctAnswer: answer, pool: collectReviewAnswerPool(comparisonDocs, poolName), fallback }),
        explanation: answer
      });
    });
  }

  const facts = content.testableStaffKnowledge || content.quizFacts || [];
  facts
    .filter((fact) => fact.quizEligible !== false && isMeaningful(fact.value))
    .forEach((fact) => {
      const label = cleanText(fact.label) || "detail";
      const lowerLabel = normalizeValue(label);

      // Structured imports often store the same allergen and ingredient data
      // both in the page fields and in quiz facts. The core questions above
      // already cover those fields, so do not ask the same thing twice.
      if (lowerLabel.includes("allergen") && content.allergens) return;
      if (lowerLabel.includes("ingredient") && ingredients.length) return;
      if ((lowerLabel.includes("one liner") || lowerLabel.includes("summary")) && content.summary) return;

      const poolKey = lowerLabel.includes("allergen")
        ? "allergens"
        : lowerLabel.includes("ingredient")
          ? "ingredients"
          : lowerLabel.includes("mise")
            ? "mise"
            : lowerLabel.includes("glass")
              ? "glassware"
              : lowerLabel.includes("garnish")
                ? "garnish"
                : lowerLabel.includes("method")
                  ? "method"
          : lowerLabel.includes("service")
            ? "serviceNotes"
            : "category";
      const factFallbacks = {
        mise: ["Small Fork", "Large Fork", "Steak Knife", "No additional mise"],
        glassware: ["Coupe", "Collins", "Nick & Nora", "Rocks"],
        garnish: ["Lemon twist", "Orange peel", "Fresh flowers", "No garnish"],
        method: ["Build over ice", "Shake and strain", "Stir and strain", "Dry shake, then wet shake"],
        serviceNotes: ["Confirm with a manager", "Serve immediately", "Present tableside"]
      };

      addReviewQuestion(questions, {
        prompt: fact.questionHint || `What should staff know about ${label} for ${title}?`,
        correctAnswer: cleanText(fact.value),
        choices: makeReviewChoices({
          correctAnswer: cleanText(fact.value),
          pool: collectReviewAnswerPool(comparisonDocs, poolKey),
          fallback: factFallbacks[poolKey] || ["Ask a manager before service", "Review the current menu", "Check the service notes"]
        }),
        explanation: `${label}: ${cleanText(fact.value)}`
      });
    });

  addReviewQuestion(questions, {
    prompt: `What service note should staff remember for ${title}?`,
    correctAnswer: firstSentence(content.serviceNotes || content.talkingPoints),
    choices: makeReviewChoices({
      correctAnswer: firstSentence(content.serviceNotes || content.talkingPoints),
      pool: collectReviewAnswerPool(comparisonDocs, "serviceNotes"),
      fallback: [
        "Confirm modifications before promising them.",
        "Present this only after the table is cleared.",
        "This is used during opening sidework."
      ]
    }),
    explanation: firstSentence(content.serviceNotes || content.talkingPoints)
  });

  studyStatements(content.description).slice(0, reviewQuestionCount).forEach((statement) => {
    addReviewQuestion(questions, {
      prompt: `Which description correctly matches ${title}?`,
      correctAnswer: statement,
      choices: makeReviewChoices({
        correctAnswer: statement,
        pool: collectReviewAnswerPool(comparisonDocs, "body"),
        fallback: [
          "This item is served without additional preparation.",
          "This description belongs to a different training item.",
          "Staff should confirm this detail before service."
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

  return questions.slice(0, reviewQuestionCount);
}
