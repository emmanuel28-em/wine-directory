const headingAliases = new Map([
  ["menudescription", "menuDescription"],
  ["oneliner", "oneLiner"],
  ["description", "description"],
  ["details", "details"],
  ["300level", "details"],
  ["mise", "mise"],
  ["winepairing", "winePairings"],
  ["winepairings", "winePairings"],
  ["allergies", "allergens"],
  ["allergens", "allergens"],
  ["ingredients", "ingredients"],
  ["producer", "producer"],
  ["varietal", "grape"],
  ["grape", "grape"],
  ["region", "region"],
  ["subregion", "subregion"],
  ["farmingpractices", "farming"],
  ["farming", "farming"],
  ["vintage", "vintage"],
  ["price", "price"],
  ["glassware", "glassware"],
  ["garnish", "garnish"],
  ["basespirit", "baseSpirit"],
  ["talkingpoints", "talkingPoints"],
  ["servicenotes", "serviceNotes"]
]);

const likelyFirstHeadings = new Set(["menuDescription", "producer", "oneLiner"]);

function normalizeHeading(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

function matchHeading(line) {
  const trimmed = line.trim();
  const colonMatch = trimmed.match(/^([^:]{2,45}):\s*(.*)$/);

  if (colonMatch) {
    const key = headingAliases.get(normalizeHeading(colonMatch[1]));
    return key ? { key, value: colonMatch[2].trim() } : null;
  }

  const key = headingAliases.get(normalizeHeading(trimmed));
  return key ? { key, value: "" } : null;
}

function nextNonEmptyLine(lines, startIndex) {
  for (let index = startIndex; index < lines.length; index += 1) {
    if (lines[index].trim()) {
      return { index, value: lines[index].trim() };
    }
  }

  return null;
}

function isLikelyTitleStart(lines, index) {
  const line = lines[index].trim();

  if (!line || line === "---" || line.startsWith("(") || matchHeading(line)) {
    return false;
  }

  const previousIsBlank = index === 0 || !lines[index - 1].trim() || lines[index - 1].trim() === "---";
  const nextLine = nextNonEmptyLine(lines, index + 1);
  const nextHeading = nextLine ? matchHeading(nextLine.value) : null;

  return previousIsBlank && line.length <= 180 && Boolean(nextHeading && likelyFirstHeadings.has(nextHeading.key));
}

function splitIntoBlocks(sourceText) {
  const lines = sourceText.replace(/\r\n?/g, "\n").split("\n");
  const starts = [];

  lines.forEach((line, index) => {
    if (isLikelyTitleStart(lines, index)) {
      starts.push(index);
    }
  });

  if (starts.length === 0) {
    const firstContentIndex = lines.findIndex((line) => line.trim() && line.trim() !== "---");
    return firstContentIndex === -1 ? [] : [lines.slice(firstContentIndex).join("\n").trim()];
  }

  return starts
    .map((start, position) => {
      const end = starts[position + 1] ?? lines.length;
      return lines.slice(start, end).join("\n").replace(/^---\s*/m, "").trim();
    })
    .filter(Boolean);
}

function appendField(fields, key, value) {
  const cleanValue = value.trim();

  if (!cleanValue) {
    return;
  }

  fields[key] = fields[key] ? `${fields[key]}\n${cleanValue}` : cleanValue;
}

function parseBlock(block) {
  const lines = block.split("\n");
  const firstHeadingIndex = lines.findIndex((line) => matchHeading(line));
  const titleLines = (firstHeadingIndex === -1 ? lines.slice(0, 1) : lines.slice(0, firstHeadingIndex))
    .map((line) => line.trim())
    .filter(Boolean);
  const title = (titleLines[0] || "Untitled Training Page").replace(/^#+\s*/, "");
  const fields = {};
  let currentKey = "";

  if (titleLines.length > 1) {
    appendField(fields, "ingredients", titleLines.slice(1).join("\n"));
  }

  lines.slice(Math.max(firstHeadingIndex, 1)).forEach((line) => {
    const heading = matchHeading(line);

    if (heading) {
      currentKey = heading.key;
      appendField(fields, currentKey, heading.value);
      return;
    }

    if (currentKey) {
      appendField(fields, currentKey, line);
    }
  });

  return { title, fields, sourceText: block };
}

function inferContentType(fields) {
  if (fields.producer || fields.grape || fields.region || fields.vintage) {
    return "wine";
  }

  if (fields.glassware || fields.garnish || fields.baseSpirit) {
    return "cocktail";
  }

  if (fields.menuDescription || fields.mise || fields.allergens || fields.ingredients) {
    return "foodItem";
  }

  return "custom";
}

function inferSuggestedCollection({ contentType, sourceText }) {
  const normalizedSource = sourceText.toLowerCase();

  if (normalizedSource.includes("brunch")) {
    return { name: "Brunch Menu", categoryType: "foodMenu" };
  }

  if (normalizedSource.includes("lunch")) {
    return { name: "Lunch Menu", categoryType: "foodMenu" };
  }

  if (normalizedSource.includes("dinner")) {
    return { name: "Dinner Menu", categoryType: "foodMenu" };
  }

  if (normalizedSource.includes("pasta tasting") || normalizedSource.includes("wine pairing") || normalizedSource.includes("course 1")) {
    return { name: "Pasta Tasting", categoryType: "foodMenu" };
  }

  if (contentType === "cocktail") {
    return { name: "Cocktails", categoryType: "cocktail" };
  }

  if (contentType === "wine") {
    if (normalizedSource.includes("btg") || normalizedSource.includes("glass")) {
      return { name: "BTG Wines", categoryType: "wine" };
    }

    return { name: "Wines", categoryType: "wine" };
  }

  if (normalizedSource.includes("sop") || normalizedSource.includes("procedure") || normalizedSource.includes("opening")) {
    return { name: "SOPs", categoryType: "sop" };
  }

  if (contentType === "foodItem") {
    return { name: "Food Menu", categoryType: "foodMenu" };
  }

  return { name: "Training Library", categoryType: "custom" };
}

function inferCategory(sourceText) {
  const normalizedSource = sourceText.toLowerCase();

  if (normalizedSource.includes("antipasta") || normalizedSource.includes("antipasti")) return "Antipasta";
  if (normalizedSource.includes("primi")) return "Primi";
  if (normalizedSource.includes("secondi")) return "Secondi";
  if (normalizedSource.includes("verdure")) return "Verdure";
  if (normalizedSource.includes("course 1")) return "Course 1";
  if (normalizedSource.includes("course 2")) return "Course 2";
  if (normalizedSource.includes("course 3")) return "Course 3";
  if (normalizedSource.includes("course 4")) return "Course 4";
  if (normalizedSource.includes("course 5")) return "Course 5";

  return "";
}

function firstParagraph(value) {
  return (value || "").split(/\n\s*\n/)[0].trim();
}

function buildServiceNotes(fields) {
  return [
    ["Menu description", fields.menuDescription],
    ["Mise", fields.mise],
    ["Wine pairing", fields.winePairings],
    ["Glassware", fields.glassware],
    ["Garnish", fields.garnish],
    ["Price", fields.price]
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
}

function buildQuizFacts(contentType, fields) {
  const candidates = [];

  if (contentType === "wine") {
    candidates.push(
      ["Producer", fields.producer, "Who produces this wine?"],
      ["Grape", fields.grape, "What grape or blend is used?"],
      ["Region", fields.region, "What region is this wine from?"],
      ["Subregion", fields.subregion, "What subregion is this wine from?"],
      ["Farming", fields.farming, "What farming practices are used?"],
      ["Vintage", fields.vintage, "What is the vintage?"]
    );
  }

  if (contentType === "foodItem" || contentType === "cocktail") {
    candidates.push(
      ["Allergens", fields.allergens, "What allergens should staff know?"],
      ["Ingredients", fields.ingredients, "What ingredients should staff know?"],
      ["Glassware", fields.glassware, "What glassware is used?"],
      ["Garnish", fields.garnish, "What is the garnish?"]
    );
  }

  return candidates
    .filter(([, value]) => value)
    .map(([label, value, questionHint]) => ({ label, value, questionHint, quizEligible: true }));
}

function toDraft(parsedBlock, index) {
  const { fields } = parsedBlock;
  const contentType = inferContentType(fields);
  const suggestedCollection = inferSuggestedCollection({ contentType, sourceText: parsedBlock.sourceText });
  const summary = fields.oneLiner || fields.menuDescription || firstParagraph(fields.description);
  const body = fields.details || fields.description || parsedBlock.sourceText;
  const tags = contentType === "foodItem" ? "food, menu" : contentType === "wine" ? "wine, beverage" : contentType === "cocktail" ? "cocktail, beverage" : "imported";

  return {
    importId: `import-${Date.now()}-${index}`,
    selected: true,
    collectionId: "",
    suggestedCollectionName: suggestedCollection.name,
    suggestedCollectionType: suggestedCollection.categoryType,
    contentType,
    title: parsedBlock.title,
    category: inferCategory(parsedBlock.sourceText),
    status: "draft",
    tags,
    summary,
    body,
    details: "",
    allergens: fields.allergens || "",
    ingredients: fields.ingredients || fields.grape || "",
    talkingPoints: fields.talkingPoints || fields.oneLiner || "",
    serviceNotes: [buildServiceNotes(fields), fields.serviceNotes].filter(Boolean).join("\n"),
    quizFactsJson: JSON.stringify(buildQuizFacts(contentType, fields)),
    sourceText: parsedBlock.sourceText
  };
}

export function parseBulkTrainingMaterial(sourceText) {
  if (!sourceText?.trim()) {
    return [];
  }

  return splitIntoBlocks(sourceText).map(parseBlock).map(toDraft);
}
