import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { archiveCollection, listCollectionsForRestaurant, saveCollection } from "../lib/collections.js";
import {
  deleteFileAsset,
  getFileAssetUrl,
  isPreviewableImageFileAsset,
  listFileAssetsForRestaurant,
  uploadFileAsset
} from "../lib/fileAssets.js";
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

function formatUpdatedDate(value) {
  if (!value) {
    return "Not saved yet";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function getDocSectionIds(doc) {
  const content = parseContentJson(doc.contentJson);
  return Array.isArray(content.sectionIds) && content.sectionIds.length
    ? content.sectionIds
    : doc.collectionId
      ? [doc.collectionId]
      : [];
}

function getDocSearchText(doc, categories) {
  const content = parseContentJson(doc.contentJson);
  const sectionNames = getDocSectionIds(doc).map((sectionId) => getCategoryName(categories, sectionId));

  return [
    doc.title,
    doc.category,
    doc.status,
    doc.type,
    content.summary,
    content.body,
    content.details,
    content.ingredients,
    content.allergens,
    content.talkingPoints,
    content.serviceNotes,
    Array.isArray(content.tags) ? content.tags.join(" ") : "",
    sectionNames.join(" ")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getSectionCounts(docs, categories) {
  return categories.map((category) => ({
    ...category,
    pageCount: docs.filter((doc) => getDocSectionIds(doc).includes(category.id)).length
  }));
}

function getVisualRowsForDocs(docs, categories, selectedSectionId) {
  const visibleCategories = categories.filter((category) => category.status !== "archived");
  const rows = [];

  visibleCategories.forEach((category) => {
    if (selectedSectionId !== "all" && selectedSectionId !== category.id) {
      return;
    }

    const pages = docs.filter((doc) => getDocSectionIds(doc).includes(category.id));

    if (pages.length) {
      rows.push({
        id: category.id,
        name: category.name,
        description: category.description || categoryTypeLabels[category.categoryType] || "Training section",
        pages
      });
    }
  });

  if (selectedSectionId === "all") {
    const unassignedPages = docs.filter((doc) => getDocSectionIds(doc).length === 0);

    if (unassignedPages.length) {
      rows.push({
        id: "unassigned",
        name: "Unassigned",
        description: "Pages that still need a section",
        pages: unassignedPages
      });
    }
  }

  if (rows.length === 0 && docs.length > 0) {
    rows.push({
      id: "results",
      name: "Matching pages",
      description: "Filtered results",
      pages: docs
    });
  }

  return rows;
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

export default function ManagerContentPage() {
  const workspace = useCurrentWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [selectedSectionId, setSelectedSectionId] = useState("all");
  const [sidebarView, setSidebarView] = useState("all");
  const [sortMode, setSortMode] = useState("recent");
  const [workspaceMode, setWorkspaceMode] = useState("list");
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [saveState, setSaveState] = useState("Saved");
  const [filePreviewUrls, setFilePreviewUrls] = useState({});

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
      setFileAssets([]);
      setFilePreviewUrls({});
    }
  }, [workspace.status, workspace.restaurant?.id]);

  useEffect(() => {
    if (workspace.status !== "ready" || fileAssets.length === 0) {
      setFilePreviewUrls({});
      return;
    }

    let shouldUpdate = true;

    async function loadImagePreviews() {
      const previewableFiles = fileAssets.filter(isPreviewableImageFileAsset);
      const previewEntries = await Promise.all(
        previewableFiles.map(async (fileAsset) => {
          try {
            const url = await getFileAssetUrl({
              fileAsset,
              restaurantId: workspace.restaurant.id
            });
            return [fileAsset.id, url];
          } catch {
            return null;
          }
        })
      );

      if (shouldUpdate) {
        setFilePreviewUrls(Object.fromEntries(previewEntries.filter(Boolean)));
      }
    }

    loadImagePreviews();

    return () => {
      shouldUpdate = false;
    };
  }, [fileAssets, workspace.status, workspace.restaurant?.id]);

  useEffect(() => {
    const requestedDocId = searchParams.get("edit");

    if (!requestedDocId || docs.length === 0) {
      return;
    }

    const requestedDoc = docs.find((doc) => doc.id === requestedDocId);

    if (requestedDoc) {
      editPage(requestedDoc);
      document.getElementById("training-page-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      setSearchParams({}, { replace: true });
    }
  }, [docs, searchParams, setSearchParams]);

  function updateForm(event) {
    const { name, value } = event.target;
    setSaveState("Unsaved changes");
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  }

  function toggleSection(sectionId) {
    setSaveState("Unsaved changes");
    setForm((currentForm) => {
      const currentSectionIds = Array.isArray(currentForm.sectionIds)
        ? currentForm.sectionIds
        : currentForm.collectionId
          ? [currentForm.collectionId]
          : [];
      const nextSectionIds = currentSectionIds.includes(sectionId)
        ? currentSectionIds.filter((id) => id !== sectionId)
        : [...currentSectionIds, sectionId];

      return {
        ...currentForm,
        sectionIds: nextSectionIds,
        collectionId: nextSectionIds[0] || ""
      };
    });
  }

  function updateCategoryForm(event) {
    const { name, value } = event.target;
    setCategoryForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  }

  function updateKnowledgeItem(index, field, value) {
    setSaveState("Unsaved changes");
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
    setWorkspaceMode("list");
    setSaveState("Saved");
    setMessage("");
  }

  function startNewPage() {
    setForm(emptyTrainingDocForm);
    setKnowledgeItems([makeEmptyKnowledgeItem()]);
    setEditingDocId(null);
    setSelectedSourceFile(null);
    setWorkspaceMode("editor");
    setSaveState("Unsaved draft");
    setMessage("New draft ready. Add a title, choose sections, write the page, then save.");
  }

  function startFromTemplate(template) {
    setForm((currentForm) => ({
      ...currentForm,
      contentType: template.contentType,
      status: "draft",
      tags: currentForm.tags || template.tags
    }));
    setWorkspaceMode("editor");
    setSaveState("Unsaved changes");
    setMessage(
      `Starting a ${template.title} Training Page. Fill in the title, notes, and staff knowledge, then save as a draft.`
    );
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
    setShowSectionForm(true);
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
    setWorkspaceMode("editor");
    setSaveState("Saved");
    setMessage(`Editing Training Page: ${doc.title}.`);
  }

  async function submitCategory(event) {
    event.preventDefault();

    if (workspace.status !== "ready") {
      setMessage("Finish setting up your restaurant before adding library sections.");
      return;
    }

    setIsWorking(true);
    setSaveState("Saving");
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
      setShowSectionForm(false);
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

  async function savePage(statusOverride) {
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
          status: statusOverride || form.status,
          quizFactsJson: JSON.stringify(getCleanKnowledgeItems(knowledgeItems))
        },
        editingDocId,
        restaurantId: workspace.restaurant.id,
        userProfileId: workspace.userProfile.id
      });

      await refreshRestaurantContent(workspace.restaurant.id);
      resetPageForm();
      setSaveState("Saved");
      setMessage(statusOverride === "published" ? "Training Page published." : editingDocId ? "Training Page updated." : "Training Page created.");
    } catch (error) {
      setSaveState("Save failed");
      setMessage(error.message || "Could not save the Training Page.");
    } finally {
      setIsWorking(false);
    }
  }

  async function submitPage(event) {
    event.preventDefault();
    await savePage();
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

  const normalizedSearch = pageSearch.trim().toLowerCase();
  const filteredDocs = docs.filter((doc) => {
    const content = parseContentJson(doc.contentJson);
    const sectionIds = getDocSectionIds(doc);
    const matchesSearch = !normalizedSearch || getDocSearchText(doc, categories).includes(normalizedSearch);
    const viewStatus =
      sidebarView === "drafts"
        ? "draft"
        : sidebarView === "published"
          ? "published"
          : sidebarView === "archived"
            ? "archived"
            : "";
    const matchesSidebarView = !viewStatus || doc.status === viewStatus;
    const matchesStatus = pageStatusFilter === "all" || doc.status === pageStatusFilter;
    const matchesSection = selectedSectionId === "all" || sectionIds.includes(selectedSectionId);
    const contentType = content.contentType || doc.type || "custom";
    const matchesType = pageTypeFilter === "all" || contentType === pageTypeFilter || doc.type === pageTypeFilter;

    return matchesSearch && matchesSidebarView && matchesStatus && matchesSection && matchesType;
  });
  const sortedDocs = [...filteredDocs].sort((left, right) => {
    if (sortMode === "alpha") {
      return (left.title || "").localeCompare(right.title || "");
    }

    return new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0);
  });
  const editingDoc = docs.find((doc) => doc.id === editingDocId);
  const editingDocFiles = fileAssets.filter((fileAsset) => fileAsset.trainingDocId === editingDocId);
  const sectionCounts = getSectionCounts(docs, categories.filter((category) => category.status !== "archived"));
  const selectedSection = categories.find((category) => category.id === selectedSectionId);
  const draftCount = docs.filter((doc) => doc.status === "draft").length;
  const publishedCount = docs.filter((doc) => doc.status === "published").length;
  const archivedCount = docs.filter((doc) => doc.status === "archived").length;
  const visualRows = getVisualRowsForDocs(sortedDocs, categories, selectedSectionId);

  return (
    <section className="page-section training-workspace-page">
      <div className="training-workspace-header">
        <div>
          <p className="eyebrow">Training</p>
          <h1>Training Library</h1>
          <p>Find, write, organize, and publish the pages your team studies before service.</p>
        </div>
        <label className="training-search">
          <span>Search</span>
          <input
            type="search"
            value={pageSearch}
            onChange={(event) => setPageSearch(event.target.value)}
            placeholder="Search pages, ingredients, allergens, grapes, SOP notes..."
          />
        </label>
        <div className="header-actions">
          <button className="primary-button" type="button" onClick={startNewPage}>
            New page
          </button>
          <Link className="secondary-button" to="/manager/import">Let Line Up build it</Link>
          <Link className="secondary-button" to="/training-library">View as staff</Link>
        </div>
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
        <div className="training-workspace-shell">
          <aside className="training-library-sidebar" aria-label="Training library filters">
            <div className="sidebar-section">
              <button
                className={`sidebar-filter ${sidebarView === "all" && selectedSectionId === "all" ? "is-active" : ""}`}
                type="button"
                onClick={() => {
                  setSidebarView("all");
                  setSelectedSectionId("all");
                  setWorkspaceMode("list");
                }}
              >
                <span>All pages</span>
                <strong>{docs.length}</strong>
              </button>
              <button
                className={`sidebar-filter ${sidebarView === "drafts" ? "is-active" : ""}`}
                type="button"
                onClick={() => {
                  setSidebarView("drafts");
                  setSelectedSectionId("all");
                  setWorkspaceMode("list");
                }}
              >
                <span>Drafts</span>
                <strong>{draftCount}</strong>
              </button>
              <button
                className={`sidebar-filter ${sidebarView === "published" ? "is-active" : ""}`}
                type="button"
                onClick={() => {
                  setSidebarView("published");
                  setSelectedSectionId("all");
                  setWorkspaceMode("list");
                }}
              >
                <span>Published</span>
                <strong>{publishedCount}</strong>
              </button>
              <button
                className={`sidebar-filter ${sidebarView === "archived" ? "is-active" : ""}`}
                type="button"
                onClick={() => {
                  setSidebarView("archived");
                  setSelectedSectionId("all");
                  setWorkspaceMode("list");
                }}
              >
                <span>Archived</span>
                <strong>{archivedCount}</strong>
              </button>
              <button
                className={`sidebar-filter ${sortMode === "recent" && sidebarView === "recent" ? "is-active" : ""}`}
                type="button"
                onClick={() => {
                  setSidebarView("recent");
                  setSelectedSectionId("all");
                  setSortMode("recent");
                  setWorkspaceMode("list");
                }}
              >
                <span>Recently edited</span>
                <strong>{Math.min(docs.length, 10)}</strong>
              </button>
            </div>

            <div className="sidebar-section">
              <div className="sidebar-heading-row">
                <h2>Sections</h2>
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    resetCategoryForm();
                    setShowSectionForm((current) => !current);
                  }}
                >
                  {showSectionForm ? "Close" : "Create"}
                </button>
              </div>

              {showSectionForm ? (
                <form className="sidebar-section-form" onSubmit={submitCategory}>
                  <label>
                    Section name
                    <input name="name" value={categoryForm.name} onChange={updateCategoryForm} placeholder="Dinner Menu" required />
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
                  <label>
                    Description
                    <textarea name="description" value={categoryForm.description} onChange={updateCategoryForm} placeholder="Optional" />
                  </label>
                  <button className="primary-button full-width" type="submit" disabled={isWorking}>
                    {editingCategoryId ? "Save section" : "Create section"}
                  </button>
                </form>
              ) : null}

              {sectionCounts.length === 0 ? (
                <p className="sidebar-empty">No sections yet. Create Lunch, Dinner, Cocktails, SOPs, or whatever fits this restaurant.</p>
              ) : (
                <div className="sidebar-section-list">
                  {sectionCounts.map((category) => (
                    <div className={`sidebar-section-item ${selectedSectionId === category.id ? "is-active" : ""}`} key={category.id}>
                      <button
                        className="sidebar-section-select"
                        type="button"
                        onClick={() => {
                          setSelectedSectionId(category.id);
                          setSidebarView("all");
                          setWorkspaceMode("list");
                        }}
                      >
                        <span>{category.name}</span>
                        <strong>{category.pageCount}</strong>
                      </button>
                      <div className="sidebar-section-actions">
                        <button className="text-button" type="button" onClick={() => editCategory(category)}>Edit</button>
                        <button className="text-button danger-text-button" type="button" onClick={() => archiveExistingCategory(category)}>Archive</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <main className="training-workspace-main">
            {workspaceMode === "list" ? (
              <section className="training-document-list">
                <div className="document-list-toolbar">
                  <div>
                    <p className="eyebrow">Documents</p>
                    <h2>{selectedSection ? selectedSection.name : sidebarView === "all" ? "All training pages" : `${sidebarView.charAt(0).toUpperCase()}${sidebarView.slice(1)}`}</h2>
                    <p>
                      Showing {sortedDocs.length} of {docs.length} page{docs.length === 1 ? "" : "s"}.
                    </p>
                  </div>
                  <div className="document-toolbar-controls">
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
                    <label>
                      Sort
                      <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
                        <option value="recent">Recently updated</option>
                        <option value="alpha">A to Z</option>
                      </select>
                    </label>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => {
                        setPageSearch("");
                        setPageStatusFilter("all");
                        setPageTypeFilter("all");
                        setSelectedSectionId("all");
                        setSidebarView("all");
                      }}
                    >
                      Clear filters
                    </button>
                  </div>
                </div>

                {docs.length === 0 ? (
                  <div className="empty-panel document-empty-state">
                    <h3>No training pages yet</h3>
                    <p>Create a blank page or import existing menus, tech sheets, SOPs, wine lists, or cocktail specs.</p>
                    <div className="form-button-row">
                      <button className="primary-button" type="button" onClick={startNewPage}>New page</button>
                      <Link className="secondary-button" to="/manager/import">Let Line Up build it</Link>
                    </div>
                  </div>
                ) : sortedDocs.length === 0 ? (
                  <div className="empty-panel document-empty-state">
                    <h3>No pages match that search</h3>
                    <p>Try a different word, status, type, or section.</p>
                  </div>
                ) : (
                  <div className="visual-library-rows" aria-label="Training page shelves">
                    {visualRows.map((row) => (
                      <section className="visual-library-row" key={row.id}>
                        <div className="visual-row-heading">
                          <div>
                            <h3>{row.name}</h3>
                            <p>{row.description} · {row.pages.length} page{row.pages.length === 1 ? "" : "s"}</p>
                          </div>
                          <button
                            className="text-button"
                            type="button"
                            onClick={() => {
                              setSelectedSectionId(row.id === "unassigned" || row.id === "results" ? "all" : row.id);
                              setSidebarView("all");
                            }}
                          >
                            View row
                          </button>
                        </div>

                        <div className="visual-card-track">
                          {row.pages.map((doc) => {
                            const content = parseContentJson(doc.contentJson);
                            const displayType = contentTypeLabels[content.contentType] || contentTypeLabels[doc.type] || doc.type;
                            const sectionNames = getDocSectionIds(doc).map((sectionId) => getCategoryName(categories, sectionId));
                            const docFiles = fileAssets.filter((fileAsset) => fileAsset.trainingDocId === doc.id);
                            const previewFile = docFiles.find((fileAsset) => filePreviewUrls[fileAsset.id]);
                            const quizFactCount = (content.testableStaffKnowledge || content.quizFacts || []).filter((item) => item.quizEligible !== false).length;

                            return (
                              <article className="visual-library-card" key={`${row.id}-${doc.id}`}>
                                <button className="visual-card-open" type="button" onClick={() => editPage(doc)}>
                                  <div className="visual-card-media">
                                    {previewFile ? (
                                      <img src={filePreviewUrls[previewFile.id]} alt="" />
                                    ) : (
                                      <div className="visual-card-fallback">
                                        <span>{displayType || "Training"}</span>
                                      </div>
                                    )}
                                    <span className={`status-badge status-${doc.status || "draft"}`}>{doc.status || "draft"}</span>
                                  </div>
                                  <div className="visual-card-copy">
                                    <strong>{doc.title}</strong>
                                    <span>{content.summary || sectionNames.join(", ") || "Open to review this training page."}</span>
                                  </div>
                                </button>
                                <div className="visual-card-meta">
                                  <span>{formatUpdatedDate(doc.updatedAt || doc.createdAt)}</span>
                                  <span>{quizFactCount ? `${quizFactCount} quiz facts` : "No quiz facts"}</span>
                                </div>
                                <div className="visual-card-actions">
                                  <button className="secondary-button" type="button" onClick={() => editPage(doc)}>Edit</button>
                                  {doc.status === "published" ? (
                                    <button className="secondary-button" type="button" onClick={() => changeStatus(doc, "draft")}>Unpublish</button>
                                  ) : (
                                    <button className="secondary-button" type="button" onClick={() => changeStatus(doc, "published")}>Publish</button>
                                  )}
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
            ) : (
              <section className="document-editor-panel" id="training-page-form">
                <form className="document-editor-form" onSubmit={submitPage}>
                  <div className="document-editor-topbar">
                    <button className="secondary-button" type="button" onClick={resetPageForm}>
                      Back to library
                    </button>
                    <div className={`save-state-pill save-state-${saveState.toLowerCase().replaceAll(" ", "-")}`}>
                      {saveState}
                    </div>
                    <div className="form-button-row">
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => {
                          setSaveState("Unsaved changes");
                          setForm((current) => ({ ...current, status: "draft" }));
                        }}
                      >
                        Keep draft
                      </button>
                      <button className="primary-button" type="submit" disabled={isWorking}>
                        {editingDocId ? "Save changes" : "Save draft"}
                      </button>
                      <button className="primary-button accent-button" type="button" onClick={() => savePage("published")} disabled={isWorking}>
                        Publish
                      </button>
                    </div>
                  </div>

                  <input
                    className="document-title-input"
                    name="title"
                    value={form.title}
                    onChange={updateForm}
                    placeholder="Untitled training page"
                    required
                  />

                  <div className="document-meta-row">
                    <label>
                      Status
                      <select name="status" value={form.status} onChange={updateForm}>
                        <option value="draft">Draft — managers only</option>
                        <option value="published">Published — visible to staff</option>
                        <option value="archived">Archived</option>
                      </select>
                    </label>
                    <label>
                      Type
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
                      Quick category
                      <input name="category" value={form.category} onChange={updateForm} placeholder="Antipasti, Course 1, Bar SOP..." />
                    </label>
                  </div>

                  <section className="document-block">
                    <div className="document-block-heading">
                      <h3>Sections</h3>
                      <button className="text-button" type="button" onClick={() => setShowSectionForm(true)}>Create section</button>
                    </div>
                    {categories.filter((category) => category.status !== "archived").length === 0 ? (
                      <p className="empty-panel">Create sections like Lunch Menu, Dinner Menu, Cocktails, Wine, SOPs, or Service Standards.</p>
                    ) : (
                      <div className="section-checkbox-grid compact-section-grid">
                        {categories
                          .filter((category) => category.status !== "archived")
                          .map((category) => {
                            const selectedSections = Array.isArray(form.sectionIds)
                              ? form.sectionIds
                              : form.collectionId
                                ? [form.collectionId]
                                : [];

                            return (
                              <label className="section-checkbox-card" key={category.id}>
                                <input
                                  type="checkbox"
                                  checked={selectedSections.includes(category.id)}
                                  onChange={() => toggleSection(category.id)}
                                />
                                <span>
                                  <strong>{category.name}</strong>
                                  <small>{category.description || categoryTypeLabels[category.categoryType] || "Library section"}</small>
                                </span>
                              </label>
                            );
                          })}
                      </div>
                    )}
                  </section>

                  <label className="document-block">
                    <span className="document-field-label">One-liner</span>
                    <textarea
                      name="summary"
                      value={form.summary}
                      onChange={updateForm}
                      placeholder={starterTemplates.find((template) => template.contentType === form.contentType)?.summaryPlaceholder || "Short staff-facing one-liner."}
                    />
                  </label>

                  <label className="document-block">
                    <span className="document-field-label">Training notes</span>
                    <textarea
                      className="large-textarea tech-sheet-editor"
                      name="body"
                      value={form.body}
                      onChange={updateForm}
                      placeholder="Write freely or paste from Google Docs, Word, email, a copied PDF, or existing manager notes."
                    />
                  </label>

                  <details className="document-details-panel" open>
                    <summary>Structured details</summary>
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
                    <label>
                      Tags
                      <input name="tags" value={form.tags} onChange={updateForm} placeholder="antipasti, nebbiolo, opening" />
                    </label>
                  </details>

                  <details className="document-details-panel">
                    <summary>Testable Staff Knowledge</summary>
                    <p className="helper-text">Add the key facts Line Up should use when drafting quizzes.</p>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => {
                        setSaveState("Unsaved changes");
                        setKnowledgeItems((items) => [...items, makeEmptyKnowledgeItem()]);
                      }}
                    >
                      Add fact
                    </button>
                    {knowledgeItems.map((item, index) => (
                      <div className="knowledge-card" key={`${index}-${item.label}`}>
                        <label>
                          What should staff know?
                          <input value={item.label} onChange={(event) => updateKnowledgeItem(index, "label", event.target.value)} placeholder="Allergens" />
                        </label>
                        <label>
                          Correct answer
                          <textarea value={item.value} onChange={(event) => updateKnowledgeItem(index, "value", event.target.value)} placeholder="Contains gluten, dairy, and egg." />
                        </label>
                        <label>
                          Optional quiz question
                          <input value={item.questionHint} onChange={(event) => updateKnowledgeItem(index, "questionHint", event.target.value)} placeholder="What allergens are in this dish?" />
                        </label>
                        <label className="checkbox-label">
                          <input type="checkbox" checked={item.quizEligible} onChange={(event) => updateKnowledgeItem(index, "quizEligible", event.target.checked)} />
                          Include in quizzes
                        </label>
                        <button
                          className="quiet-danger-button"
                          type="button"
                          onClick={() => {
                            setSaveState("Unsaved changes");
                            setKnowledgeItems((items) => items.filter((_, itemIndex) => itemIndex !== index));
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </details>

                  <details className="document-details-panel">
                    <summary>Attachments</summary>
                    {!editingDocId ? (
                      <p className="helper-text">Save this page first. Then edit it to attach photos, PDFs, menus, SOPs, or source docs.</p>
                    ) : (
                      <>
                        <label>
                          Choose file
                          <input type="file" accept=".pdf,image/*,.heic,.heif,.doc,.docx,.txt,.csv,.xls,.xlsx" onChange={(event) => setSelectedSourceFile(event.target.files?.[0] || null)} />
                        </label>
                        <p className="helper-text">Use JPG or PNG when you want an image to show directly on the staff card.</p>
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
                                  <button className="secondary-button" type="button" onClick={() => openFile(fileAsset)}>View</button>
                                  <button className="quiet-danger-button" type="button" onClick={() => removeFile(fileAsset)}>Remove</button>
                                </div>
                              </article>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </details>

                  <div className="document-danger-row">
                    {editingDoc ? (
                      <>
                        <button className="secondary-button" type="button" onClick={() => changeStatus(editingDoc, "archived")}>
                          Archive
                        </button>
                        <button className="quiet-danger-button" type="button" onClick={() => removePage(editingDoc)}>
                          Delete
                        </button>
                      </>
                    ) : null}
                  </div>
                </form>
              </section>
            )}
          </main>
        </div>
      ) : null}
    </section>
  );
}
