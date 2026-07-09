import { rezdoraExistingTrainingContent } from "../legacy/rezdoraExistingTrainingContent.js";
import { getDataClient } from "./dataClient.js";
import { listCollectionsForRestaurant, saveCollection } from "./collections.js";
import { listTrainingDocsForRestaurant } from "./trainingDocs.js";

const categoryDefinitions = {
  "Dinner Menu": {
    name: "Dinner Menu",
    description: "Dinner menu dishes and service notes.",
    categoryType: "foodMenu",
    sortOrder: 10
  },
  "Lunch Menu": {
    name: "Lunch Menu",
    description: "Lunch menu dishes and service notes.",
    categoryType: "foodMenu",
    sortOrder: 20
  },
  "Brunch Menu": {
    name: "Brunch Menu",
    description: "Brunch menu dishes and service notes.",
    categoryType: "foodMenu",
    sortOrder: 30
  },
  "Pasta Tasting Menu": {
    name: "Pasta Tasting Menu",
    description: "Pasta tasting courses and wine pairing notes.",
    categoryType: "foodMenu",
    sortOrder: 40
  },
  "BTG Wines": {
    name: "BTG Wines",
    description: "By-the-glass wine training notes.",
    categoryType: "wine",
    sortOrder: 50
  },
  Cocktails: {
    name: "Cocktails",
    description: "Cocktail specs, ingredients, allergens, and talking points.",
    categoryType: "cocktail",
    sortOrder: 60
  },
  "Food Items": {
    name: "Food Items",
    description: "General food training notes.",
    categoryType: "foodMenu",
    sortOrder: 70
  }
};

function compact(items) {
  return items.filter((item) => item !== undefined && item !== null && String(item).trim() !== "");
}

function joinList(value) {
  return Array.isArray(value) ? value.filter(Boolean).join(", ") : value || "";
}

function getOldType(item) {
  return item.type || "wine";
}

function getContentType(item) {
  const oldType = getOldType(item);

  if (oldType === "food") {
    return "foodItem";
  }

  if (oldType === "pastaTasting") {
    return "tastingMenuCourse";
  }

  if (oldType === "cocktail") {
    return "cocktail";
  }

  if (oldType === "wine") {
    return "wine";
  }

  return "custom";
}

function getModelType(item) {
  const oldType = getOldType(item);

  if (["wine", "cocktail", "food", "pastaTasting"].includes(oldType)) {
    return oldType;
  }

  return "custom";
}

function getTitle(item) {
  if (getOldType(item) === "wine") {
    return compact([item.producer, item.name, item.vintage]).join(" ");
  }

  return compact([item.name, item.vintage]).join(" ");
}

function getCategoryName(item) {
  const oldType = getOldType(item);

  if (oldType === "cocktail") {
    return "Cocktails";
  }

  if (oldType === "pastaTasting" || item.menuSection === "pairing") {
    return "Pasta Tasting Menu";
  }

  if (oldType === "wine") {
    return "BTG Wines";
  }

  if (oldType === "food") {
    if (item.menu === "Dinner") {
      return "Dinner Menu";
    }

    if (item.menu === "Lunch") {
      return "Lunch Menu";
    }

    if (item.menu === "Brunch") {
      return "Brunch Menu";
    }

    return "Food Items";
  }

  return "Food Items";
}

function makeFact(label, value, questionHint) {
  if (!value || value === "N/A") {
    return null;
  }

  return {
    label,
    value: String(value),
    questionHint,
    quizEligible: true
  };
}

function buildFacts(item) {
  const oldType = getOldType(item);

  if (oldType === "wine") {
    return compact([
      makeFact("Producer", item.producer, "Who produces this wine?"),
      makeFact("Wine Region", item.region, "What region is this wine from?"),
      makeFact("Subregion", item.subregion, "What subregion is this wine from?"),
      makeFact("Grape", joinList(item.grapes), "What grape or grapes are used?"),
      makeFact("Style", item.style, "What style is this wine?"),
      makeFact("Farming", item.farming, "What farming practice should staff know?"),
      makeFact("Vintage", item.vintage, "What vintage is this wine?")
    ]);
  }

  if (oldType === "cocktail") {
    return compact([
      makeFact("Base spirit", item.baseSpirit, "What is the base spirit?"),
      makeFact("Glassware", item.glassware, "What glassware is used?"),
      makeFact("Garnish", item.garnish, "What is the garnish?"),
      makeFact("Allergens", joinList(item.allergies), "What allergens should staff know?"),
      makeFact("Ingredients", joinList(item.ingredients), "What ingredients are in this cocktail?")
    ]);
  }

  return compact([
    makeFact("Allergens", joinList(item.allergies), `What allergens are in ${item.name}?`),
    makeFact("Ingredients", joinList(item.ingredients), `What ingredients should staff know for ${item.name}?`),
    makeFact("Mise", item.mise, "What mise is needed?"),
    makeFact("Wine pairing", joinList(item.winePairings), "What wine pairing should staff know?")
  ]);
}

function buildContentJson(item) {
  const oldType = getOldType(item);
  const tags = compact([
    oldType,
    item.status,
    item.menu,
    item.course,
    item.category,
    item.region,
    item.style,
    ...(item.grapes || [])
  ]);
  const facts = buildFacts(item);

  return JSON.stringify({
    source: "original-static-training-site",
    originalStatus: item.status || "current",
    contentType: getContentType(item),
    tags,
    summary: item.oneLiner || item.menuDescription || "",
    body: item.details || item.description || "",
    details: item.details || "",
    allergens: joinList(item.allergies),
    ingredients: joinList(item.ingredients || item.grapes),
    talkingPoints: item.pairing || item.talkingPoints || "",
    serviceNotes: compact([
      item.menuDescription ? `Menu description: ${item.menuDescription}` : "",
      item.price ? `Price: ${item.price}` : "",
      item.farming ? `Farming: ${item.farming}` : "",
      item.method ? `Method: ${item.method}` : "",
      item.glassware ? `Glassware: ${item.glassware}` : "",
      item.garnish ? `Garnish: ${item.garnish}` : "",
      item.mise ? `Mise: ${item.mise}` : "",
      item.pronunciation ? `Pronunciation: ${item.pronunciation}` : ""
    ]).join("\n"),
    testableStaffKnowledge: facts,
    quizFacts: facts
  });
}

async function ensureCategories({ restaurantId, userProfileId }) {
  const existing = await listCollectionsForRestaurant(restaurantId, { includeArchived: true });
  const byName = new Map(existing.map((collection) => [collection.name, collection]));

  for (const definition of Object.values(categoryDefinitions)) {
    if (!byName.has(definition.name)) {
      const created = await saveCollection({
        collection: {
          ...definition,
          status: "active"
        },
        restaurantId,
        userProfileId
      });
      byName.set(created.name, created);
    }
  }

  return byName;
}

export async function importExistingRestaurantContent({ restaurantId, userProfileId, items = rezdoraExistingTrainingContent }) {
  const dataClient = getDataClient();
  const existingDocs = await listTrainingDocsForRestaurant(restaurantId);
  const existingKeys = new Set(existingDocs.map((doc) => `${doc.title}|${doc.type}`.toLowerCase()));
  const categoriesByName = await ensureCategories({ restaurantId, userProfileId });
  let createdCount = 0;
  let skippedCount = 0;

  for (const item of items) {
    const title = getTitle(item);
    const type = getModelType(item);
    const duplicateKey = `${title}|${type}`.toLowerCase();

    if (existingKeys.has(duplicateKey)) {
      skippedCount += 1;
      continue;
    }

    const categoryName = getCategoryName(item);
    const collection = categoriesByName.get(categoryName);

    const result = await dataClient.models.TrainingDoc.create({
      restaurantId,
      collectionId: collection?.id || null,
      type,
      title,
      category: compact([item.menu, item.course, item.category, item.menuSection]).join(" / "),
      status: "published",
      contentJson: buildContentJson(item),
      imageKeys: [],
      createdBy: userProfileId,
      updatedBy: userProfileId
    });

    if (result.errors?.length) {
      throw new Error(result.errors.map((error) => error.message).join(" "));
    }

    existingKeys.add(duplicateKey);
    createdCount += 1;
  }

  return {
    createdCount,
    skippedCount,
    totalSourceItems: items.length
  };
}
