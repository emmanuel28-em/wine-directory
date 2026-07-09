import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { archiveCollection, listCollectionsForRestaurant, saveCollection } from "../lib/collections.js";
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
  const [form, setForm] = useState(emptyTrainingDocForm);
  const [knowledgeItems, setKnowledgeItems] = useState([makeEmptyKnowledgeItem()]);
  const [editingDocId, setEditingDocId] = useState(null);
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function refreshRestaurantContent(restaurantId) {
    const [nextCategories, nextDocs] = await Promise.all([
      listCollectionsForRestaurant(restaurantId, { includeArchived: true }),
      listTrainingDocsForRestaurant(restaurantId)
    ]);

    setCategories(nextCategories);
    setDocs(nextDocs);
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
    setMessage("");
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
      setMessage("Create a restaurant workspace before adding Training Categories.");
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
      setMessage(editingCategoryId ? "Training Category updated." : "Training Category created.");
    } catch (error) {
      setMessage(error.message || "Could not save the Training Category.");
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
      setMessage(error.message || "Could not archive the Training Category.");
    } finally {
      setIsWorking(false);
    }
  }

  async function submitPage(event) {
    event.preventDefault();

    if (workspace.status !== "ready") {
      setMessage("Create a restaurant workspace before adding Training Pages.");
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

  async function importExistingContent() {
    if (workspace.status !== "ready") {
      setMessage("No restaurant workspace found for this account.");
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

  const groupedPages = groupPagesByCategory(docs, categories);
  const canImportOriginalContent = workspace.status === "ready" && isOriginalRezdoraWorkspace(workspace.restaurant);

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Manager content</p>
          <h1>Training Library Setup</h1>
          <p>
            Build your restaurant training library in three steps: create categories, add pages, then mark what staff should know.
          </p>
        </div>
        <Link className="secondary-button" to="/manager">
          Back to Dashboard
        </Link>
      </div>

      <div className="workflow-strip">
        <span>1. Create category</span>
        <span>2. Add training page</span>
        <span>3. Add testable staff knowledge</span>
        <span>4. Publish to staff library</span>
      </div>

      {workspace.status === "loading" || isWorking ? <div className="empty-panel">Working...</div> : null}

      {message ? <p className="form-message page-message">{message}</p> : null}

      {workspace.status === "empty" || workspace.status === "error" ? (
        <div className="form-card">
          <h2>Workspace setup needed</h2>
          <p>{workspace.message}</p>
          <Link className="primary-button full-width" to="/trial">
            Create Trial Workspace
          </Link>
        </div>
      ) : null}

      {workspace.status === "ready" ? (
        <>
          <section className="operator-section">
            <div className="operator-section-heading">
              <div>
                <p className="eyebrow">Import</p>
                <h2>Import Existing Training Content</h2>
                <p>
                  Bring the training content from the original static site into this restaurant workspace as published
                  Training Categories and Training Pages. The import checks for matching title and type so clicking twice
                  does not create duplicate pages.
                </p>
              </div>
            </div>

            {canImportOriginalContent ? (
              <div className="import-panel">
                <div>
                  <h3>Original Rezdora Training Library</h3>
                  <p>
                    This imports wines, cocktails, food items, and pasta tasting content into the active Rezdora workspace
                    connected to your logged-in account.
                  </p>
                </div>
                <button className="primary-button" type="button" onClick={importExistingContent} disabled={isWorking}>
                  Import Existing Training Content
                </button>
              </div>
            ) : (
              <div className="import-panel">
                <div>
                  <h3>Have existing docs from another restaurant?</h3>
                  <p>
                    Use managed setup for menus, Google Docs, tech sheets, SOPs, wine lists, and cocktail specs from a
                    different restaurant.
                  </p>
                </div>
                <Link className="secondary-button" to="/managed-setup">
                  Request Managed Setup
                </Link>
              </div>
            )}
          </section>

          <section className="operator-section">
            <div className="operator-section-heading">
              <div>
                <p className="eyebrow">Section 1</p>
                <h2>Organize Your Training Library</h2>
                <p>
                  Create categories that match how your restaurant already trains. Examples: Dinner Menu, Lunch Menu,
                  Antipasti, Primi, BTG Wines, Cocktails, SOPs, Opening Sidework, Steps of Service.
                </p>
              </div>
            </div>

            <div className="content-manager-grid">
              <form className="form-card" onSubmit={submitCategory}>
                <h3>{editingCategoryId ? "Edit Training Category" : "Create Training Category"}</h3>

                <label>
                  Category Name
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
                  {editingCategoryId ? "Save Training Category" : "Create Training Category"}
                </button>
                <button className="secondary-button full-width" type="button" onClick={resetCategoryForm}>
                  Clear Category Form
                </button>
              </form>

              <section className="data-list-panel">
                <div className="data-list-heading">
                  <h3>Training Categories</h3>
                  <button className="secondary-button" type="button" onClick={loadContentPage} disabled={isWorking}>
                    Refresh
                  </button>
                </div>

                {categories.length === 0 ? (
                  <p className="empty-panel">Start by creating a Training Category, like Dinner Menu, BTG Wines, Cocktails, or SOPs.</p>
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
                <p className="eyebrow">Section 2</p>
                <h2>Add Staff Training Material</h2>
                <p>
                  Add the actual information your staff needs to study. This can be a dish tech sheet, wine note,
                  cocktail spec, SOP, menu item, service procedure, or pasted notes from Google Docs.
                </p>
              </div>
            </div>

            <form className="form-card wide-form" onSubmit={submitPage}>
              <h3>{editingDocId ? "Edit Training Page" : "Create Training Page"}</h3>

              <div className="field-pair">
                <label>
                  Title
                  <input name="title" value={form.title} onChange={updateForm} placeholder="Uovo Raviolo" required />
                </label>

                <label>
                  Training Category
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
                  Content Type
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
                  Status
                  <select name="status" value={form.status} onChange={updateForm}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>
              </div>

              <label>
                One-Liner
                <span className="helper-text">The short version staff should remember.</span>
                <textarea
                  name="summary"
                  value={form.summary}
                  onChange={updateForm}
                  placeholder="Signature egg yolk raviolo with ricotta and brown butter."
                />
              </label>

              <label>
                Full Notes
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
                    <p className="eyebrow">Section 3</p>
                    <h2>What Should Staff Be Tested On?</h2>
                    <p>
                      Add the key facts staff should know. These will later help generate quizzes and track training.
                    </p>
                  </div>
                  <button className="secondary-button" type="button" onClick={() => setKnowledgeItems((items) => [...items, makeEmptyKnowledgeItem()])}>
                    Add Another Testable Fact
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
                      Testable: Yes
                    </label>

                    <button className="quiet-danger-button" type="button" onClick={() => setKnowledgeItems((items) => items.filter((_, itemIndex) => itemIndex !== index))}>
                      Remove
                    </button>
                  </div>
                ))}
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
                <p className="eyebrow">Training Page List</p>
                <h2>Existing Training Pages</h2>
                <p>Grouped by Training Category so managers can scan the library quickly.</p>
              </div>
              <button className="secondary-button" type="button" onClick={loadContentPage} disabled={isWorking}>
                Refresh
              </button>
            </div>

            {docs.length === 0 ? (
              <p className="empty-panel">Add your first Training Page by pasting a tech sheet, SOP, wine note, or menu description.</p>
            ) : (
              <div className="training-page-groups">
                {groupedPages.map((group) => (
                  <section className="training-page-group" key={group.id}>
                    <h3>{group.name}</h3>
                    <div className="operator-table">
                      {group.pages.map((doc) => {
                        const content = parseContentJson(doc.contentJson);
                        const displayType = contentTypeLabels[content.contentType] || contentTypeLabels[doc.type] || doc.type;

                        return (
                          <article className="operator-table-row" key={doc.id}>
                            <div>
                              <h4>{doc.title}</h4>
                              <p>{displayType} — {doc.status || "draft"}</p>
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
