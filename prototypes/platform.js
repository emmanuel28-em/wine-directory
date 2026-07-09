const sourceItems = window.wineDirectoryData || [];

const restaurants = [
  {
    restaurantId: "rezdora",
    name: "Rezdora"
  },
  {
    restaurantId: "demo-restaurant",
    name: "Demo Restaurant"
  }
];

const demoDocs = [
  {
    restaurantId: "demo-restaurant",
    type: "sop",
    docFormat: "SOP",
    name: "Opening Dining Room Checklist",
    status: "current",
    sectionName: "Service",
    parentFolderName: "Opening SOPs",
    folderName: "Dining Room",
    path: ["Service", "Opening SOPs", "Dining Room"],
    accessRoles: ["owner", "admin", "manager"],
    oneLiner: "A manager-facing checklist for preparing the dining room before service.",
    details: "This sample doc shows how another restaurant could have totally different training content while using the same software."
  }
];

const restaurantSelect = document.querySelector("#restaurantSelect");
const roleSelect = document.querySelector("#roleSelect");
const librarySearch = document.querySelector("#librarySearch");
const libraryTree = document.querySelector("#libraryTree");
const docGrid = document.querySelector("#docGrid");
const libraryTitle = document.querySelector("#libraryTitle");
const libraryCount = document.querySelector("#libraryCount");
const activePath = document.querySelector("#activePath");
const adminLinks = document.querySelectorAll("[data-admin-link]");

let activeRestaurantId = "rezdora";
let activePathFilter = [];

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getItemType(item) {
  return item.type || "wine";
}

function getSectionName(item) {
  if (item.sectionName) {
    return item.sectionName;
  }

  if (getItemType(item) === "food") {
    return "Food";
  }

  return "Beverage";
}

function getParentFolderName(item) {
  if (item.parentFolderName) {
    return item.parentFolderName;
  }

  if (getItemType(item) === "food") {
    return `${item.menu || "Dinner"} Menu`;
  }

  if (getItemType(item) === "wine") {
    return "Wines";
  }

  return "Bar";
}

function getFolderName(item) {
  if (item.folderName) {
    return item.folderName;
  }

  if (getItemType(item) === "food") {
    return item.course || item.category || "Food Docs";
  }

  if (getItemType(item) === "cocktail") {
    return "Cocktails";
  }

  if (getItemType(item) === "wine" && item.menuSection === "pairing") {
    return "Wine Pairing Wines";
  }

  if (getItemType(item) === "wine" && item.menuSection === "bottle") {
    return "Wines by the Bottle";
  }

  if (getItemType(item) === "wine") {
    return "BTG Wines";
  }

  return "Docs";
}

function getDocFormat(item) {
  if (item.docFormat) {
    return item.docFormat;
  }

  if (getItemType(item) === "sop") {
    return "SOP";
  }

  return getItemType(item).charAt(0).toUpperCase() + getItemType(item).slice(1);
}

function normalizeDoc(item, index) {
  const sectionName = getSectionName(item);
  const parentFolderName = getParentFolderName(item);
  const folderName = getFolderName(item);
  const path = item.path || [sectionName, parentFolderName, folderName].filter(Boolean);

  return {
    ...item,
    docId: item.docId || `doc_${index}_${slugify(item.name)}`,
    restaurantId: item.restaurantId || "rezdora",
    docFormat: getDocFormat(item),
    sectionName,
    parentFolderName,
    folderName,
    path,
    accessRoles: item.accessRoles || ["owner", "admin", "manager", "staff"]
  };
}

const docs = [...sourceItems.map(normalizeDoc), ...demoDocs.map(normalizeDoc)];

function setupRestaurantSelect() {
  restaurantSelect.innerHTML = "";
  restaurants.forEach((restaurant) => {
    const option = document.createElement("option");
    option.value = restaurant.restaurantId;
    option.textContent = restaurant.name;
    restaurantSelect.append(option);
  });
  restaurantSelect.value = activeRestaurantId;
}

function canRoleAccessDoc(doc) {
  return (doc.accessRoles || []).includes(roleSelect.value);
}

function canManageLibrary() {
  return ["owner", "admin", "manager"].includes(roleSelect.value);
}

function updateRoleNavigation() {
  adminLinks.forEach((link) => {
    link.classList.toggle("hidden", !canManageLibrary());
  });
}

function getDocsForCurrentRestaurant() {
  return docs.filter((doc) => doc.restaurantId === activeRestaurantId && canRoleAccessDoc(doc));
}

function pathStartsWith(path, filterPath) {
  return filterPath.every((part, index) => path[index] === part);
}

function docMatchesSearch(doc, searchTerm) {
  const text = [
    doc.name,
    doc.docFormat,
    doc.sectionName,
    doc.parentFolderName,
    doc.folderName,
    doc.producer,
    doc.region,
    doc.subregion,
    doc.style,
    doc.farming,
    doc.baseSpirit,
    doc.glassware,
    doc.garnish,
    doc.menuDescription,
    doc.menu,
    doc.course,
    doc.pronunciation,
    doc.mise,
    doc.oneLiner,
    doc.details,
    doc.pairing,
    ...(doc.grapes || []),
    ...(doc.ingredients || []),
    ...(doc.allergies || [])
  ]
    .join(" ")
    .toLowerCase();

  return text.includes(searchTerm);
}

function getFilteredDocs() {
  const searchTerm = librarySearch.value.trim().toLowerCase();

  return getDocsForCurrentRestaurant().filter((doc) => {
    const pathMatches = !activePathFilter.length || pathStartsWith(doc.path || [], activePathFilter);
    const searchMatches = !searchTerm || docMatchesSearch(doc, searchTerm);
    return pathMatches && searchMatches;
  });
}

function countDocsAtPath(path) {
  return getDocsForCurrentRestaurant().filter((doc) => pathStartsWith(doc.path || [], path)).length;
}

function getTreePaths() {
  const pathMap = new Map();

  getDocsForCurrentRestaurant().forEach((doc) => {
    (doc.path || []).forEach((_, index) => {
      const path = doc.path.slice(0, index + 1);
      pathMap.set(path.join("||"), path);
    });
  });

  return [...pathMap.values()].sort((a, b) => a.join(" ").localeCompare(b.join(" ")));
}

function renderTree() {
  const treePaths = getTreePaths();
  libraryTree.innerHTML = "";

  const allButton = createTreeButton([], "All docs", getDocsForCurrentRestaurant().length);
  libraryTree.append(allButton);

  treePaths.forEach((path) => {
    const button = createTreeButton(path, path[path.length - 1], countDocsAtPath(path));
    button.classList.add(`tree-depth-${Math.min(path.length - 1, 2)}`);
    libraryTree.append(button);
  });
}

function createTreeButton(path, label, count) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tree-button";
  const isActive = path.join("||") === activePathFilter.join("||");
  button.classList.toggle("active", isActive);
  button.innerHTML = `<span>${label}</span><span class="tree-count">${count}</span>`;
  button.addEventListener("click", () => {
    activePathFilter = path;
    renderPlatform();
  });
  return button;
}

function formatList(value) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return value || "";
}

function getPrimaryMeta(doc) {
  if (doc.docFormat === "Wine") {
    return [
      ["Producer", doc.producer],
      ["Region", doc.region],
      ["Style", [doc.style, doc.body].filter(Boolean).join(" / ")],
      ["Grapes", formatList(doc.grapes)]
    ];
  }

  if (doc.docFormat === "Cocktail") {
    return [
      ["Base", doc.baseSpirit],
      ["Glass", doc.glassware],
      ["Garnish", doc.garnish],
      ["Allergies", formatList(doc.allergies)]
    ];
  }

  if (doc.docFormat === "Food") {
    return [
      ["Menu", doc.menu],
      ["Course", doc.course],
      ["Mise", formatList(doc.mise)],
      ["Allergies", formatList(doc.allergies)]
    ];
  }

  return [
    ["Format", doc.docFormat],
    ["Status", doc.status],
    ["Access", formatList(doc.accessRoles)]
  ];
}

function renderDocCard(doc) {
  const meta = getPrimaryMeta(doc).filter(([, value]) => value);

  return `
    ${doc.image ? `<img src="${doc.image}" alt="${doc.name}" />` : ""}
    <div>
      <p class="doc-path">${doc.path.join(" / ")}</p>
      <h3>${doc.name}</h3>
    </div>
    ${doc.oneLiner ? `<p class="doc-summary">${doc.oneLiner}</p>` : ""}
    <dl class="doc-meta">
      ${meta.map(([label, value]) => `<dt>${label}</dt><dd>${value}</dd>`).join("")}
    </dl>
    ${doc.details ? `<details class="study-notes"><summary>Open doc</summary><p>${doc.details}</p></details>` : ""}
  `;
}

function renderDocs() {
  const filteredDocs = getFilteredDocs();
  const title = activePathFilter.length ? activePathFilter[activePathFilter.length - 1] : "Training Docs";

  activePath.textContent = activePathFilter.length ? activePathFilter.join(" / ") : "All docs";
  libraryTitle.textContent = title;
  libraryCount.textContent = `Showing ${filteredDocs.length} ${filteredDocs.length === 1 ? "doc" : "docs"}`;
  docGrid.innerHTML = "";

  if (!filteredDocs.length) {
    docGrid.innerHTML = '<div class="empty-state">No docs match this restaurant, role, folder, and search.</div>';
    return;
  }

  filteredDocs.forEach((doc) => {
    const card = document.createElement("article");
    card.className = "doc-card";
    card.innerHTML = renderDocCard(doc);
    docGrid.append(card);
  });
}

function renderPlatform() {
  updateRoleNavigation();
  renderTree();
  renderDocs();
}

restaurantSelect.addEventListener("change", () => {
  activeRestaurantId = restaurantSelect.value;
  activePathFilter = [];
  renderPlatform();
});

roleSelect.addEventListener("change", () => {
  activePathFilter = [];
  renderPlatform();
});

librarySearch.addEventListener("input", renderDocs);

setupRestaurantSelect();
renderPlatform();
