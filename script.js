const wines = [
  {
    name: "Predappio Sangiovese",
    producer: "Chiara Condello",
    vintage: "2023",
    region: "Emilia-Romagna",
    subregion: "Predappio, Romagna",
    grapes: ["Sangiovese"],
    style: "Red",
    body: "Medium",
    image: "images/Chiara Condello Image.png",
    farming: "Organic",
    price: "$20 glass / $70 bottle",
    oneLiner:
      "A delicious, powerful Sangiovese from one of the rising stars of Emilia-Romagna, this medium-bodied wine offers notes of dark fruits, earthiness, and spice.",
    details:
      "Chiara Condello may be young, but since her first vintage in 2015, she has established herself as one of the most promising and talented winemakers in Emilia-Romagna. She hails from the Romagna side of the region, which has unique culinary and winemaking traditions, and makes wine near the town of Predappio, one of twelve villages allowed to put its name on regional Sangiovese. Organically farmed from the start, Condello's wines offer a fantastic balance of finesse and power. Expect notes of dark fruits, alongside herbaceous, earthy notes of forest floor and spice. Lifted acidity keeps the wine fresh, but a fair dose of tannin makes the wine exceptionally food-friendly.",
    pairing:
      "A wonderful pairing with heartier pastas and meat dishes; it would shine alongside Gramigna or Tagliolini, and be perfect with Lamb or Costata."
  },
  {
    name: "Enfer d'Arvier",
    producer: "Danilo Thomain",
    vintage: "2023",
    region: "Valle d'Aosta",
    subregion: "Enfer d'Arvier DOC",
    grapes: ["Petit Rouge"],
    style: "Red",
    body: "Medium",
    image: "images/DaniloThomain.webp",
    farming: "Lutte Raisonnee",
    price: "$25 glass / $95 bottle",
    oneLiner:
      "A deeply berried but intensely fresh alpine red grown on steep, terraced slopes in the shadow of Mont Blanc.",
    details:
      "This is a very special wine from a very special producer in a very special region. We're incredibly lucky to pour this by the glass, as it's generally very allocated and limited. Enfer d'Arvier, which translates as the Hell of Arvier, is a tiny DOC of only 5 hectares nestled in the mountains in the Aosta Valley. Its bowl-like amphitheater shape and steep slopes trap heat during the day despite the alpine setting. The dramatic diurnal shift between warm days and cool nights helps the grapes achieve ripeness and intensity while preserving acidity, keeping the wine fresh and bright. Danilo Thomain is the sole independent producer in the DOC and farms one hectare; the rest of the producers pool their grapes in the local cooperative. He makes just a few hundred cases per year, about half of which is imported to the US by Neal Rosenthal. The wine is distinctive, crowd-pleasing, easy to drink, and has a memorable label showing a devil dancing among the vines.",
    pairing:
      "Great with dishes that can handle fresh alpine acidity and dark berry fruit, especially savory meats, earthy vegetables, and richer pastas."
  },
  {
    name: "Caespace Timorasso",
    producer: "Ezio Poggio",
    vintage: "2022",
    region: "Piedmont",
    subregion: "Colli Tortonesi, Terre di Libarna",
    grapes: ["Timorasso"],
    style: "White",
    body: "Full",
    image: "images/Eziopoggio.jpeg",
    farming: "Manual harvesting, practicing organic",
    price: "$22 glass / $100 bottle",
    oneLiner:
      "Timorasso is considered to be the great white wine of Piemonte. Known for its robust minerality and bright acidity, this is a wine that maintains a full-bodied characteristic.",
    details:
      "Ezio Poggio is now led by its third generation: siblings Ezio, an enologist, and Mary, who graduated in pharmacy before joining the family business. In 2003, the family began an ambitious project to recover Timorasso, an ancient indigenous grape variety of the Val Borbera. The project included requesting DOC recognition for the valley, planting new vines, bringing technology into the cellar, and building a new winemaking room with modern equipment. In 2008, they harvested their first grapes, and in 2011 they joined the Tortona hills territory with the Terre di Libarna subarea, encompassing the Borbera and Spinti valleys.",
    pairing:
      "A strong match for richer seafood, creamy pastas, roasted poultry, and dishes that benefit from both acidity and mineral structure."
  },
  {
    name: "L'Albereta Vernaccia di San Gimignano Riserva",
    producer: "Il Colombaio di Santa Chiara",
    vintage: "2021",
    region: "Tuscany",
    subregion: "San Gimignano",
    grapes: ["Vernaccia di San Gimignano"],
    style: "White",
    body: "Medium-full",
    image: "images/Ilcolombaiovernaccia.jpeg",
    farming: "Practicing biodynamic",
    price: "$32 glass / $125 bottle",
    oneLiner:
      "Vernaccia is the quintessential white grape of Toscana. The black label wine from Il Colombaio di Santa Chiara provides depth and elegance, and will be friendly for Chardonnay drinkers.",
    details:
      "Il Colombaio di Santa Chiara is a family farm built by hard work. Mario Logi began working the land as a teenager in the 1950s, later acquired his own property, and raised a family. In 2002, the youngest son, Alessio, who had already started oenological studies, wanted to make wine from their own vineyards. It quickly became a family project, and Il Colombaio di Santa Chiara was born. The family believes all good wine begins in the vineyard, especially wines that express terroir. Drawing on Mario's lifetime of farming experience, the family is constantly among the vines. Because vineyard health requires careful attention and a healthy biosphere around the plants, they worked hard to obtain organic farming certification.",
    pairing:
      "A natural fit for richer seafood, roasted chicken, creamy vegetable dishes, and guests looking for a textured white wine with Chardonnay-like comfort."
  },
  {
    name: "Kye Langhe Freisa",
    producer: "G.D. Vajra",
    vintage: "2022",
    region: "Piedmont",
    subregion: "Barolo commune",
    grapes: ["Freisa"],
    style: "Red",
    body: "Full",
    image: "images/varjrafreisa.jpeg",
    farming: "Organic",
    price: "$28 glass / $110 bottle",
    oneLiner:
      "The benchmark bottling for Freisa, a rare indigenous Piemontese grape closely related to Nebbiolo. Expect dark fruits, violets, black pepper, and a hint of smoke, with a profile akin to Northern Rhone Syrah.",
    details:
      "G.D. Vajra is passionately committed to the resuscitation of Freisa, a rare grape indigenous to Piemonte. The Kye bottling, from vineyards in the commune of Barolo, is widely hailed as the benchmark expression of the variety. Darker-fruited and more rustic than Nebbiolo, Freisa shows dark purple in the glass and offers notes of dark berries, wild herbs, black pepper, and a hint of meatiness. The wine spends 12 to 18 months in Slavonian oak and barriques, depending on the vintage, adding weight and power and making it a good option for guests looking for something akin to Cabernet or Syrah. The name Kye is derived from a local Piemontese expression that translates as 'who is it?'",
    pairing:
      "Ideal for heartier fare such as meat-based pastas, Cow Grazing, and Costata."
  },
  {
    name: "Vigneto Reine Colline Savonesi Mataossu",
    producer: "Punta Crena",
    vintage: "2023",
    region: "Liguria",
    subregion: "Colline Savonesi",
    grapes: ["Mataossu"],
    style: "White",
    body: "Light-medium",
    image: "images/puntacrena.webp",
    farming: "Esoteric",
    price: "$22 glass / $80 bottle",
    oneLiner:
      "A wine for warmer weather. This Mediterranean white evokes sea spray and fresh citrus, bringing brightness and lift to the cuisine.",
    details:
      "The native Mataossu dominated the vineyards of Varigotti in the 19th century, but its delicate vegetative balance led most winegrowers to replace it with less finicky grapes. Today only three producers have wines labeled Mataossu, and the Ruffino family says the other two are actually Lumassina. Varigotti is a tiny Mediterranean village set against steep hills, where terraced vineyards climb the slopes and appear in hidden clearings. The Ruffino family has tended these vineyards for over 500 years, passing knowledge from one generation to the next. Today the estate is run by four siblings: Tommaso makes the wine, Paolo handles sales, Anna manages logistics, and Nicola helps in the vineyards and winery. The wines are deeply rooted in local tradition and character.",
    pairing:
      "Best with brighter dishes, seafood, vegetables, lighter pastas, and anything that benefits from citrusy freshness and a coastal mineral edge."
  },
  {
    name: "Langhe Rosso",
    producer: "Roagna",
    vintage: "2019",
    region: "Piedmont",
    subregion: "Pira, Barolo and Paje, Barbaresco",
    grapes: ["Nebbiolo"],
    style: "Red",
    body: "Medium",
    image: "images/Roagna2019.jpeg",
    farming: "Organic",
    price: "$39 glass / $160 bottle",
    oneLiner:
      "Among the most outstanding Langhe Rosso wines in existence, from an iconic producer of Barbaresco and Barolo. Sourced from young Nebbiolo vines in Roagna's Pira and Paje vineyards, this is fresh, herbal, smoky, spicy, earthy, and sophisticated.",
    details:
      "Roagna is an icon. Their wines are pure, organically farmed examples from some of the finest vineyards in Barolo and Barbaresco, farmed and vinified traditionally. They are among the most noble and precise expressions of these areas, blending uncommon elegance and accessibility in regions that can often be challenging.",
    pairing:
      "A strong match for refined meat dishes, truffle-leaning flavors, mushroom preparations, and pastas that benefit from Nebbiolo's spice, earth, and structure."
  },
  {
    name: "Concerto Lambrusco Reggiano",
    producer: "Medici Ermete",
    vintage: "2023",
    region: "Emilia-Romagna",
    subregion: "Reggio Emilia",
    grapes: ["Lambrusco Salamino"],
    style: "Sparkling red",
    body: "Medium",
    image: "images/Medicilambrusco.webp",
    farming: "Organic",
    price: "$19 glass / $65 bottle",
    oneLiner:
      "Perhaps the Platonic ideal of Lambrusco, this historic wine from Medici Ermete was the first single-vineyard, single-vintage Lambrusco produced. Organically farmed, deeply fruited, relatively dry, and incredibly food-friendly.",
    details:
      "Medici Ermete is a hugely influential producer in Lambrusco, particularly for elevating the status and seriousness of the wine from a quaff of middling quality to a wine of depth. They were the first to bottle a single-vineyard, single-vintage Lambrusco; most Lambrusco remains non-vintage blends, almost none are single-vineyard, and organic farming is not always easy to find. The Medici family is deeply committed to sustainability, including environmental responsibility, ethics, social sustainability, and circular economy principles. Alessandro Medici is a strong ambassador for the wines and also hosts one of the most successful food and wine podcasts in Italy.",
    pairing:
      "An ideal aperitif for the menu, perfect with gnocco fritto and other antipasti, but structured enough to pair elegantly with all of the cuisine."
  },
  {
    name: "Lambrusco di Sorbara Metodo Classico Rosato",
    producer: "Silvia Zucchi",
    vintage: "2021",
    region: "Emilia-Romagna",
    subregion: "Sorbara",
    grapes: ["Lambrusco di Sorbara"],
    style: "Sparkling rosato",
    body: "Medium",
    image: "images/Silviazucchi.jpeg",
    farming: "Practicing organic",
    price: "$20 glass / $80 bottle",
    oneLiner:
      "A dry Lambrusco produced in Metodo Classico, also known as the Champagne Method, instead of the tank or Charmat method typically used for Lambrusco. An exclusive U.S. pour at Rezdora, with dry but full-fruited rosato character, flowers, and spice.",
    details:
      "Silvia Zucchi's Charmat-method Lambrusco di Sorbara Rosato has long been on the list, but Zucchi also makes two Metodo Classico wines from Lambrusco di Sorbara. Although the wines are not generally imported, Polaner was able to secure 15 cases as an exclusive by-the-glass pour, adding another distinctive element to the Rezdora wine program.",
    pairing:
      "A strong aperitif and antipasti pairing, especially where dry bubbles, red-fruited lift, floral notes, and spice can brighten the dish."
  }
];

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
