import { parseContentJson } from "./trainingDocs.js";

const genericDefaults = {
  allergen: ["Contains dairy", "Contains gluten", "Contains nuts", "Contains shellfish"],
  ingredient: ["Parmigiano", "Lemon", "Garlic", "Olive oil"],
  talkingPoint: [
    "It is a guest-facing service detail.",
    "It is a seasonal menu highlight.",
    "It is a useful pairing note.",
    "It is a key preparation note."
  ],
  region: ["Emilia-Romagna", "Piemonte", "Toscana", "Veneto"],
  grape: ["Nebbiolo", "Sangiovese", "Lambrusco", "Garganega"],
  producer: ["Pra", "Roagna", "Foradori", "Medici Ermete"],
  vintage: ["2024", "2023", "2022", "2021"],
  category: ["Food", "Wine", "Cocktail", "SOP"]
};

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

function addFact(facts, fact) {
  if (!fact.correctAnswer) {
    return;
  }

  facts.push({
    sourceDocId: fact.sourceDocId,
    sourceTitle: fact.sourceTitle,
    factType: fact.factType,
    prompt: fact.prompt,
    correctAnswer: cleanText(fact.correctAnswer),
    explanation: cleanText(fact.explanation)
  });
}

function collectRestaurantPools(trainingDocs) {
  const pools = {
    allergen: [],
    ingredient: [],
    talkingPoint: [],
    region: [],
    grape: [],
    producer: [],
    vintage: [],
    category: []
  };

  trainingDocs.forEach((doc) => {
    const content = parseContentJson(doc.contentJson);
    const facts = content.testableStaffKnowledge || content.quizFacts || [];

    pools.category.push(doc.category, doc.type);
    pools.allergen.push(...splitList(content.allergens));
    pools.ingredient.push(...splitList(content.ingredients));
    pools.talkingPoint.push(firstSentence(content.talkingPoints), firstSentence(content.serviceNotes));
    pools.region.push(content.region);
    pools.grape.push(content.grape, content.grapes, content.varietal);
    pools.producer.push(content.producer);
    pools.vintage.push(content.vintage);

    facts.forEach((fact) => {
      const label = cleanText(fact.label).toLowerCase();
      const value = cleanText(fact.value);

      if (label.includes("allergen")) pools.allergen.push(value);
      if (label.includes("ingredient")) pools.ingredient.push(...splitList(value));
      if (label.includes("talking") || label.includes("service")) pools.talkingPoint.push(value);
      if (label.includes("region") && !label.includes("sub")) pools.region.push(value);
      if (label.includes("grape") || label.includes("varietal")) pools.grape.push(value);
      if (label.includes("producer")) pools.producer.push(value);
      if (label.includes("vintage")) pools.vintage.push(value);
    });
  });

  Object.keys(pools).forEach((key) => {
    pools[key] = unique(pools[key]);
  });

  return pools;
}

function getWrongAnswers({ correctAnswer, factType, pools }) {
  const realOptions = (pools[factType] || []).filter((option) => option !== correctAnswer);
  const fallbackOptions = (genericDefaults[factType] || genericDefaults.category).filter((option) => option !== correctAnswer);
  return unique([...realOptions, ...fallbackOptions]).slice(0, 3);
}

function makeChoices({ correctAnswer, factType, pools }) {
  return unique([correctAnswer, ...getWrongAnswers({ correctAnswer, factType, pools })]).slice(0, 4);
}

function factsFromDoc(doc) {
  const content = parseContentJson(doc.contentJson);
  const facts = [];
  const title = doc.title || "this training page";
  const testableFacts = content.testableStaffKnowledge || content.quizFacts || [];

  testableFacts
    .filter((fact) => fact.quizEligible !== false)
    .forEach((fact) => {
      const label = cleanText(fact.label) || "detail";
      const value = cleanText(fact.value);
      const lowerLabel = label.toLowerCase();
      let factType = "category";

      if (lowerLabel.includes("allergen")) factType = "allergen";
      if (lowerLabel.includes("ingredient")) factType = "ingredient";
      if (lowerLabel.includes("talking") || lowerLabel.includes("service")) factType = "talkingPoint";
      if (lowerLabel.includes("region") && !lowerLabel.includes("sub")) factType = "region";
      if (lowerLabel.includes("grape") || lowerLabel.includes("varietal")) factType = "grape";
      if (lowerLabel.includes("producer")) factType = "producer";
      if (lowerLabel.includes("vintage")) factType = "vintage";

      addFact(facts, {
        sourceDocId: doc.id,
        sourceTitle: title,
        factType,
        prompt: fact.questionHint || `What should staff know about ${label} for ${title}?`,
        correctAnswer: value,
        explanation: `${label}: ${value}`
      });
    });

  addFact(facts, {
    sourceDocId: doc.id,
    sourceTitle: title,
    factType: "allergen",
    prompt: `What allergens should staff know for ${title}?`,
    correctAnswer: content.allergens,
    explanation: content.allergens ? `${title} allergens: ${content.allergens}` : ""
  });

  addFact(facts, {
    sourceDocId: doc.id,
    sourceTitle: title,
    factType: "producer",
    prompt: `Who produces ${title}?`,
    correctAnswer: content.producer,
    explanation: content.producer ? `${title} is produced by ${content.producer}.` : ""
  });

  addFact(facts, {
    sourceDocId: doc.id,
    sourceTitle: title,
    factType: "region",
    prompt: `What region is ${title} from?`,
    correctAnswer: content.region,
    explanation: content.region ? `${title} is from ${content.region}.` : ""
  });

  addFact(facts, {
    sourceDocId: doc.id,
    sourceTitle: title,
    factType: "grape",
    prompt: `What grape or varietal is used for ${title}?`,
    correctAnswer: content.grape || content.grapes || content.varietal,
    explanation: content.grape || content.grapes || content.varietal ? `${title}: ${content.grape || content.grapes || content.varietal}.` : ""
  });

  addFact(facts, {
    sourceDocId: doc.id,
    sourceTitle: title,
    factType: "vintage",
    prompt: `What vintage is ${title}?`,
    correctAnswer: content.vintage,
    explanation: content.vintage ? `${title} is the ${content.vintage} vintage.` : ""
  });

  splitList(content.ingredients).slice(0, 2).forEach((ingredient) => {
    addFact(facts, {
      sourceDocId: doc.id,
      sourceTitle: title,
      factType: "ingredient",
      prompt: `Which ingredient is used in ${title}?`,
      correctAnswer: ingredient,
      explanation: `${ingredient} is listed as an ingredient for ${title}.`
    });
  });

  addFact(facts, {
    sourceDocId: doc.id,
    sourceTitle: title,
    factType: "talkingPoint",
    prompt: `What is a key talking point for ${title}?`,
    correctAnswer: firstSentence(content.talkingPoints),
    explanation: firstSentence(content.talkingPoints)
  });

  addFact(facts, {
    sourceDocId: doc.id,
    sourceTitle: title,
    factType: "talkingPoint",
    prompt: `What service note should staff remember for ${title}?`,
    correctAnswer: firstSentence(content.serviceNotes),
    explanation: firstSentence(content.serviceNotes)
  });

  addFact(facts, {
    sourceDocId: doc.id,
    sourceTitle: title,
    factType: "category",
    prompt: `What type of training page is ${title}?`,
    correctAnswer: doc.type,
    explanation: `${title} is saved as ${doc.type}.`
  });

  addFact(facts, {
    sourceDocId: doc.id,
    sourceTitle: title,
    factType: "category",
    prompt: `What category is ${title} in?`,
    correctAnswer: doc.category,
    explanation: `${title} is categorized as ${doc.category}.`
  });

  return facts;
}

export function generateDraftQuestions({ allTrainingDocs, sourceTrainingDocs, questionCount }) {
  const pools = collectRestaurantPools(allTrainingDocs);
  const facts = sourceTrainingDocs.flatMap((doc) => factsFromDoc(doc));

  return facts.slice(0, Number(questionCount) || 5).map((fact, index) => ({
    id: `draft-${Date.now()}-${index}`,
    prompt: fact.prompt,
    choices: makeChoices({
      correctAnswer: fact.correctAnswer,
      factType: fact.factType,
      pools
    }),
    correctAnswer: fact.correctAnswer,
    explanation: fact.explanation,
    sourceTitle: fact.sourceTitle
  }));
}
