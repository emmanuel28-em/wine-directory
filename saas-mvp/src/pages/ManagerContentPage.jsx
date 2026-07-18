import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { archiveCollection, listCollectionsForRestaurant, saveCollection } from "../lib/collections.js";
import { deleteFileAsset, getFileAssetUrl, listFileAssetsForRestaurant, uploadFileAsset } from "../lib/fileAssets.js";
import { importExistingRestaurantContent } from "../lib/importExistingRestaurantContent.js";
import {
  deleteTrainingDoc,
  docToForm,
  emptyTrainingDocForm,
  listTrainingDocsForRestaurant,
  parseContentJson,
  saveTrainingDoc,
  updateTrainingDocStatus
} from "../lib/trainingDocs.js";

const categoryTypeLabels = {
  foodMenu: "Food Menu",
  beverage: "Beverage",
  wine: "Wine",
  cocktail: "Cocktail",
  service: "Service",
  sop: "SOP",
  onboarding: "Onboarding",
  events: "Events",
  custom: "Custom"
};

const contentTypeLabels = {
  foodItem: "Food Item",
  wine: "Wine",
  cocktail: "Cocktail",
  sop: "SOP",
  serviceStandard: "Service Standard",
  menuOverview: "Menu Overview",
  tastingMenuCourse: "Tasting Menu Course",
  eventNote: "Event Note",
  custom: "Custom"
};

// These starters help a busy manager begin with familiar restaurant material.
// They only prefill the form; the manager still reviews and saves the page.
const starterTemplates = [
  {
    contentType: "foodItem",
    title: "Food Item",
    helper: "Dish notes, allergens, ingredients, mise, and talking points.",
    tags: "food, menu",
    summaryPlaceholder: "Short staff-facing one-liner for this dish."
  },
  {
    contentType: "wine",
    title: "Wine",
    helper: "Producer, grape, region, style, farming, and staff talking points.",
    tags: "wine, beverage",
    summaryPlaceholder: "Short staff-facing one-liner for this wine."
  },
  {
    contentType: "cocktail",
    title: "Cocktail",
    helper: "Spec, glassware, garnish, allergens, and guest-facing description.",
    tags: "cocktail, beverage",
    summaryPlaceholder: "Short staff-facing one-liner for this cocktail."
  },
  {
    contentType: "sop",
    title: "SOP",
    helper: "Opening, closing, sidework, service standards, or manager procedures.",
    tags: "sop, operations",
    summaryPlaceholder: "Short summary of when staff use this SOP."
  },
  {
    contentType: "serviceStandard",
    title: "Service Standard",
    helper: "Steps of service, language, table maintenance, or hospitality standards.",
    tags: "service, standards",
    summaryPlaceholder: "Short summary of this service standard."
  },
  {
    contentType: "custom",
    title: "Custom",
    helper: "Anything that does not fit the standard restaurant training templates.",
    tags: "custom",
    summaryPlaceholder: "Short summary for staff."
  }
];

const emptyCategoryForm = {
  name: "",
  description: "",
  categoryType: "foodMenu",
  status: "active",
  sortOrder: "0"
};

function getCategoryName(categories, categoryId) {
  return categories.find((category) => category.id === categoryId)?.name || "Unassigned";
}

function makeEmptyKnowledgeItem() {
  return {
    label: "",
    value: "",
    questionHint: "",
    quizEligible: true
  };
}

function getCleanKnowledgeItems(items) {
  return items
    .map((item) => ({
      label: item.label.trim(),
      value: item.value.trim(),
      questionHint: item.questionHint.trim(),
      quizEligible: Boolean(item.quizEligible)
    }))
    .filter((item) => item.label || item.value || item.questionHint);
}

function groupPagesByCategory(docs, categories) {
  const groups = new Map();

  docs.forEach((doc) => {
    const key = doc.collectionId || "unassigned";
    const category = categories.find((item) => item.id === doc.collectionId);
    const groupName = category?.name || "Unassigned";

    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        name: groupName,
        pages: []
      });
    }

    groups.get(key).pages.push(doc);
  });

  return [...groups.values()];
}

function isOriginalRezdoraWorkspace(restaurant) {
  const name = (restaurant?.name || "").trim().toLowerCase();
  const slug = (restaurant?.slug || "").trim().toLowerCase();
  return name === "rezdora" || slug === "rezdora";
}

export default function ManagerContentPage() {
  const workspace = useCurrentWorkspace();
  const [categories, setCategories] = useState([]);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [docs, setDocs] = useState([]);
  const [fileAssets, setFileAssets] = useState([]);
  const [form, setForm] = useState(emptyTrainingDocForm);
  const [knowledgeItems, setKnowledgeItems] = useState([makeEmptyKnowledgeItem()]);
  const [editingDocId, setEditingDocId] = useState(null);
  const [selectedSourceFile, setSelectedSourceFile] = useState(null);
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [pageSearch, setPageSearch] = useState("");
  const [pageStatusFilter, setPageStatusFilter] = useState("all");
  const [pageTypeFilter, setPageTypeFilter] = useState("all");

  async function refreshRestaurantContent(restaurantId) {
    const [nextCategories, nextDocs, nextFiles] = await Promise.all([
      listCollectionsForRestaurant(restaurantId, { includeArchived: true }),
      listTrainingDocsForRestaurant(restaurantId),
      listFileAssetsForRestaurant(restaurantId)
    ]);

    setCategories(nextCategories);
    setDocs(nextDocs);
    setFileAssets(nextFiles);
  }

  async function loadContentPage() {
    if (workspace.status !== "ready") {
      return;
    }

    setIsWorking(true);
    setMessage("");

    try {
      await refreshRestaurantContent(workspace.restaurant.id);
    } catch (error) {
      setMessage(error.message || "Could not load training content.");
    } finally {
      setIsWorking(false);
    }
  }

  useEffect(() => {
    if (workspace.status === "ready") {
      loadContentPage();
    }

    if (workspace.status === "empty" || workspace.status === "error") {
      setCategories([]);
      setDocs([]);
    }
  }, [workspace.status, workspace.restaurant?.id]);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  }

  function updateCategoryForm(event) {
    const { name, value } = event.target;
    setCategoryForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  }

  function updateKnowledgeItem(index, field, value) {
    setKnowledgeItems((currentItems) =>
      currentItems.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value
            }
          : item
      )
    );
  }

  function resetCategoryForm() {
    setCategoryForm(emptyCategoryForm);
    setEditingCategoryId(null);
    setMessage("");
  }

  function resetPageForm() {
    setForm(emptyTrainingDocForm);
    setKnowledgeItems([makeEmptyKnowledgeItem()]);
    setEditingDocId(null);
    setSelectedSourceFile(null);
    setMessage("");
  }

  function startFromTemplate(template) {
    setForm((currentForm) => ({
      ...currentForm,
      contentType: template.contentType,
      status: "draft",
      tags: currentForm.tags || template.tags
    }));
    setMessage(
      `Starting a ${template.title} Training Page. Fill in the title, notes, and staff knowledge, then save as a draft.`
    );
    document.getElementById("training-page-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function editCategory(category) {
    setCategoryForm({
      name: category.name || "",
      description: category.description || "",
      categoryType: category.categoryType || "custom",
      status: category.status || "active",
      sortOrder: String(category.sortOrder || 0)
    });
    setEditingCategoryId(category.id);
    setMessage(`Editing Training Category: ${category.name}.`);
  }

  function editPage(doc) {
    const nextForm = docToForm(doc);
    setForm(nextForm);

    try {
      const parsedItems = JSON.parse(nextForm.quizFactsJson);
      setKnowledgeItems(Array.isArray(parsedItems) && parsedItems.length ? parsedItems : [makeEmptyKnowledgeItem()]);
    } catch {
      setKnowledgeItems([makeEmptyKnowledgeItem()]);
    }

    setEditingDocId(doc.id);
    setMessage(`Editing Training Page: ${doc.title}.`);
  }

  async function submitCategory(event) {
    event.preventDefault();

    if (workspace.status !== "ready") {
      setMessage("Finish setting up your restaurant before adding library sections.");
      return;
    }

    setIsWorking(true);
    setMessage("");

    try {
      await saveCollection({
        collection: categoryForm,
        restaurantId: workspace.restaurant.id,
        userProfileId: workspace.userProfile.id,
        editingCollectionId: editingCategoryId
      });
      await refreshRestaurantContent(workspace.restaurant.id);
      resetCategoryForm();
      setMessage(editingCategoryId ? "Library section updated." : "Library section created.");
    } catch (error) {
      setMessage(error.message || "Could not save the library section.");
    } finally {
      setIsWorking(false);
    }
  }

  async function archiveExistingCategory(category) {
    setIsWorking(true);
    setMessage("");

    try {
      await archiveCollection({
        collectionId: category.id,
        restaurantId: workspace.restaurant.id,
        userProfileId: workspace.userProfile.id
      });
      await refreshRestaurantContent(workspace.restaurant.id);
      setMessage(`${category.name} was archived.`);
    } catch (error) {
      setMessage(error.message || "Could not archive the library section.");
    } finally {
      setIsWorking(false);
    }
  }

  async function submitPage(event) {
    event.preventDefault();

    if (workspace.status !== "ready") {
      setMessage("Finish setting up your restaurant before adding training pages.");
      return;
    }

    setIsWorking(true);
    setMessage("");

    try {
      await saveTrainingDoc({
        form: {
          ...form,
          quizFactsJson: JSON.stringify(getCleanKnowledgeItems(knowledgeItems))
        },
        editingDocId,
        restaurantId: workspace.restaurant.id,
        userProfileId: workspace.userProfile.id
      });

      await refreshRestaurantContent(workspace.restaurant.id);
      resetPageForm();
      setMessage(editingDocId ? "Training Page updated." : "Training Page created.");
    } catch (error) {
      setMessage(error.message || "Could not save the Training Page.");
    } finally {
      setIsWorking(false);
    }
  }

  async function changeStatus(doc, status) {
    setIsWorking(true);
    setMessage("");

    try {
      await updateTrainingDocStatus({
        doc,
        status,
        restaurantId: workspace.restaurant.id,
        userProfileId: workspace.userProfile.id
      });
      await refreshRestaurantContent(workspace.restaurant.id);
      setMessage(`${doc.title} is now ${status}.`);
    } catch (error) {
      setMessage(error.message || "Could not update the Training Page.");
    } finally {
      setIsWorking(false);
    }
  }

  async function removePage(doc) {
    const shouldDelete = window.confirm(`Delete "${doc.title}"? This cannot be undone.`);

    if (!shouldDelete) {
      return;
    }

    setIsWorking(true);
    setMessage("");

    try {
      await deleteTrainingDoc({
        docId: doc.id,
        restaurantId: workspace.restaurant.id
      });
      await refreshRestaurantContent(workspace.restaurant.id);
      setMessage(`${doc.title} was deleted.`);

      if (editingDocId === doc.id) {
        resetPageForm();
      }
    } catch (error) {
      setMessage(error.message || "Could not delete the Training Page.");
    } finally {
      setIsWorking(false);
    }
  }

  async function attachSourceFile(event) {
    event.preventDefault();

    if (!editingDocId) {
      setMessage("Save the Training Page first, then attach source files.");
      return;
    }

    if (!selectedSourceFile) {
      setMessage("Choose a file before uploading.");
      return;
    }

    setIsWorking(true);
    setMessage("");

    try {
      await uploadFileAsset({
        restaurantId: workspace.restaurant.id,
        trainingDocId: editingDocId,
        file: selectedSourceFile,
        uploadedBy: workspace.userProfile.id
      });
      setSelectedSourceFile(null);
      await refreshRestaurantContent(workspace.restaurant.id);
      setMessage("Source file attached.");
    } catch (error) {
      setMessage(error.message || "Could not attach this source file.");
    } finally {
      setIsWorking(false);
    }
  }

  async function openFile(fileAsset) {
    try {
      const url = await getFileAssetUrl({
        fileAsset,
        restaurantId: workspace.restaurant.id
      });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(error.message || "Could not open this file.");
    }
  }

  async function removeFile(fileAsset) {
    const shouldDelete = window.confirm(`Remove "${fileAsset.fileName}"?`);

    if (!shouldDelete) {
      return;
    }

    setIsWorking(true);
    setMessage("");

    try {
      await deleteFileAsset({
        fileAsset,
        restaurantId: workspace.restaurant.id
      });
      await refreshRestaurantContent(workspace.restaurant.id);
      setMessage("Attached file removed.");
    } catch (error) {
      setMessage(error.message || "Could not remove this file.");
    } finally {
      setIsWorking(false);
    }
  }

  async function importExistingContent() {
    if (workspace.status !== "ready") {
      setMessage("No restaurant was found for this account.");
      return;
    }

    if (!isOriginalRezdoraWorkspace(workspace.restaurant)) {
      setMessage("This existing-content import is only available for the Rezdora workspace. Other restaurants can request managed setup.");
      return;
    }

    setIsWorking(true);
    setMessage("");

    try {
      const result = await importExistingRestaurantContent({
        restaurantId: workspace.restaurant.id,
        userProfileId: workspace.userProfile.id
      });

      await refreshRestaurantContent(workspace.restaurant.id);
      setMessage(
        `Import complete. Created ${result.createdCount} Training Pages and skipped ${result.skippedCount} existing pages.`
      );
    } catch (error) {
      setMessage(error.message || "Could not import existing training content.");
    } finally {
      setIsWorking(false);
    }
  }

  const normalizedSearch = pageSearch.trim().toLowerCase();
  const filteredDocs = docs.filter((doc) => {
    const content = parseContentJson(doc.contentJson);
    const matchesSearch =
      !normalizedSearch ||
      [doc.title, doc.category, content.summary, content.body, content.ingredients, content.allergens, content.tags?.join?.(" ")]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch));
    const matchesStatus = pageStatusFilter === "all" || doc.status === pageStatusFilter;
    const contentType = content.contentType || doc.type || "custom";
    const matchesType = pageTypeFilter === "all" || contentType === pageTypeFilter || doc.type === pageTypeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });
  const groupedPages = groupPagesByCategory(filteredDocs, categories);
  const canImportOriginalContent = workspace.status === "ready" && isOriginalRezdoraWorkspace(workspace.restaurant);
  const editingDocFiles = fileAssets.filter((fileAsset) => fileAsset.trainingDocId === editingDocId);

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Training</p>
          <h1>Manage your training library</h1>
          <p>
            Add what your team needs to know, keep it organized, and choose when it becomes visible to staff.
          </p>
        </div>
        <div className="header-actions">
          <Link className="secondary-button" to="/training-library">View as staff</Link>
          <Link className="primary-button" to="/manager/import">Import material</Link>
        </div>
      </div>

      <div className="content-start-options" aria-label="Ways to manage training">
        <Link to="/manager/import">
          <strong>Import existing material</strong>
          <span>Best for menus, tech sheets, cocktail specs, and procedures you already have.</span>
        </Link>
        <a href="#training-page-form">
          <strong>Create one page</strong>
          <span>Add or update a single dish, drink, wine, procedure, or service standard.</span>
        </a>
        <a href="#library-sections">
          <strong>Organize sections</strong>
          <span>Choose how staff browse the library, using your restaurant's own language.</span>
        </a>
      </div>

      {workspace.status === "loading" || isWorking ? <div className="empty-panel">Working...</div> : null}

      {message ? <p className="form-message page-message">{message}</p> : null}

      {workspace.status === "empty" || workspace.status === "error" ? (
        <div className="form-card">
          <h2>Restaurant access needed</h2>
          <p>{workspace.message}</p>
          <Link className="primary-button full-width" to="/trial">
            Continue restaurant setup
          </Link>
        </div>
      ) : null}

      {workspace.status === "ready" ? (
        <>
          {canImportOriginalContent ? <section className="operator-section">
            <div className="operator-section-heading">
              <div>
                <p className="eyebrow">Rezdora library</p>
                <h2>Bring in the existing Rezdora training</h2>
                <p>
                  Add the training material already prepared for Rezdora. Line Up checks for matching pages so the same
                  material is not added twice.
                </p>
              </div>
            </div>

              <div className="import-panel">
                <div>
                  <h3>Original Rezdora Training Library</h3>
                  <p>
                    Add wines, cocktails, food items, and pasta tasting material to this restaurant.
                  </p>
                </div>
                <button className="primary-button" type="button" onClick={importExistingContent} disabled={isWorking}>
                  Add Rezdora Training
                </button>
              </div>
          </section> : null}

          <section className="operator-section" id="library-sections">
            <div className="operator-section-heading">
              <div>
                <p className="eyebrow">Library sections</p>
                <h2>Organize how staff find information</h2>
                <p>
                  Create sections that match how your restaurant already trains. Examples: Dinner Menu, Lunch Menu,
                  Antipasti, Primi, BTG Wines, Cocktails, SOPs, Opening Sidework, Steps of Service.
                </p>
              </div>
            </div>

            <div className="content-manager-grid">
              <form className="form-card" onSubmit={submitCategory}>
                <h3>{editingCategoryId ? "Edit section" : "Create a section"}</h3>

                <label>
                  Section name
                  <input
                    name="name"
                    value={categoryForm.name}
                    onChange={updateCategoryForm}
                    placeholder="Dinner Menu"
                    required
                  />
                </label>

                <label>
                  Description optional
                  <textarea
                    name="description"
                    value={categoryForm.description}
                    onChange={updateCategoryForm}
                    placeholder="BTG Wines, Opening SOPs, or any area your team studies."
                  />
                </label>

                <label>
                  Type
                  <select name="categoryType" value={categoryForm.categoryType} onChange={updateCategoryForm}>
                    <option value="foodMenu">Food Menu</option>
                    <option value="beverage">Beverage</option>
                    <option value="wine">Wine</option>
                    <option value="cocktail">Cocktail</option>
                    <option value="service">Service</option>
                    <option value="sop">SOP</option>
                    <option value="onboarding">Onboarding</option>
                    <option value="events">Events</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>

                <button className="primary-button full-width" type="submit" disabled={isWorking}>
                  {editingCategoryId ? "Save section" : "Create section"}
                </button>
                <button className="secondary-button full-width" type="button" onClick={resetCategoryForm}>
                  Clear form
                </button>
              </form>

              <section className="data-list-panel">
                <div className="data-list-heading">
                  <h3>Your library sections</h3>
                  <button className="secondary-button" type="button" onClick={loadContentPage} disabled={isWorking}>
                    Refresh
                  </button>
                </div>

                {categories.length === 0 ? (
                  <p className="empty-panel">Create your first section, such as Dinner Menu, BTG Wines, Cocktails, or Opening Procedures.</p>
                ) : (
                  <div className="operator-card-list">
                    {categories.map((category) => (
                      <article className="operator-list-card" key={category.id}>
                        <div>
                          <span className="type-pill">{categoryTypeLabels[category.categoryType] || "Custom"}</span>
                          <span className={`status-badge status-${category.status || "active"}`}>{category.status || "active"}</span>
                          <h4>{category.name}</h4>
                          <p>{category.description || "No description yet."}</p>
                        </div>
                        <div className="card-actions">
                          <button className="secondary-button" type="button" onClick={() => editCategory(category)}>
                            Edit
                          </button>
                          <button className="secondary-button" type="button" onClick={() => archiveExistingCategory(category)}>
                            Archive
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </section>

          <section className="operator-section">
            <div className="operator-section-heading">
              <div>
                <p className="eyebrow">Training pages</p>
                <h2>Add something for your team to study</h2>
                <p>
                  Add the actual information your staff needs to study. This can be a dish tech sheet, wine note,
                  cocktail spec, SOP, menu item, service procedure, or pasted notes from Google Docs.
                </p>
              </div>
            </div>

            <div className="starter-template-grid" aria-label="Training page starters">
              {starterTemplates.map((template) => (
                <button
                  className={`starter-template-card ${form.contentType === template.contentType ? "is-selected" : ""}`}
                  key={template.contentType}
                  type="button"
                  onClick={() => startFromTemplate(template)}
                >
                  <span>{template.title}</span>
                  <p>{template.helper}</p>
                </button>
              ))}
            </div>

            <form className="form-card wide-form" id="training-page-form" onSubmit={submitPage}>
              <h3>{editingDocId ? "Edit Training Page" : "Create Training Page"}</h3>
              <p className="helper-text">Choose a starter above, then paste or type the information your staff needs.</p>

              <div className="field-pair">
                <label>
                  Title
                  <input name="title" value={form.title} onChange={updateForm} placeholder="Uovo Raviolo" required />
                </label>

                <label>
                  Library section
                  <select name="collectionId" value={form.collectionId} onChange={updateForm}>
                    <option value="">Unassigned</option>
                    {categories
                      .filter((category) => category.status !== "archived")
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              <div className="field-pair">
                <label>
                  Training type
                  <select name="contentType" value={form.contentType} onChange={updateForm}>
                    <option value="foodItem">Food Item</option>
                    <option value="wine">Wine</option>
                    <option value="cocktail">Cocktail</option>
                    <option value="sop">SOP</option>
                    <option value="serviceStandard">Service Standard</option>
                    <option value="menuOverview">Menu Overview</option>
                    <option value="tastingMenuCourse">Tasting Menu Course</option>
                    <option value="eventNote">Event Note</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>

                <label>
                  Visibility
                  <select name="status" value={form.status} onChange={updateForm}>
                    <option value="draft">Draft — managers only</option>
                    <option value="published">Published — visible to staff</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
              </div>

              <label>
                Short description
                <span className="helper-text">The quick explanation staff should remember.</span>
                <textarea
                  name="summary"
                  value={form.summary}
                  onChange={updateForm}
                  placeholder={
                    starterTemplates.find((template) => template.contentType === form.contentType)?.summaryPlaceholder ||
                    "Short staff-facing one-liner."
                  }
                />
              </label>

              <label>
                Training details
                <span className="helper-text">Paste from Google Docs, Word, email, or your existing training docs.</span>
                <textarea
                  className="large-textarea"
                  name="body"
                  value={form.body}
                  onChange={updateForm}
                  placeholder="Paste the full tech sheet, menu notes, SOP, or manager explanation here."
                />
              </label>

              <div className="optional-fields">
                <h4>Food / Beverage Details</h4>
                <p>Use these fields if they apply. Leave blank if they do not.</p>

                <div className="field-pair">
                  <label>
                    Ingredients
                    <textarea name="ingredients" value={form.ingredients} onChange={updateForm} />
                  </label>

                  <label>
                    Allergens
                    <textarea name="allergens" value={form.allergens} onChange={updateForm} />
                  </label>
                </div>

                <div className="field-pair">
                  <label>
                    Talking Points
                    <textarea name="talkingPoints" value={form.talkingPoints} onChange={updateForm} />
                  </label>

                  <label>
                    Service Notes
                    <textarea name="serviceNotes" value={form.serviceNotes} onChange={updateForm} />
                  </label>
                </div>
              </div>

              <label>
                Tags
                <input name="tags" value={form.tags} onChange={updateForm} placeholder="antipasti, nebbiolo, opening" />
              </label>

              <section className="knowledge-section">
                <div className="operator-section-heading compact-operator-heading">
                  <div>
                    <p className="eyebrow">Quiz facts</p>
                    <h2>What should staff remember?</h2>
                    <p>
                      Add the key facts staff should know. Line Up uses these to generate useful quiz questions later.
                    </p>
                  </div>
                  <button className="secondary-button" type="button" onClick={() => setKnowledgeItems((items) => [...items, makeEmptyKnowledgeItem()])}>
                    Add another fact
                  </button>
                </div>

                <div className="example-strip">
                  <span>Allergen → Contains dairy and gluten</span>
                  <span>Main ingredient → Pork sausage</span>
                  <span>Wine region → Emilia-Romagna</span>
                  <span>Service note → Must be explained tableside</span>
                  <span>Pairing → Works well with Sangiovese</span>
                </div>

                {knowledgeItems.map((item, index) => (
                  <div className="knowledge-card" key={`${index}-${item.label}`}>
                    <label>
                      What should staff know?
                      <input
                        value={item.label}
                        onChange={(event) => updateKnowledgeItem(index, "label", event.target.value)}
                        placeholder="Allergens"
                      />
                    </label>

                    <label>
                      Correct answer
                      <textarea
                        value={item.value}
                        onChange={(event) => updateKnowledgeItem(index, "value", event.target.value)}
                        placeholder="Contains gluten, dairy, and egg."
                      />
                    </label>

                    <label>
                      Optional quiz question
                      <input
                        value={item.questionHint}
                        onChange={(event) => updateKnowledgeItem(index, "questionHint", event.target.value)}
                        placeholder="What allergens are in the Uovo Raviolo?"
                      />
                    </label>

                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={item.quizEligible}
                        onChange={(event) => updateKnowledgeItem(index, "quizEligible", event.target.checked)}
                      />
                      Include in quizzes
                    </label>

                    <button className="quiet-danger-button" type="button" onClick={() => setKnowledgeItems((items) => items.filter((_, itemIndex) => itemIndex !== index))}>
                      Remove
                    </button>
                  </div>
                ))}
              </section>

              <section className="knowledge-section">
                <div className="operator-section-heading compact-operator-heading">
                  <div>
                    <p className="eyebrow">Attachments</p>
                    <h2>Add a file or image</h2>
                    <p>Upload the original menu, tech sheet, SOP, image, or document this training page came from.</p>
                  </div>
                </div>

                {!editingDocId ? (
                  <p className="helper-text">Save this Training Page first. Then edit it to attach PDFs, images, menus, or source docs.</p>
                ) : (
                  <>
                    <label>
                      Choose file
                      <input
                        type="file"
                        accept=".pdf,image/*,.doc,.docx,.txt,.csv,.xls,.xlsx"
                        onChange={(event) => setSelectedSourceFile(event.target.files?.[0] || null)}
                      />
                    </label>

                    <button className="secondary-button" type="button" onClick={attachSourceFile} disabled={isWorking || !selectedSourceFile}>
                      Add attachment
                    </button>

                    {editingDocFiles.length === 0 ? (
                      <p className="helper-text">No attached source files yet.</p>
                    ) : (
                      <div className="operator-card-list">
                        {editingDocFiles.map((fileAsset) => (
                          <article className="operator-list-card" key={fileAsset.id}>
                            <div>
                              <h4>{fileAsset.fileName}</h4>
                              <p>{fileAsset.fileType || "File"} · {Math.round((fileAsset.fileSize || 0) / 1024)} KB</p>
                            </div>
                            <div className="card-actions">
                              <button className="secondary-button" type="button" onClick={() => openFile(fileAsset)}>
                                View
                              </button>
                              <button className="quiet-danger-button" type="button" onClick={() => removeFile(fileAsset)}>
                                Remove
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </section>

              <div className="form-button-row">
                <button className="primary-button" type="submit" disabled={isWorking}>
                  {editingDocId ? "Save Training Page" : "Create Training Page"}
                </button>
                <button className="secondary-button" type="button" onClick={resetPageForm}>
                  Clear Page Form
                </button>
              </div>
            </form>
          </section>

          <section className="operator-section">
            <div className="operator-section-heading">
              <div>
                <p className="eyebrow">Your library</p>
                <h2>All training pages</h2>
                <p>Drafts are only visible to managers. Published pages are visible to staff.</p>
              </div>
              <button className="secondary-button" type="button" onClick={loadContentPage} disabled={isWorking}>
                Refresh
              </button>
            </div>

            <div className="content-filter-bar">
              <label>
                Search pages
                <input
                  type="search"
                  value={pageSearch}
                  onChange={(event) => setPageSearch(event.target.value)}
                  placeholder="Search title, ingredient, allergen, grape, or note"
                />
              </label>
              <label>
                Status
                <select value={pageStatusFilter} onChange={(event) => setPageStatusFilter(event.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
              <label>
                Type
                <select value={pageTypeFilter} onChange={(event) => setPageTypeFilter(event.target.value)}>
                  <option value="all">All types</option>
                  <option value="foodItem">Food Item</option>
                  <option value="wine">Wine</option>
                  <option value="cocktail">Cocktail</option>
                  <option value="sop">SOP</option>
                  <option value="serviceStandard">Service Standard</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
            </div>

            {docs.length === 0 ? (
              <p className="empty-panel">Add your first Training Page by pasting a tech sheet, SOP, wine note, or menu description.</p>
            ) : filteredDocs.length === 0 ? (
              <p className="empty-panel">No Training Pages match those filters.</p>
            ) : (
              <div className="training-page-groups">
                {groupedPages.map((group) => (
                  <section className="training-page-group" key={group.id}>
                    <h3>{group.name}</h3>
                    <div className="operator-table">
                      {group.pages.map((doc) => {
                        const content = parseContentJson(doc.contentJson);
                        const displayType = contentTypeLabels[content.contentType] || contentTypeLabels[doc.type] || doc.type;
                        const attachmentCount = fileAssets.filter((fileAsset) => fileAsset.trainingDocId === doc.id).length;

                        return (
                          <article className="operator-table-row" key={doc.id}>
                            <div>
                              <h4>{doc.title}</h4>
                              <p>{displayType} — {doc.status || "draft"} — {attachmentCount} attached file{attachmentCount === 1 ? "" : "s"}</p>
                            </div>
                            <div className="card-actions">
                              <button className="secondary-button" type="button" onClick={() => editPage(doc)}>
                                Edit
                              </button>
                              {doc.status === "published" ? (
                                <button className="secondary-button" type="button" onClick={() => changeStatus(doc, "draft")}>
                                  Unpublish
                                </button>
                              ) : (
                                <button className="secondary-button" type="button" onClick={() => changeStatus(doc, "published")}>
                                  Publish
                                </button>
                              )}
                              <button className="secondary-button" type="button" onClick={() => changeStatus(doc, "archived")}>
                                Archive
                              </button>
                              <button className="quiet-danger-button" type="button" onClick={() => removePage(doc)}>
                                Delete
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}
