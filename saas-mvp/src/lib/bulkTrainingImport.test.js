import test from "node:test";
import assert from "node:assert/strict";
import { parseBulkTrainingMaterial } from "./bulkTrainingImport.js";

test("parses multiple restaurant food tech sheets", () => {
  const result = parseBulkTrainingMaterial(`Burrata Reale

Menu description:
Maitake mushroom, black truffle, parsley

Oneliner:
Our burrata with maitake and truffle puree.

Allergies
Dairy, Mushroom

Ingredients
Burrata
Roasted maitake

Details
Burrata is filled with truffle mushroom puree.

Gnocco Fritto

Menu description:
Prosciutto di Parma, mortadella, and guanciale

Oneliner:
Fried dough with salumi.

Allergies
Pork, Gluten, Dairy

Ingredients
Mortadella
Prosciutto
Guanciale`);

  assert.equal(result.length, 2);
  assert.equal(result[0].title, "Burrata Reale");
  assert.equal(result[0].contentType, "foodItem");
  assert.equal(result[0].allergens, "Dairy, Mushroom");
  assert.match(result[0].body, /truffle mushroom puree/);
  assert.equal(result[1].title, "Gnocco Fritto");
});

test("parses a wine tech sheet into testable facts", () => {
  const [wine] = parseBulkTrainingMaterial(`Pra Monte Grande Soave Classico 2023

Producer: Pra
Varietal: 70% Garganega, 30% Trebbiano di Soave
Region: Veneto
Subregion: Soave Classico
Farming Practices: Certified Organic
Vintage: 2023
One Liner: An unctuous but refreshing Soave.
300-level: A benchmark expression from a single parcel.`);

  const facts = JSON.parse(wine.quizFactsJson);
  assert.equal(wine.contentType, "wine");
  assert.equal(wine.summary, "An unctuous but refreshing Soave.");
  assert.ok(facts.some((fact) => fact.label === "Region" && fact.value === "Veneto"));
  assert.ok(facts.some((fact) => fact.label === "Grape" && fact.value.includes("Garganega")));
});

test("keeps unknown text as a custom draft", () => {
  const [draft] = parseBulkTrainingMaterial("Opening Procedure\nArrive thirty minutes before service and check the reservation book.");

  assert.equal(draft.title, "Opening Procedure");
  assert.equal(draft.contentType, "custom");
  assert.match(draft.body, /reservation book/);
});

