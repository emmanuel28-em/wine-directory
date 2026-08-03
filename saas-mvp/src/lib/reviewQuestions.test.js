import assert from "node:assert/strict";
import test from "node:test";
import { buildReviewQuestionsForDoc, deriveReviewContent } from "./reviewQuestions.js";

function makeDoc(overrides = {}) {
  return {
    id: "piccola-pesca",
    title: "Piccola Pesca",
    type: "cocktail",
    category: "Cocktails",
    contentJson: JSON.stringify({
      summary: "Price: $26",
      body: `Price: $26

Description:
A stone-fruit-forward summer sour with a velvety texture.

Ingredients:
- Nectarine-infused Fred Jerbis Gin
- White Peach Shrub
- Pallini Peachello
- Lemon Juice
- Egg White

Glassware:
Coupe

Garnish:
Marigold flowers

Allergies:
Alcohol, Stone fruit, Citrus, Vinegar, Eggs

Staff talking point:
A floral summer sour with peach-ring flavors and a velvety texture.`,
      reviewQuestions: []
    }),
    ...overrides
  };
}

const comparisonDocs = [
  makeDoc(),
  {
    id: "other-cocktail",
    title: "Other Cocktail",
    type: "cocktail",
    category: "Cocktails",
    contentJson: JSON.stringify({
      summary: "A bitter citrus spritz with herbal notes.",
      allergens: "Alcohol, Citrus",
      ingredients: "Tequila\nGrapefruit\nRosemary",
      glassware: "Collins",
      garnish: "Grapefruit peel"
    })
  }
];

test("extracts core quiz facts from a pasted free-form cocktail spec", () => {
  const content = deriveReviewContent(makeDoc());

  assert.equal(content.summary, "A floral summer sour with peach-ring flavors and a velvety texture.");
  assert.equal(content.allergens, "Alcohol, Stone fruit, Citrus, Vinegar, Eggs");
  assert.match(content.ingredients, /Nectarine-infused Fred Jerbis Gin/);
  assert.equal(content.glassware, "Coupe");
  assert.equal(content.garnish, "Marigold flowers");
});

test("prioritizes one-liner, allergens, and ingredients for food and cocktail reviews", () => {
  const questions = buildReviewQuestionsForDoc(makeDoc(), comparisonDocs, { preferSaved: false });

  assert.equal(questions.length, 5);
  assert.ok(questions.some((question) => /one-liner/i.test(question.prompt)));
  assert.ok(questions.some((question) => /allergens/i.test(question.prompt)));
  assert.ok(questions.filter((question) => /ingredient/i.test(question.prompt)).length >= 2);
  assert.ok(questions.every((question) => !question.choices.some((choice) => /review the training notes option/i.test(choice))));

  const firstIngredientQuestion = questions.find((question) => /ingredient/i.test(question.prompt));
  assert.ok(!firstIngredientQuestion.choices.includes("White Peach Shrub"));
});

test("replaces stale saved questions that do not cover the current tech sheet", () => {
  const staleQuestions = Array.from({ length: 5 }, (_, index) => ({
    prompt: `Generic question ${index + 1}`,
    choices: ["Correct", "Wrong"],
    correctAnswer: "Correct",
    explanation: ""
  }));
  const content = JSON.parse(makeDoc().contentJson);
  content.reviewQuestions = staleQuestions;
  const doc = makeDoc({ contentJson: JSON.stringify(content) });
  const questions = buildReviewQuestionsForDoc(doc, [doc, ...comparisonDocs.slice(1)]);

  assert.ok(questions.some((question) => /one-liner/i.test(question.prompt)));
  assert.ok(questions.some((question) => /allergens/i.test(question.prompt)));
  assert.ok(questions.some((question) => /ingredient/i.test(question.prompt)));
});
