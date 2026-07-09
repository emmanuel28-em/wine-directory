const itemType = document.querySelector("#itemType");
const staffSection = document.querySelector("#staffSection");
const builderForm = document.querySelector("#builderForm");
const typeFields = document.querySelectorAll(".type-fields");
const cardPreview = document.querySelector("#cardPreview");
const dataOutput = document.querySelector("#dataOutput");
const copyOutput = document.querySelector("#copyOutput");
const clearForm = document.querySelector("#clearForm");

const fieldGroups = {
  wine: document.querySelector("#wineFields"),
  cocktail: document.querySelector("#cocktailFields"),
  food: document.querySelector("#foodFields"),
  quiz: document.querySelector("#quizFields")
};

function getValue(id) {
  return document.querySelector(`#${id}`).value.trim();
}

function splitList(value) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function addIfPresent(data, key, value) {
  if (Array.isArray(value)) {
    if (value.length) {
      data[key] = value;
    }
    return;
  }

  if (value) {
    data[key] = value;
  }
}

function setTypeFields() {
  const type = itemType.value;

  // Only show the fields that match the item being created.
  // Example: wine fields for wine, cocktail fields for cocktail.
  typeFields.forEach((field) => field.classList.add("hidden"));
  fieldGroups[type].classList.remove("hidden");

  // Pick the staff-site section that makes the most sense for the selected type.
  if (type === "cocktail") {
    staffSection.value = "cocktails";
  } else if (type === "food") {
    staffSection.value = "food";
  } else if (type === "quiz") {
    staffSection.value = "";
  } else if (!["btg", "pairing", "bottle"].includes(staffSection.value)) {
    staffSection.value = "btg";
  }
}

function getRequiredFieldsForCurrentType() {
  // Fields use data-required-for="wine,cocktail" in the HTML.
  // This lets one form validate different item types without separate pages.
  return [...builderForm.querySelectorAll("[data-required-for]")].filter((field) => {
    const requiredTypes = field.dataset.requiredFor.split(",");
    return requiredTypes.includes(itemType.value);
  });
}

function validateForm() {
  // Stop the user before generating JSON if important fields are blank.
  const missingFields = getRequiredFieldsForCurrentType().filter((field) => !field.value.trim());

  builderForm.querySelectorAll(".field-error").forEach((field) => field.classList.remove("field-error"));

  missingFields.forEach((field) => field.classList.add("field-error"));

  if (missingFields.length) {
    const firstLabel = builderForm.querySelector(`label[for="${missingFields[0].id}"]`);
    dataOutput.value = "";
    cardPreview.innerHTML = `<p class="muted">Please fill in required field: ${firstLabel ? firstLabel.textContent : missingFields[0].id}.</p>`;
    missingFields[0].focus();
    return false;
  }

  if (itemType.value === "quiz") {
    const answer = getValue("quizAnswer");
    const choices = splitList(getValue("quizChoices"));

    if (choices.length < 2) {
      showValidationMessage("Quiz questions need at least two choices.", "quizChoices");
      return false;
    }

    if (!choices.includes(answer)) {
      showValidationMessage("The choices must include the correct answer exactly as written.", "quizChoices");
      return false;
    }
  }

  return true;
}

function showValidationMessage(message, fieldId) {
  const field = document.querySelector(`#${fieldId}`);
  field.classList.add("field-error");
  dataOutput.value = "";
  cardPreview.innerHTML = `<p class="muted">${message}</p>`;
  field.focus();
}

function buildWineItem() {
  // Wine objects intentionally do not include type: "wine" because existing data.js
  // treats items without a type as wines.
  const data = {
    name: getValue("name"),
    producer: getValue("producer"),
    vintage: getValue("vintage"),
    status: getValue("status") || "current",
    region: getValue("region"),
    subregion: getValue("subregion"),
    grapes: splitList(getValue("grapes")),
    style: getValue("style"),
    body: getValue("body"),
    image: getValue("image"),
    farming: getValue("farming"),
    price: getValue("price"),
    oneLiner: getValue("oneLiner"),
    details: getValue("details"),
    pairing: ""
  };

  if (["pairing", "bottle"].includes(staffSection.value)) {
    data.menuSection = staffSection.value;
  }

  return data;
}

function buildCocktailItem() {
  // Cocktail objects match the cocktail shape already used in data.js.
  return {
    type: "cocktail",
    name: getValue("name"),
    status: getValue("status") || "current",
    replaces: getValue("offMenu") || "N/A",
    category: "Signature",
    baseSpirit: getValue("baseSpirit"),
    ingredients: splitList(getValue("ingredients")),
    method: "N/A",
    glassware: getValue("glassware"),
    garnish: getValue("garnish") || "N/A",
    allergies: splitList(getValue("allergies")),
    style: "",
    image: getValue("image"),
    price: getValue("price"),
    oneLiner: getValue("oneLiner"),
    details: getValue("details"),
    pairing: "Guest-facing talking points:"
  };
}

function buildFoodItem() {
  // Food objects match the food shape already used in data.js.
  return {
    type: "food",
    name: getValue("name"),
    status: getValue("status") || "current",
    category: getValue("course"),
    menu: getValue("menu"),
    course: getValue("course"),
    menuDescription: getValue("menuDescription"),
    pronunciation: getValue("pronunciation"),
    mise: getValue("mise"),
    winePairings: [],
    allergies: splitList(getValue("allergies")),
    ingredients: splitList(getValue("foodIngredients")),
    oneLiner: getValue("oneLiner"),
    details: getValue("details")
  };
}

function buildQuizItem() {
  // Manual quiz objects are for future use. The current staff quiz still mostly
  // creates questions automatically from wine, cocktail, and food fields.
  return {
    type: "quiz",
    status: getValue("status") || "draft",
    topic: getValue("quizTopicName"),
    level: getValue("quizLevelName"),
    prompt: getValue("quizPrompt"),
    answer: getValue("quizAnswer"),
    choices: splitList(getValue("quizChoices")),
    explanation: getValue("details")
  };
}

function buildItemData() {
  if (itemType.value === "cocktail") {
    return buildCocktailItem();
  }

  if (itemType.value === "food") {
    return buildFoodItem();
  }

  if (itemType.value === "quiz") {
    return buildQuizItem();
  }

  return buildWineItem();
}

function renderPreview(data) {
  // The preview is intentionally simple: it shows the important fields before copying.
  const previewRows = getPreviewRows(data);

  cardPreview.innerHTML = `
    ${data.image ? `<img class="admin-preview-image" src="${data.image}" alt="${data.name || data.prompt}" />` : ""}
    <h3>${data.name || data.prompt || "Untitled item"}</h3>
    ${data.oneLiner ? `<p>${data.oneLiner}</p>` : ""}
    <dl>
      ${previewRows.map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`).join("")}
    </dl>
  `;
}

function getPreviewRows(data) {
  if (data.type === "cocktail") {
    return [
      ["Type", "Cocktail"],
      ["Base", data.baseSpirit],
      ["Glass", data.glassware],
      ["Garnish", data.garnish],
      ["Allergies", data.allergies.join(", ")]
    ].filter(([, value]) => value);
  }

  if (data.type === "food") {
    return [
      ["Type", "Food"],
      ["Menu", data.menu],
      ["Course", data.course],
      ["Mise", data.mise],
      ["Allergies", data.allergies.join(", ")]
    ].filter(([, value]) => value);
  }

  if (data.type === "quiz") {
    return [
      ["Type", "Quiz"],
      ["Topic", data.topic],
      ["Level", data.level],
      ["Answer", data.answer],
      ["Choices", data.choices.join(", ")]
    ].filter(([, value]) => value);
  }

  return [
    ["Type", "Wine"],
    ["Producer", data.producer],
    ["Vintage", data.vintage],
    ["Region", data.region],
    ["Subregion", data.subregion],
    ["Grapes", data.grapes.join(", ")],
    ["Style", data.style],
    ["Section", data.menuSection || "btg"]
  ].filter(([, value]) => value);
}

function buildJson(event) {
  event.preventDefault();

  if (!validateForm()) {
    return;
  }

  const data = buildItemData();
  renderPreview(data);
  // The comma at the end makes it ready to paste into the array in data.js.
  dataOutput.value = `${JSON.stringify(data, null, 2)},`;
}

async function copyJson() {
  if (!dataOutput.value) {
    return;
  }

  await navigator.clipboard.writeText(dataOutput.value);
  copyOutput.textContent = "Copied";
  window.setTimeout(() => {
    copyOutput.textContent = "Copy JSON";
  }, 1200);
}

function resetBuilder() {
  itemType.value = "wine";
  staffSection.value = "btg";
  builderForm.reset();
  cardPreview.innerHTML = '<p class="muted">Fill out the form and build the item to preview it here.</p>';
  dataOutput.value = "";
  builderForm.querySelectorAll(".field-error").forEach((field) => field.classList.remove("field-error"));
  setTypeFields();
}

itemType.addEventListener("change", setTypeFields);
builderForm.addEventListener("submit", buildJson);
copyOutput.addEventListener("click", copyJson);
clearForm.addEventListener("click", resetBuilder);

setTypeFields();
