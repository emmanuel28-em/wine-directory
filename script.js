// Training content comes from data.js. The old variable name is still "wineDirectoryData"
// for compatibility, but the list now includes wines, cocktails, and food.
const wines = window.wineDirectoryData || [];

const searchInput = document.querySelector("#searchInput");
const clearFilters = document.querySelector("#clearFilters");
const quizMode = document.querySelector("#quizMode");
const wineGrid = document.querySelector("#wineGrid");
const resultCount = document.querySelector("#resultCount");
const mainTabs = document.querySelectorAll(".main-tab");
const sectionTabs = document.querySelectorAll(".section-tab");
const foodTopics = document.querySelector("#foodTopics");
const beverageTopics = document.querySelector("#beverageTopics");
const sectionTitle = document.querySelector("#sectionTitle");
const sectionDescription = document.querySelector("#sectionDescription");
const toolbar = document.querySelector(".toolbar");
const quizPanel = document.querySelector("#quizPanel");
const quizTopic = document.querySelector("#quizTopic");
const quizLevel = document.querySelector("#quizLevel");
const quizProgress = document.querySelector("#quizProgress");
const quizScore = document.querySelector("#quizScore");
const quizQuestion = document.querySelector("#quizQuestion");
const quizChoices = document.querySelector("#quizChoices");
const quizFeedback = document.querySelector("#quizFeedback");
const nextQuestion = document.querySelector("#nextQuestion");
const restartQuiz = document.querySelector("#restartQuiz");
const resetMastery = document.querySelector("#resetMastery");
const masterySummary = document.querySelector("#masterySummary");
const masteryFill = document.querySelector("#masteryFill");

let quizQuestions = [];
let currentQuestionIndex = 0;
let quizScoreCount = 0;
let hasAnsweredCurrentQuestion = false;
let activeGroup = "beverage";
let activeSection = "beverage-wine-btg";
let masteryState = loadMasteryState();

const quizLevels = {
  wine: {
    basic: {
      label: "Basic",
      goal: 2,
      questionTypes: ["grape", "region", "style"]
    },
    intermediate: {
      label: "Intermediate",
      goal: 2,
      questionTypes: ["grape", "region", "subregion", "style"]
    },
    expert: {
      label: "Expert",
      goal: 3,
      questionTypes: ["grape", "region", "subregion", "style", "oneLiner"]
    }
  },
  cocktail: {
    basic: {
      label: "Basic",
      goal: 2,
      questionTypes: ["baseSpirit", "glassware", "garnish"]
    },
    intermediate: {
      label: "Intermediate",
      goal: 2,
      questionTypes: ["baseSpirit", "ingredient", "allergy", "glassware", "garnish"]
    },
    expert: {
      label: "Expert",
      goal: 3,
      questionTypes: ["baseSpirit", "ingredient", "allergy", "glassware", "garnish", "oneLiner", "talkingPoints"]
    }
  },
  food: {
    basic: {
      label: "Basic",
      goal: 2,
      questionTypes: ["allergy", "mise", "oneLiner"]
    },
    intermediate: {
      label: "Intermediate",
      goal: 2,
      questionTypes: ["allergy", "mise", "ingredient", "oneLiner"]
    },
    expert: {
      label: "Expert",
      goal: 3,
      questionTypes: ["allergy", "mise", "ingredient", "oneLiner", "details"]
    }
  },
  beverage: {
    basic: {
      label: "Basic",
      goal: 2,
      questionTypes: ["category", "oneLiner"]
    },
    intermediate: {
      label: "Intermediate",
      goal: 2,
      questionTypes: ["category", "ingredient", "oneLiner"]
    },
    expert: {
      label: "Expert",
      goal: 3,
      questionTypes: ["category", "ingredient", "oneLiner", "details"]
    }
  }
};

const sections = {
  "beverage-wine-btg": {
    title: "BTG Wines",
    shortLabel: "BTG Wines",
    description: "Current by-the-glass wine tech sheets for service study.",
    countLabel: "BTG wine"
  },
  "beverage-wine-pairing": {
    title: "Wine Pairing Wines",
    shortLabel: "Wine Pairings",
    description: "Wines tied to tasting-menu pairings and specific dish conversations.",
    countLabel: "pairing wine"
  },
  "beverage-wine-bottle": {
    title: "Wines by the Bottle",
    shortLabel: "Bottles",
    description: "Bottle-list study notes will live here when you are ready to add them.",
    countLabel: "bottle wine"
  },
  "beverage-cocktails": {
    title: "Cocktails",
    shortLabel: "Cocktails",
    description: "Current cocktail specs, ingredients, allergies, glassware, and talking points.",
    countLabel: "cocktail"
  },
  "beverage-spirits": {
    title: "Spirits",
    shortLabel: "Spirits",
    description: "Spirit study notes will live here when you are ready to add them.",
    countLabel: "spirit"
  },
  "beverage-grappa": {
    title: "Grappa",
    shortLabel: "Grappa",
    description: "Grappa study notes will live here when you are ready to add them.",
    countLabel: "grappa"
  },
  "beverage-amari": {
    title: "Amari",
    shortLabel: "Amari",
    description: "Amari study notes will live here when you are ready to add them.",
    countLabel: "amaro"
  },
  "food-brunch-antipasta": {
    title: "Brunch Antipasta",
    shortLabel: "Antipasta",
    description: "Brunch antipasta dish notes will live here when you add them.",
    countLabel: "food item"
  },
  "food-brunch-primi": {
    title: "Brunch Primi",
    shortLabel: "Primi",
    description: "Brunch primi dish notes will live here when you add them.",
    countLabel: "food item"
  },
  "food-brunch-secondi": {
    title: "Brunch Secondi",
    shortLabel: "Secondi",
    description: "Brunch secondi dish notes will live here when you add them.",
    countLabel: "food item"
  },
  "food-brunch-verdure": {
    title: "Brunch Verdure",
    shortLabel: "Verdure",
    description: "Brunch vegetable dish notes will live here when you add them.",
    countLabel: "food item"
  },
  "food-lunch-antipasta": {
    title: "Lunch Antipasta",
    shortLabel: "Antipasta",
    description: "Lunch antipasta dish notes will live here when you add them.",
    countLabel: "food item"
  },
  "food-lunch-primi": {
    title: "Lunch Primi",
    shortLabel: "Primi",
    description: "Lunch primi dish notes will live here when you add them.",
    countLabel: "food item"
  },
  "food-lunch-secondi": {
    title: "Lunch Secondi",
    shortLabel: "Secondi",
    description: "Lunch secondi dish notes will live here when you add them.",
    countLabel: "food item"
  },
  "food-lunch-verdure": {
    title: "Lunch Verdure",
    shortLabel: "Verdure",
    description: "Lunch vegetable dish notes will live here when you add them.",
    countLabel: "food item"
  },
  "food-dinner-antipasta": {
    title: "Dinner Antipasta",
    shortLabel: "Antipasta",
    description: "Dinner antipasta dish notes, allergens, mise, ingredients, pronunciation, and menu language.",
    countLabel: "food item"
  },
  "food-dinner-primi": {
    title: "Dinner Primi",
    shortLabel: "Primi",
    description: "Dinner primi dish notes will live here when you add them.",
    countLabel: "food item"
  },
  "food-dinner-secondi": {
    title: "Dinner Secondi",
    shortLabel: "Secondi",
    description: "Dinner secondi dish notes will live here when you add them.",
    countLabel: "food item"
  },
  "food-dinner-verdure": {
    title: "Dinner Verdure",
    shortLabel: "Verdure",
    description: "Dinner vegetable dish notes will live here when you add them.",
    countLabel: "food item"
  }
};

function uniqueSorted(items) {
  return [...new Set(items)].sort((a, b) => a.localeCompare(b));
}

function addOptions(selectElement, values) {
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectElement.append(option);
  });
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function formatWineName(wine) {
  return [wine.producer, wine.name, wine.vintage].filter(Boolean).join(" ");
}

function getUniqueWineValues(getValue) {
  return uniqueSorted(getQuizWines().map(getValue).filter(isQuizAnswerUsable));
}

function getUniqueGrapes() {
  return uniqueSorted(getQuizWines().flatMap((wine) => wine.grapes || []).filter(isQuizAnswerUsable));
}

function getUniqueWineListValues(getValue) {
  return uniqueSorted(getQuizWines().map((wine) => normalizeAnswer(getValue(wine))).filter(isQuizAnswerUsable));
}

function getWrongAnswers(correctAnswer, possibleAnswers) {
  if (!isQuizAnswerUsable(correctAnswer)) {
    return [];
  }

  return shuffle(possibleAnswers.filter((answer) => isQuizAnswerUsable(answer) && answer !== correctAnswer)).slice(0, 3);
}

function normalizeAnswer(answer) {
  return Array.isArray(answer) ? answer.filter(isQuizAnswerUsable).join(", ") : answer;
}

function isQuizAnswerUsable(answer) {
  if (answer === null || answer === undefined) {
    return false;
  }

  const text = String(answer).trim();
  return text !== "" && text.toLowerCase() !== "n/a";
}

function getItemId(item) {
  return [getBeverageType(item), item.producer, item.name, item.vintage].filter(Boolean).join("|");
}

function getCurrentLevelConfig() {
  return quizLevels[getQuizKind()][quizLevel.value];
}

function getCurrentMasteryGoal() {
  return getCurrentLevelConfig().goal;
}

function getTopicKey(item, questionType) {
  return `${quizTopic.value}::${quizLevel.value}::${getItemId(item)}::${questionType}`;
}

function loadMasteryState() {
  try {
    // localStorage keeps mastery progress on this browser only.
    // This is not real user tracking yet; it resets if the browser data is cleared.
    return JSON.parse(localStorage.getItem("rezdoraMasteryV1")) || {};
  } catch {
    return {};
  }
}

function saveMasteryState() {
  // Save quiz progress locally so the staff member can keep building mastery
  // without needing a login or database in this static version.
  localStorage.setItem("rezdoraMasteryV1", JSON.stringify(masteryState));
}

function getTopicProgress(item, questionType) {
  return masteryState[getTopicKey(item, questionType)] || { correct: 0, attempts: 0, streak: 0, mastered: false };
}

function getQuizItems() {
  return getItemsForSection(quizTopic.value);
}

function getQuestionTypesForCurrentQuiz() {
  return getCurrentLevelConfig().questionTypes;
}

function getMasteryStats() {
  const items = getQuizItems();
  const questionTypes = getQuestionTypesForCurrentQuiz();
  const masteryGoal = getCurrentMasteryGoal();
  const total = items.length * questionTypes.length;
  let mastered = 0;
  let progressSteps = 0;

  items.forEach((item) => {
    questionTypes.forEach((questionType) => {
      const progress = getTopicProgress(item, questionType);
      if (progress.mastered) {
        mastered += 1;
      }
      progressSteps += Math.min(progress.streak, masteryGoal);
    });
  });

  return {
    mastered,
    total,
    progressSteps,
    totalSteps: total * masteryGoal
  };
}

function updateMasteryDisplay() {
  const { mastered, total, progressSteps, totalSteps } = getMasteryStats();
  const percent = totalSteps ? Math.round((progressSteps / totalSteps) * 100) : 0;
  const level = getCurrentLevelConfig();

  masterySummary.textContent = `${level.label}: ${progressSteps} of ${totalSteps} mastery steps complete. ${mastered} of ${total} topics mastered.`;
  masteryFill.style.width = `${percent}%`;
}

function updateTopicMastery(question, isCorrect) {
  const progress = getTopicProgress(question.item, question.type);

  progress.attempts += 1;
  if (isCorrect) {
    progress.correct += 1;
    progress.streak += 1;
  } else {
    progress.streak = 0;
  }

  progress.mastered = progress.streak >= getCurrentMasteryGoal();
  masteryState[getTopicKey(question.item, question.type)] = progress;
  saveMasteryState();
  updateMasteryDisplay();
}

function getWineStatus(wine) {
  return wine.status || "current";
}

function getWineStatusLabel(wine) {
  if (getWineStatus(wine) === "previous") {
    return "Previous";
  }

  if (getWineStatus(wine) === "off-menu") {
    return "Off Menu";
  }

  return "Current";
}

function getStatusBadgeClass(item) {
  const status = getWineStatus(item);
  return status === "current" ? "" : status;
}

function getBeverageType(item) {
  return item.type || "wine";
}

function getTypeLabel(item) {
  if (getBeverageType(item) === "cocktail") {
    return "Cocktail";
  }

  if (getBeverageType(item) === "food") {
    return "Food";
  }

  if (getBeverageType(item) === "spirit") {
    return "Spirit";
  }

  if (getBeverageType(item) === "grappa") {
    return "Grappa";
  }

  if (getBeverageType(item) === "amaro") {
    return "Amaro";
  }

  return "Wine";
}

function getQuizWines() {
  return wines.filter((item) => getBeverageType(item) === "wine");
}

function getQuizCocktails() {
  return wines.filter((item) => getBeverageType(item) === "cocktail");
}

function getMenuSection(item) {
  return item.menuSection || "btg";
}

function getFoodMenu(item) {
  return (item.menu || "dinner").toLowerCase();
}

function getFoodCourse(item) {
  return (item.course || item.category || "").toLowerCase();
}

function foodMatchesSection(item, sectionName = activeSection) {
  const [, menu, course] = sectionName.split("-");
  return getBeverageType(item) === "food" && getFoodMenu(item) === menu && getFoodCourse(item) === course;
}

function getSectionKind(sectionName) {
  if (sectionName.startsWith("food-")) {
    return "food";
  }

  if (sectionName === "beverage-cocktails") {
    return "cocktail";
  }

  if (["beverage-spirits", "beverage-grappa", "beverage-amari"].includes(sectionName)) {
    return "beverage";
  }

  return "wine";
}

function getQuizKind() {
  return getSectionKind(quizTopic.value);
}

function itemMatchesSection(item, sectionName) {
  return (
    (sectionName === "beverage-wine-btg" && getBeverageType(item) === "wine" && getMenuSection(item) !== "pairing" && getMenuSection(item) !== "bottle" && getWineStatus(item) === "current") ||
    (sectionName === "beverage-wine-pairing" && getBeverageType(item) === "wine" && getMenuSection(item) === "pairing") ||
    (sectionName === "beverage-wine-bottle" && getBeverageType(item) === "wine" && getMenuSection(item) === "bottle" && getWineStatus(item) === "current") ||
    (sectionName === "beverage-cocktails" && getBeverageType(item) === "cocktail" && getWineStatus(item) === "current") ||
    (sectionName === "beverage-spirits" && getBeverageType(item) === "spirit" && getWineStatus(item) === "current") ||
    (sectionName === "beverage-grappa" && getBeverageType(item) === "grappa" && getWineStatus(item) === "current") ||
    (sectionName === "beverage-amari" && getBeverageType(item) === "amaro" && getWineStatus(item) === "current") ||
    (sectionName.startsWith("food-") && foodMatchesSection(item, sectionName))
  );
}

function getCourseNumber(item) {
  const match = String(item.course || "").match(/\d+/);
  return match ? Number(match[0]) : 999;
}

function getItemsForSection(sectionName) {
  return wines.filter((item) => itemMatchesSection(item, sectionName));
}

function getUniqueCocktailValues(getValue) {
  return uniqueSorted(getQuizCocktails().map(getValue).filter(isQuizAnswerUsable));
}

function getUniqueIngredients() {
  return uniqueSorted(getQuizCocktails().flatMap((cocktail) => cocktail.ingredients || []).filter(isQuizAnswerUsable));
}

function getUniqueAllergies() {
  return uniqueSorted(getQuizCocktails().flatMap((cocktail) => cocktail.allergies || []).filter(isQuizAnswerUsable));
}

function getUniqueCocktailListValues(getValue) {
  return uniqueSorted(getQuizCocktails().map((cocktail) => normalizeAnswer(getValue(cocktail))).filter(isQuizAnswerUsable));
}

function buildFilters() {
  sectionTabs.forEach((tab) => {
    const section = sections[tab.dataset.section];
    if (!section) {
      return;
    }

    const count = getItemsForSection(tab.dataset.section).length;
    tab.textContent = count ? `${section.shortLabel || section.title} (${count})` : section.shortLabel || section.title;
  });

  quizTopic.innerHTML = "";
  Object.entries(sections).forEach(([sectionName, section]) => {
    const option = document.createElement("option");
    option.value = sectionName;
    option.textContent = section.title;
    quizTopic.append(option);
  });

  quizTopic.value = activeSection;
}

function wineMatchesSearch(wine, searchTerm) {
  const searchableText = [
    getTypeLabel(wine),
    wine.name,
    wine.producer,
    wine.vintage,
    wine.category,
    wine.baseSpirit,
    wine.replaces,
    getWineStatusLabel(wine),
    wine.region,
    wine.subregion,
    wine.style,
    wine.body,
    wine.farming,
    wine.price,
    wine.method,
    wine.glassware,
    wine.garnish,
    wine.menuDescription,
    wine.menu,
    wine.course,
    wine.pronunciation,
    wine.mise,
    ...(wine.allergies || []),
    wine.oneLiner,
    wine.details,
    wine.pairing,
    ...(wine.winePairings || []),
    ...(wine.grapes || []),
    ...(wine.ingredients || [])
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(searchTerm);
}

function getFilteredWines() {
  const searchTerm = searchInput.value.trim().toLowerCase();

  const filteredItems = wines.filter((wine) => {
    const sectionMatches = itemMatchesSection(wine, activeSection);
    const searchMatches = !searchTerm || wineMatchesSearch(wine, searchTerm);

    return sectionMatches && searchMatches;
  });

  // Wine pairings are tied to the tasting menu, so we sort them by course number.
  if (activeSection === "beverage-wine-pairing") {
    return filteredItems.sort((a, b) => {
      const statusSort = getWineStatus(a) === getWineStatus(b) ? 0 : getWineStatus(a) === "current" ? -1 : 1;
      return statusSort || getCourseNumber(a) - getCourseNumber(b) || a.name.localeCompare(b.name);
    });
  }

  return filteredItems;
}

function renderWines() {
  const filteredWines = getFilteredWines();
  const section = sections[activeSection];

  sectionTitle.textContent = section.title;
  sectionDescription.textContent = section.description;
  resultCount.textContent = `Showing ${filteredWines.length} ${filteredWines.length === 1 ? section.countLabel : `${section.countLabel}s`}`;
  wineGrid.innerHTML = "";

  if (filteredWines.length === 0) {
    wineGrid.innerHTML = `<div class="empty-state">No items match the current filters.</div>`;
    return;
  }

  // Each matching item becomes one card. The card template changes based on item type.
  filteredWines.forEach((wine) => {
    const card = document.createElement("article");
    card.className = "wine-card";

    if (getBeverageType(wine) === "cocktail") {
      card.innerHTML = renderCocktailCard(wine);
    } else if (getBeverageType(wine) === "food") {
      card.innerHTML = renderFoodCard(wine);
    } else {
      card.innerHTML = renderWineCard(wine);
    }

    wineGrid.append(card);
  });
}

function renderWineCard(wine) {
  return `
    ${wine.image ? `<img class="bottle-photo" src="${wine.image}" alt="Bottle of ${wine.producer} ${wine.name}" />` : ""}

    <div>
      <span class="status-badge ${getStatusBadgeClass(wine)}">${getWineStatusLabel(wine)}</span>
      <span class="type-badge">Wine</span>
      <h3>${wine.name} ${wine.vintage}</h3>
      <p class="producer">${wine.producer}</p>
    </div>

    <dl class="meta-list">
      ${wine.course ? `
      <div class="meta-row">
        <dt class="meta-label">Course</dt>
        <dd>${wine.course}</dd>
      </div>
      ` : ""}
      <div class="meta-row">
        <dt class="meta-label">Region</dt>
        <dd>${wine.region}</dd>
      </div>
      <div class="meta-row">
        <dt class="meta-label">Subregion</dt>
        <dd>${wine.subregion}</dd>
      </div>
      <div class="meta-row">
        <dt class="meta-label">Style</dt>
        <dd>${wine.style} / ${wine.body}</dd>
      </div>
      <div class="meta-row">
        <dt class="meta-label">Farming</dt>
        <dd>${wine.farming}</dd>
      </div>
      <div class="meta-row">
        <dt class="meta-label">Price</dt>
        <dd>${wine.price}</dd>
      </div>
    </dl>

    <div class="tag-row">
      ${(wine.grapes || []).map((grape) => `<span class="tag">${grape}</span>`).join("")}
    </div>

    <p class="one-liner">${wine.oneLiner}</p>

    <details class="study-notes">
      <summary>300-level notes</summary>
      <p>${wine.details}</p>
    </details>

    <div class="pairing">
      <h4>Pairing</h4>
      <p>${wine.pairing}</p>
    </div>
  `;
}

function renderCocktailCard(cocktail) {
  return `
    ${cocktail.image ? `<img class="bottle-photo" src="${cocktail.image}" alt="${cocktail.name}" />` : ""}

    <div>
      <span class="status-badge ${getStatusBadgeClass(cocktail)}">${getWineStatusLabel(cocktail)}</span>
      <span class="type-badge cocktail">Cocktail</span>
      <h3>${cocktail.name}</h3>
      <p class="producer">${cocktail.category || cocktail.baseSpirit || "Cocktail"}</p>
    </div>

    <dl class="meta-list">
      <div class="meta-row">
        <dt class="meta-label">Base</dt>
        <dd>${cocktail.baseSpirit || "N/A"}</dd>
      </div>
      <div class="meta-row">
        <dt class="meta-label">Replaces</dt>
        <dd>${cocktail.replaces || "N/A"}</dd>
      </div>
      <div class="meta-row">
        <dt class="meta-label">Method</dt>
        <dd>${cocktail.method || "N/A"}</dd>
      </div>
      <div class="meta-row">
        <dt class="meta-label">Glass</dt>
        <dd>${cocktail.glassware || "N/A"}</dd>
      </div>
      <div class="meta-row">
        <dt class="meta-label">Garnish</dt>
        <dd>${cocktail.garnish || "N/A"}</dd>
      </div>
      <div class="meta-row">
        <dt class="meta-label">Price</dt>
        <dd>${cocktail.price || "N/A"}</dd>
      </div>
      <div class="meta-row">
        <dt class="meta-label">Allergies</dt>
        <dd>${(cocktail.allergies || []).join(", ") || "N/A"}</dd>
      </div>
    </dl>

    <div class="tag-row">
      ${(cocktail.ingredients || []).map((ingredient) => `<span class="tag cocktail-tag">${ingredient}</span>`).join("")}
    </div>

    <p class="one-liner">${cocktail.oneLiner}</p>

    <details class="study-notes">
      <summary>Service notes</summary>
      <p>${cocktail.details}</p>
    </details>

    <div class="pairing">
      <h4>Talking Points</h4>
      <p>${cocktail.pairing}</p>
    </div>
  `;
}

function renderFoodCard(food) {
  return `
    ${food.image ? `<img class="bottle-photo" src="${food.image}" alt="${food.name}" />` : ""}

    <div>
      <span class="status-badge ${getStatusBadgeClass(food)}">${getWineStatusLabel(food)}</span>
      <span class="type-badge food">Food</span>
      <h3>${food.name}</h3>
      <p class="producer">${food.category || "Food"}</p>
      ${food.pronunciation ? `<p class="pronunciation">${food.pronunciation}</p>` : ""}
    </div>

    <p class="menu-description">${food.menuDescription}</p>

    <dl class="meta-list">
      <div class="meta-row">
        <dt class="meta-label">Mise</dt>
        <dd>${food.mise || "N/A"}</dd>
      </div>
      <div class="meta-row">
        <dt class="meta-label">Pairings</dt>
        <dd>${(food.winePairings || []).join(", ") || "N/A"}</dd>
      </div>
      <div class="meta-row">
        <dt class="meta-label">Allergies</dt>
        <dd>${(food.allergies || []).join(", ") || "N/A"}</dd>
      </div>
    </dl>

    <div class="tag-row">
      ${(food.ingredients || []).map((ingredient) => `<span class="tag food-tag">${ingredient}</span>`).join("")}
    </div>

    <p class="one-liner">${food.oneLiner}</p>

    <details class="study-notes">
      <summary>Dish details</summary>
      <p>${food.details}</p>
    </details>
  `;
}

function clearAllFilters() {
  searchInput.value = "";
  renderWines();
}

function setActiveGroup(groupName, options = {}) {
  activeGroup = groupName;

  mainTabs.forEach((tab) => {
    const isActive = tab.dataset.group === groupName;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-current", isActive ? "page" : "false");
  });

  foodTopics.classList.toggle("hidden", groupName !== "food");
  beverageTopics.classList.toggle("hidden", groupName !== "beverage");

  const nextSection = groupName === "food" ? "food-dinner-antipasta" : "beverage-wine-btg";
  setActiveSection(nextSection, options);
}

function setActiveSection(sectionName, options = {}) {
  const shouldExitQuiz = options.exitQuiz !== false;
  activeSection = sectionName;
  quizTopic.value = sectionName;

  sectionTabs.forEach((tab) => {
    const isActive = tab.dataset.section === sectionName;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-current", isActive ? "page" : "false");
  });

  if (shouldExitQuiz && !quizPanel.classList.contains("hidden")) {
    showDirectoryMode();
  }

  renderWines();
}

function buildQuestion(wine, questionType) {
  // Wine quiz questions are generated from the same fields shown on the cards.
  // If a field is blank or "N/A", the quiz skips that question type.
  const questionTypes = {
    grape: {
      prompt: `Which grape is used in ${formatWineName(wine)}?`,
      answer: normalizeAnswer(wine.grapes),
      possibleAnswers: getUniqueWineListValues((item) => item.grapes)
    },
    region: {
      prompt: `Which region is ${formatWineName(wine)} from?`,
      answer: wine.region,
      possibleAnswers: getUniqueWineValues((item) => item.region)
    },
    subregion: {
      prompt: `Which subregion is listed for ${formatWineName(wine)}?`,
      answer: wine.subregion,
      possibleAnswers: getUniqueWineValues((item) => item.subregion)
    },
    style: {
      prompt: `What style is ${formatWineName(wine)}?`,
      answer: wine.style,
      possibleAnswers: getUniqueWineValues((item) => item.style)
    },
    oneLiner: {
      prompt: `Which one-liner belongs to ${formatWineName(wine)}?`,
      answer: wine.oneLiner,
      possibleAnswers: getUniqueWineValues((item) => item.oneLiner)
    }
  };

  const selectedType = questionTypes[questionType];
  if (!isQuizAnswerUsable(selectedType.answer)) {
    return null;
  }

  const wrongAnswers = getWrongAnswers(selectedType.answer, selectedType.possibleAnswers);

  return {
    prompt: selectedType.prompt,
    answer: selectedType.answer,
    choices: shuffle([selectedType.answer, ...wrongAnswers]),
    item: wine,
    type: questionType
  };
}

function buildCocktailQuestion(cocktail, questionType) {
  // Cocktail questions are generated from ingredients, base spirit, glassware,
  // garnish, allergies, one-liner, and talking points.
  const questionTypes = {
    ingredient: {
      prompt: `Which ingredient list belongs to ${cocktail.name}?`,
      answer: normalizeAnswer(cocktail.ingredients),
      possibleAnswers: getUniqueCocktailListValues((item) => item.ingredients)
    },
    baseSpirit: {
      prompt: `What is the base spirit for ${cocktail.name}?`,
      answer: cocktail.baseSpirit,
      possibleAnswers: getUniqueCocktailValues((item) => item.baseSpirit)
    },
    glassware: {
      prompt: `What glassware is listed for ${cocktail.name}?`,
      answer: cocktail.glassware,
      possibleAnswers: getUniqueCocktailValues((item) => item.glassware)
    },
    garnish: {
      prompt: `What is the garnish for ${cocktail.name}?`,
      answer: cocktail.garnish,
      possibleAnswers: getUniqueCocktailValues((item) => item.garnish)
    },
    allergy: {
      prompt: `Which allergies are listed for ${cocktail.name}?`,
      answer: normalizeAnswer(cocktail.allergies),
      possibleAnswers: getUniqueCocktailListValues((item) => item.allergies)
    },
    oneLiner: {
      prompt: `Which one-liner belongs to ${cocktail.name}?`,
      answer: cocktail.oneLiner,
      possibleAnswers: getUniqueCocktailValues((item) => item.oneLiner)
    },
    talkingPoints: {
      prompt: `Which guest-facing talking points belong to ${cocktail.name}?`,
      answer: cocktail.pairing,
      possibleAnswers: getUniqueCocktailValues((item) => item.pairing)
    }
  };

  const selectedType = questionTypes[questionType];
  if (!isQuizAnswerUsable(selectedType.answer)) {
    return null;
  }

  const wrongAnswers = getWrongAnswers(selectedType.answer, selectedType.possibleAnswers);

  return {
    prompt: selectedType.prompt,
    answer: selectedType.answer,
    choices: shuffle([selectedType.answer, ...wrongAnswers]),
    item: cocktail,
    type: questionType
  };
}

function getUniqueFoodValues(getValue) {
  return uniqueSorted(wines.filter((item) => getBeverageType(item) === "food").map(getValue).filter(isQuizAnswerUsable));
}

function getUniqueFoodListValues(getValue) {
  return uniqueSorted(wines.filter((item) => getBeverageType(item) === "food").map((food) => normalizeAnswer(getValue(food))).filter(isQuizAnswerUsable));
}

function buildFoodQuestion(food, questionType) {
  // Food questions are generated from allergy, mise, ingredients, one-liner,
  // and dish details. Missing fields are skipped.
  const questionTypes = {
    allergy: {
      prompt: `Which allergies are listed for ${food.name}?`,
      answer: normalizeAnswer(food.allergies),
      possibleAnswers: getUniqueFoodListValues((item) => item.allergies)
    },
    mise: {
      prompt: `What mise is listed for ${food.name}?`,
      answer: food.mise,
      possibleAnswers: getUniqueFoodValues((item) => item.mise)
    },
    ingredient: {
      prompt: `Which ingredient list belongs to ${food.name}?`,
      answer: normalizeAnswer(food.ingredients),
      possibleAnswers: getUniqueFoodListValues((item) => item.ingredients)
    },
    oneLiner: {
      prompt: `Which one-liner belongs to ${food.name}?`,
      answer: food.oneLiner,
      possibleAnswers: getUniqueFoodValues((item) => item.oneLiner)
    },
    details: {
      prompt: `Which detail belongs to ${food.name}?`,
      answer: food.details,
      possibleAnswers: getUniqueFoodValues((item) => item.details)
    }
  };

  const selectedType = questionTypes[questionType];
  if (!isQuizAnswerUsable(selectedType.answer)) {
    return null;
  }

  const wrongAnswers = getWrongAnswers(selectedType.answer, selectedType.possibleAnswers);

  return {
    prompt: selectedType.prompt,
    answer: selectedType.answer,
    choices: shuffle([selectedType.answer, ...wrongAnswers]),
    item: food,
    type: questionType
  };
}

function getUniqueGenericBeverageValues(getValue) {
  return uniqueSorted(wines.filter((item) => ["spirit", "grappa", "amaro"].includes(getBeverageType(item))).map(getValue).filter(isQuizAnswerUsable));
}

function getUniqueGenericBeverageListValues(getValue) {
  return uniqueSorted(wines.filter((item) => ["spirit", "grappa", "amaro"].includes(getBeverageType(item))).map((item) => normalizeAnswer(getValue(item))).filter(isQuizAnswerUsable));
}

function buildGenericBeverageQuestion(item, questionType) {
  const questionTypes = {
    category: {
      prompt: `What category is ${item.name}?`,
      answer: item.category || getTypeLabel(item),
      possibleAnswers: getUniqueGenericBeverageValues((beverage) => beverage.category || getTypeLabel(beverage))
    },
    ingredient: {
      prompt: `Which ingredient list belongs to ${item.name}?`,
      answer: normalizeAnswer(item.ingredients),
      possibleAnswers: getUniqueGenericBeverageListValues((beverage) => beverage.ingredients)
    },
    oneLiner: {
      prompt: `Which one-liner belongs to ${item.name}?`,
      answer: item.oneLiner,
      possibleAnswers: getUniqueGenericBeverageValues((beverage) => beverage.oneLiner)
    },
    details: {
      prompt: `Which detail belongs to ${item.name}?`,
      answer: item.details,
      possibleAnswers: getUniqueGenericBeverageValues((beverage) => beverage.details)
    }
  };

  const selectedType = questionTypes[questionType];
  if (!isQuizAnswerUsable(selectedType.answer)) {
    return null;
  }

  const wrongAnswers = getWrongAnswers(selectedType.answer, selectedType.possibleAnswers);

  return {
    prompt: selectedType.prompt,
    answer: selectedType.answer,
    choices: shuffle([selectedType.answer, ...wrongAnswers]),
    item,
    type: questionType
  };
}

function createQuizRound() {
  // A quiz round pulls possible questions from the selected section,
  // prioritizes topics that are not mastered yet, then randomizes the order.
  const questionTypes = getQuestionTypesForCurrentQuiz();
  const possibleQuestions = getQuizItems().flatMap((item) =>
    questionTypes.map((questionType) => {
      const quizKind = getQuizKind();
      if (quizKind === "cocktail") {
        return buildCocktailQuestion(item, questionType);
      }
      if (quizKind === "food") {
        return buildFoodQuestion(item, questionType);
      }
      if (quizKind === "beverage") {
        return buildGenericBeverageQuestion(item, questionType);
      }
      return buildQuestion(item, questionType);
    })
  ).filter((question) => question && question.choices.length >= 2);

  const unmastered = possibleQuestions.filter((question) => !getTopicProgress(question.item, question.type).mastered);
  const mastered = possibleQuestions.filter((question) => getTopicProgress(question.item, question.type).mastered);
  const inProgress = unmastered.filter((question) => getTopicProgress(question.item, question.type).streak > 0);
  const notStarted = unmastered.filter((question) => getTopicProgress(question.item, question.type).streak === 0);

  return [...shuffle(inProgress), ...shuffle(notStarted), ...shuffle(mastered)].slice(0, 10);
}

function showDirectoryMode() {
  toolbar.classList.remove("hidden");
  wineGrid.classList.remove("hidden");
  quizPanel.classList.add("hidden");
  quizMode.textContent = "Quiz Mode";
}

function showQuizMode() {
  toolbar.classList.add("hidden");
  wineGrid.classList.add("hidden");
  quizPanel.classList.remove("hidden");
  quizMode.textContent = "Directory Mode";
  updateMasteryDisplay();
  startQuiz();
}

function startQuiz() {
  quizQuestions = createQuizRound();
  currentQuestionIndex = 0;
  quizScoreCount = 0;
  updateMasteryDisplay();
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const currentQuestion = quizQuestions[currentQuestionIndex];
  hasAnsweredCurrentQuestion = false;

  if (!currentQuestion) {
    quizProgress.textContent = "No quiz available";
    quizScore.textContent = "Score: 0";
    quizQuestion.textContent = "There are not enough entries yet to build this quiz.";
    quizFeedback.textContent = "";
    quizChoices.innerHTML = "";
    nextQuestion.disabled = true;
    return;
  }

  quizProgress.textContent = `Question ${currentQuestionIndex + 1} of ${quizQuestions.length}`;
  quizScore.textContent = `Score: ${quizScoreCount}`;
  quizQuestion.textContent = currentQuestion.prompt;
  quizFeedback.textContent = "";
  quizChoices.innerHTML = "";
  nextQuestion.disabled = true;
  nextQuestion.textContent = currentQuestionIndex === quizQuestions.length - 1 ? "See results" : "Next question";

  currentQuestion.choices.forEach((choice) => {
    const choiceButton = document.createElement("button");
    choiceButton.className = "choice-button";
    choiceButton.type = "button";
    choiceButton.textContent = choice;
    choiceButton.addEventListener("click", () => handleQuizAnswer(choice, choiceButton));
    quizChoices.append(choiceButton);
  });
}

function handleQuizAnswer(selectedAnswer, selectedButton) {
  if (hasAnsweredCurrentQuestion) {
    return;
  }

  const currentQuestion = quizQuestions[currentQuestionIndex];
  const isCorrect = selectedAnswer === currentQuestion.answer;
  hasAnsweredCurrentQuestion = true;

  if (isCorrect) {
    const masteryGoal = getCurrentMasteryGoal();
    const nextStreak = getTopicProgress(currentQuestion.item, currentQuestion.type).streak + 1;

    quizScoreCount += 1;
    selectedButton.classList.add("correct");
    quizFeedback.textContent = nextStreak >= masteryGoal
      ? "Correct. This topic is now mastered."
      : `Correct. ${masteryGoal - nextStreak} more correct ${masteryGoal - nextStreak === 1 ? "answer" : "answers"} in a row will master this topic.`;
  } else {
    selectedButton.classList.add("incorrect");
    quizFeedback.textContent = `Not quite. Correct answer: ${currentQuestion.answer}. The mastery streak for this topic resets.`;
  }

  updateTopicMastery(currentQuestion, isCorrect);
  quizScore.textContent = `Score: ${quizScoreCount}`;
  nextQuestion.disabled = false;

  [...quizChoices.querySelectorAll(".choice-button")].forEach((button) => {
    button.disabled = true;

    if (button.textContent === currentQuestion.answer) {
      button.classList.add("correct");
    }
  });
}

function moveToNextQuestion() {
  if (currentQuestionIndex === quizQuestions.length - 1) {
    showQuizResults();
    return;
  }

  currentQuestionIndex += 1;
  renderQuizQuestion();
}

function showQuizResults() {
  const { mastered, total } = getMasteryStats();
  const isFullyMastered = total > 0 && mastered === total;
  const level = getCurrentLevelConfig();

  quizProgress.textContent = "Quiz complete";
  quizScore.textContent = `Final score: ${quizScoreCount} / ${quizQuestions.length}`;
  quizQuestion.textContent = isFullyMastered
    ? `${level.label} badge earned: up to date on current service knowledge.`
    : `You scored ${quizScoreCount} out of ${quizQuestions.length}.`;
  quizChoices.innerHTML = "";
  quizFeedback.textContent = isFullyMastered
    ? `Every required ${level.label.toLowerCase()} topic has met its mastery streak.`
    : "Start a new round to keep building mastery. Unmastered topics will keep showing up first.";
  nextQuestion.disabled = true;
}

function resetCurrentMastery() {
  const items = getQuizItems();
  const questionTypes = getQuestionTypesForCurrentQuiz();

  items.forEach((item) => {
    questionTypes.forEach((questionType) => {
      delete masteryState[getTopicKey(item, questionType)];
    });
  });

  saveMasteryState();
  updateMasteryDisplay();
  startQuiz();
}

searchInput.addEventListener("input", renderWines);

clearFilters.addEventListener("click", clearAllFilters);

mainTabs.forEach((tab) => {
  tab.addEventListener("click", () => setActiveGroup(tab.dataset.group));
});

sectionTabs.forEach((tab) => {
  tab.addEventListener("click", () => setActiveSection(tab.dataset.section));
});

quizMode.addEventListener("click", () => {
  if (quizPanel.classList.contains("hidden")) {
    showQuizMode();
  } else {
    showDirectoryMode();
  }
});

nextQuestion.addEventListener("click", moveToNextQuestion);
restartQuiz.addEventListener("click", startQuiz);
resetMastery.addEventListener("click", resetCurrentMastery);
quizTopic.addEventListener("input", () => {
  const selectedSection = quizTopic.value;
  if (selectedSection.startsWith("food-") && activeGroup !== "food") {
    setActiveGroup("food", { exitQuiz: false });
  } else if (selectedSection.startsWith("beverage-") && activeGroup !== "beverage") {
    setActiveGroup("beverage", { exitQuiz: false });
  }
  setActiveSection(selectedSection, { exitQuiz: false });
  startQuiz();
});
quizLevel.addEventListener("input", startQuiz);

buildFilters();
renderWines();
