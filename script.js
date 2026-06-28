const wines = window.wineDirectoryData || [];

const searchInput = document.querySelector("#searchInput");
const typeFilter = document.querySelector("#typeFilter");
const statusFilter = document.querySelector("#statusFilter");
const regionFilter = document.querySelector("#regionFilter");
const subregionFilter = document.querySelector("#subregionFilter");
const grapeFilter = document.querySelector("#grapeFilter");
const clearFilters = document.querySelector("#clearFilters");
const quizMode = document.querySelector("#quizMode");
const wineGrid = document.querySelector("#wineGrid");
const resultCount = document.querySelector("#resultCount");
const toolbar = document.querySelector(".toolbar");
const quizPanel = document.querySelector("#quizPanel");
const quizProgress = document.querySelector("#quizProgress");
const quizScore = document.querySelector("#quizScore");
const quizQuestion = document.querySelector("#quizQuestion");
const quizChoices = document.querySelector("#quizChoices");
const quizFeedback = document.querySelector("#quizFeedback");
const nextQuestion = document.querySelector("#nextQuestion");
const restartQuiz = document.querySelector("#restartQuiz");

let quizQuestions = [];
let currentQuestionIndex = 0;
let quizScoreCount = 0;
let hasAnsweredCurrentQuestion = false;

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
  return uniqueSorted(getQuizWines().map(getValue).filter(Boolean));
}

function getUniqueGrapes() {
  return uniqueSorted(getQuizWines().flatMap((wine) => wine.grapes || []));
}

function getWrongAnswers(correctAnswer, possibleAnswers) {
  return shuffle(possibleAnswers.filter((answer) => answer !== correctAnswer)).slice(0, 3);
}

function getWineStatus(wine) {
  return wine.status || "current";
}

function getWineStatusLabel(wine) {
  return getWineStatus(wine) === "previous" ? "Previous" : "Current";
}

function getBeverageType(item) {
  return item.type || "wine";
}

function getTypeLabel(item) {
  return getBeverageType(item) === "cocktail" ? "Cocktail" : "Wine";
}

function getQuizWines() {
  return wines.filter((item) => getBeverageType(item) === "wine");
}

function buildFilters() {
  const wineEntries = wines.filter((item) => getBeverageType(item) === "wine");

  addOptions(regionFilter, uniqueSorted(wineEntries.map((wine) => wine.region)));
  addOptions(subregionFilter, uniqueSorted(wineEntries.map((wine) => wine.subregion)));
  addOptions(grapeFilter, uniqueSorted(wineEntries.flatMap((wine) => wine.grapes || [])));
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
    ...(wine.allergies || []),
    wine.oneLiner,
    wine.details,
    wine.pairing,
    ...(wine.grapes || []),
    ...(wine.ingredients || [])
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(searchTerm);
}

function getFilteredWines() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedType = typeFilter.value;
  const selectedStatus = statusFilter.value;
  const selectedRegion = regionFilter.value;
  const selectedSubregion = subregionFilter.value;
  const selectedGrape = grapeFilter.value;
  const wineFilterActive = selectedRegion !== "all" || selectedSubregion !== "all" || selectedGrape !== "all";

  return wines.filter((wine) => {
    const typeMatches = selectedType === "all" || getBeverageType(wine) === selectedType;
    const statusMatches = selectedStatus === "all" || getWineStatus(wine) === selectedStatus;
    const isCocktail = getBeverageType(wine) === "cocktail";
    const cocktailMatchesWineFilters = !isCocktail || selectedType === "cocktail" || !wineFilterActive;
    const regionMatches = isCocktail || selectedRegion === "all" || wine.region === selectedRegion;
    const subregionMatches = isCocktail || selectedSubregion === "all" || wine.subregion === selectedSubregion;
    const grapeMatches = isCocktail || selectedGrape === "all" || (wine.grapes || []).includes(selectedGrape);
    const searchMatches = !searchTerm || wineMatchesSearch(wine, searchTerm);

    return typeMatches && statusMatches && cocktailMatchesWineFilters && regionMatches && subregionMatches && grapeMatches && searchMatches;
  });
}

function renderWines() {
  const filteredWines = getFilteredWines();

  resultCount.textContent = `Showing ${filteredWines.length} ${filteredWines.length === 1 ? "beverage" : "beverages"}`;
  wineGrid.innerHTML = "";

  if (filteredWines.length === 0) {
    wineGrid.innerHTML = `<div class="empty-state">No wines match the current filters.</div>`;
    return;
  }

  filteredWines.forEach((wine) => {
    const card = document.createElement("article");
    card.className = "wine-card";

    card.innerHTML = getBeverageType(wine) === "cocktail" ? renderCocktailCard(wine) : renderWineCard(wine);

    wineGrid.append(card);
  });
}

function renderWineCard(wine) {
  return `
    ${wine.image ? `<img class="bottle-photo" src="${wine.image}" alt="Bottle of ${wine.producer} ${wine.name}" />` : ""}

    <div>
      <span class="status-badge ${getWineStatus(wine) === "previous" ? "previous" : ""}">${getWineStatusLabel(wine)}</span>
      <span class="type-badge">Wine</span>
      <h3>${wine.name} ${wine.vintage}</h3>
      <p class="producer">${wine.producer}</p>
    </div>

    <dl class="meta-list">
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
      <span class="status-badge ${getWineStatus(cocktail) === "previous" ? "previous" : ""}">${getWineStatusLabel(cocktail)}</span>
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

function clearAllFilters() {
  searchInput.value = "";
  typeFilter.value = "all";
  statusFilter.value = "current";
  regionFilter.value = "all";
  subregionFilter.value = "all";
  grapeFilter.value = "all";
  renderWines();
}

function buildQuestion(wine, questionType) {
  const questionTypes = {
    grape: {
      prompt: `Which grape is used in ${formatWineName(wine)}?`,
      answer: wine.grapes[0],
      possibleAnswers: getUniqueGrapes()
    },
    region: {
      prompt: `Which region is ${formatWineName(wine)} from?`,
      answer: wine.region,
      possibleAnswers: getUniqueWineValues((item) => item.region)
    },
    producer: {
      prompt: `Who produces ${wine.name} ${wine.vintage}?`,
      answer: wine.producer,
      possibleAnswers: getUniqueWineValues((item) => item.producer)
    },
    style: {
      prompt: `What style is ${formatWineName(wine)}?`,
      answer: wine.style,
      possibleAnswers: getUniqueWineValues((item) => item.style)
    },
    farming: {
      prompt: `What farming practice is listed for ${formatWineName(wine)}?`,
      answer: wine.farming,
      possibleAnswers: getUniqueWineValues((item) => item.farming)
    },
    price: {
      prompt: `What is the listed price for ${formatWineName(wine)}?`,
      answer: wine.price,
      possibleAnswers: getUniqueWineValues((item) => item.price)
    }
  };

  const selectedType = questionTypes[questionType];
  const wrongAnswers = getWrongAnswers(selectedType.answer, selectedType.possibleAnswers);

  return {
    prompt: selectedType.prompt,
    answer: selectedType.answer,
    choices: shuffle([selectedType.answer, ...wrongAnswers])
  };
}

function createQuizRound() {
  const questionTypes = ["grape", "region", "producer", "style", "farming", "price"];
  const possibleQuestions = getQuizWines().flatMap((wine) =>
    questionTypes.map((questionType) => buildQuestion(wine, questionType))
  );

  return shuffle(possibleQuestions).slice(0, 10);
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
  startQuiz();
}

function startQuiz() {
  quizQuestions = createQuizRound();
  currentQuestionIndex = 0;
  quizScoreCount = 0;
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const currentQuestion = quizQuestions[currentQuestionIndex];
  hasAnsweredCurrentQuestion = false;

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
    quizScoreCount += 1;
    selectedButton.classList.add("correct");
    quizFeedback.textContent = "Correct.";
  } else {
    selectedButton.classList.add("incorrect");
    quizFeedback.textContent = `Not quite. Correct answer: ${currentQuestion.answer}`;
  }

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
  quizProgress.textContent = "Quiz complete";
  quizScore.textContent = `Final score: ${quizScoreCount} / ${quizQuestions.length}`;
  quizQuestion.textContent = `You scored ${quizScoreCount} out of ${quizQuestions.length}.`;
  quizChoices.innerHTML = "";
  quizFeedback.textContent = "Start a new round to get a fresh set of randomized questions.";
  nextQuestion.disabled = true;
}

[searchInput, typeFilter, statusFilter, regionFilter, subregionFilter, grapeFilter].forEach((element) => {
  element.addEventListener("input", renderWines);
});

clearFilters.addEventListener("click", clearAllFilters);

quizMode.addEventListener("click", () => {
  if (quizPanel.classList.contains("hidden")) {
    showQuizMode();
  } else {
    showDirectoryMode();
  }
});

nextQuestion.addEventListener("click", moveToNextQuestion);
restartQuiz.addEventListener("click", startQuiz);

buildFilters();
renderWines();
