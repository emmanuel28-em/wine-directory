const wines = window.wineDirectoryData || [];

const searchInput = document.querySelector("#searchInput");
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
  return `${wine.producer} ${wine.name} ${wine.vintage}`;
}

function getUniqueWineValues(getValue) {
  return uniqueSorted(wines.map(getValue).filter(Boolean));
}

function getUniqueGrapes() {
  return uniqueSorted(wines.flatMap((wine) => wine.grapes));
}

function getWrongAnswers(correctAnswer, possibleAnswers) {
  return shuffle(possibleAnswers.filter((answer) => answer !== correctAnswer)).slice(0, 3);
}

function buildFilters() {
  addOptions(regionFilter, uniqueSorted(wines.map((wine) => wine.region)));
  addOptions(subregionFilter, uniqueSorted(wines.map((wine) => wine.subregion)));
  addOptions(grapeFilter, uniqueSorted(wines.flatMap((wine) => wine.grapes)));
}

function wineMatchesSearch(wine, searchTerm) {
  const searchableText = [
    wine.name,
    wine.producer,
    wine.vintage,
    wine.region,
    wine.subregion,
    wine.style,
    wine.body,
    wine.farming,
    wine.price,
    wine.oneLiner,
    wine.details,
    wine.pairing,
    ...wine.grapes
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(searchTerm);
}

function getFilteredWines() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedRegion = regionFilter.value;
  const selectedSubregion = subregionFilter.value;
  const selectedGrape = grapeFilter.value;

  return wines.filter((wine) => {
    const regionMatches = selectedRegion === "all" || wine.region === selectedRegion;
    const subregionMatches = selectedSubregion === "all" || wine.subregion === selectedSubregion;
    const grapeMatches = selectedGrape === "all" || wine.grapes.includes(selectedGrape);
    const searchMatches = !searchTerm || wineMatchesSearch(wine, searchTerm);

    return regionMatches && subregionMatches && grapeMatches && searchMatches;
  });
}

function renderWines() {
  const filteredWines = getFilteredWines();

  resultCount.textContent = `Showing ${filteredWines.length} ${filteredWines.length === 1 ? "wine" : "wines"}`;
  wineGrid.innerHTML = "";

  if (filteredWines.length === 0) {
    wineGrid.innerHTML = `<div class="empty-state">No wines match the current filters.</div>`;
    return;
  }

  filteredWines.forEach((wine) => {
    const card = document.createElement("article");
    card.className = "wine-card";

    card.innerHTML = `
      ${wine.image ? `<img class="bottle-photo" src="${wine.image}" alt="Bottle of ${wine.producer} ${wine.name}" />` : ""}

      <div>
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
        ${wine.grapes.map((grape) => `<span class="tag">${grape}</span>`).join("")}
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

    wineGrid.append(card);
  });
}

function clearAllFilters() {
  searchInput.value = "";
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
  const possibleQuestions = wines.flatMap((wine) =>
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

[searchInput, regionFilter, subregionFilter, grapeFilter].forEach((element) => {
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
