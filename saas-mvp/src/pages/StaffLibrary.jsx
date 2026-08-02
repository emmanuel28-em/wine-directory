import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import {
  getAssignedItemIdsForUser,
  listStaffGroupMembersForRestaurant,
  listTrainingAssignmentsForRestaurant
} from "../lib/assignments.js";
import { listCollectionsForRestaurant } from "../lib/collections.js";
import { getFileAssetUrl, isPreviewableImageFileAsset, listFileAssetsForRestaurant } from "../lib/fileAssets.js";
import { isAdminOrManager } from "../lib/permissions.js";
import {
  buildReviewQuestionsForDoc,
  reviewPassingScore,
  reviewQuestionCount
} from "../lib/reviewQuestions.js";
import { listTrainingDocsForRestaurant, parseContentJson } from "../lib/trainingDocs.js";
import {
  listMyTrainingAcknowledgements,
  markTrainingDocReviewed
} from "../lib/trainingAcknowledgements.js";

const typeLabels = {
  wine: "Wine",
  cocktail: "Cocktail",
  food: "Food",
  sop: "SOP",
  pastaTasting: "Pasta Tasting",
  custom: "Custom"
};

const allFilter = "all";
const toStudyFilter = "to-study";
const assignedFilter = "assigned";
const reviewedFilter = "reviewed";

const collectionOrder = [
  "Lunch Menu",
  "Brunch Menu",
  "Dinner Menu",
  "Pasta Tasting Menu",
  "Vegetarian Pasta Tasting",
  "Desserts",
  "Cocktails",
  "BTG Wines",
  "Wine Pairings",
  "Spirits",
  "SOPs",
  "Food Items"
];

const subsectionOrder = ["Antipasta", "Primi", "Secondi", "Verdure", "Course 1", "Course 2", "Course 3", "Course 4", "Course 5"];

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

function getSectionLabel(doc, collection) {
  const name = collection?.name || "";
  const category = doc.category || "";
  const type = doc.type || "";
  const combined = normalizeValue(`${name} ${category} ${type}`);

  if (combined.includes("lunch")) return "Lunch Menu";
  if (combined.includes("brunch")) return "Brunch Menu";
  if (combined.includes("dinner")) return "Dinner Menu";
  if (combined.includes("vegetarian") && combined.includes("pasta")) return "Vegetarian Pasta Tasting";
  if (combined.includes("dessert") || combined.includes("gelati") || combined.includes("sorbet")) return "Desserts";
  if (combined.includes("cocktail")) return "Cocktails";
  if (combined.includes("pasta")) return "Pasta Tasting Menu";
  if (combined.includes("pairing")) return "Wine Pairings";
  if (combined.includes("btg") || combined.includes("by-the-glass")) return "BTG Wines";
  if (
    combined.includes("spirit") ||
    combined.includes("agave") ||
    combined.includes("amari") ||
    combined.includes("aperitivo") ||
    combined.includes("beer") ||
    combined.includes("gin") ||
    combined.includes("grappa") ||
    combined.includes("liqueur") ||
    combined.includes("vermouth") ||
    combined.includes("vodka") ||
    combined.includes("whiskey")
  ) return "Spirits";
  if (combined.includes("sop") || combined.includes("procedure")) return "SOPs";

  if (type === "cocktail") return "Cocktails";
  if (type === "pastaTasting") return "Pasta Tasting Menu";
  if (type === "wine") return "BTG Wines";
  if (type === "sop") return "SOPs";
  if (type === "food") return "Food Items";

  return name || "Unassigned";
}

function getSubsectionLabel(doc) {
  const category = doc.category || "";
  const normalized = normalizeValue(category);

  if (normalized.includes("antipasta") || normalized.includes("antipasti")) return "Antipasta";
  if (normalized.includes("primi")) return "Primi";
  if (normalized.includes("secondi")) return "Secondi";
  if (normalized.includes("verdure")) return "Verdure";
  if (normalized.includes("course 1")) return "Course 1";
  if (normalized.includes("course 2")) return "Course 2";
  if (normalized.includes("course 3")) return "Course 3";
  if (normalized.includes("course 4")) return "Course 4";
  if (normalized.includes("course 5")) return "Course 5";

  return category.trim();
}

function docMatchesSearch(doc, collection, searchTerm) {
  if (!searchTerm) return true;

  const content = parseContentJson(doc.contentJson);
  const searchableText = [
    doc.title,
    doc.type,
    doc.category,
    collection?.name,
    content.summary,
    content.body,
    content.details,
    content.ingredients,
    content.allergens,
    content.talkingPoints,
    content.serviceNotes,
    content.tags?.join?.(" ")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(searchTerm);
}

function groupStaffRows(items) {
  const groups = new Map();

  items.forEach((item) => {
    const rowName = item.subsection ? `${item.section} · ${item.subsection}` : item.section || "Training Library";
    const rowDescription = item.collection?.description || "Training pages to review before service.";

    if (!groups.has(rowName)) {
      groups.set(rowName, {
        id: rowName,
        name: rowName,
        description: rowDescription,
        items: []
      });
    }

    groups.get(rowName).items.push(item);
  });

  return [...groups.values()].sort((left, right) => {
    const leftBase = left.name.split(" · ")[0];
    const rightBase = right.name.split(" · ")[0];
    const sectionA = collectionOrder.indexOf(leftBase);
    const sectionB = collectionOrder.indexOf(rightBase);
    const safeSectionA = sectionA === -1 ? 999 : sectionA;
    const safeSectionB = sectionB === -1 ? 999 : sectionB;
    return safeSectionA - safeSectionB || left.name.localeCompare(right.name);
  });
}

export default function StaffLibrary() {
  const workspace = useCurrentWorkspace();
  const [searchParams] = useSearchParams();
  const [collections, setCollections] = useState([]);
  const [docs, setDocs] = useState([]);
  const [fileAssets, setFileAssets] = useState([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState({});
  const [acknowledgements, setAcknowledgements] = useState([]);
  const [assignedTrainingDocIds, setAssignedTrainingDocIds] = useState(new Set());
  const [assignedCollectionIds, setAssignedCollectionIds] = useState(new Set());
  const [reviewingDocId, setReviewingDocId] = useState("");
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sectionFilter, setSectionFilter] = useState(allFilter);
  const [subsectionFilter, setSubsectionFilter] = useState(allFilter);
  const [studyStatusFilter, setStudyStatusFilter] = useState(allFilter);
  const [activeReviewDocId, setActiveReviewDocId] = useState("");
  const [activeReaderDocId, setActiveReaderDocId] = useState("");
  const [reviewQuestions, setReviewQuestions] = useState([]);
  const [reviewAnswers, setReviewAnswers] = useState({});
  const [reviewResult, setReviewResult] = useState(null);

  async function loadStaffLibrary() {
    if (workspace.status !== "ready") {
      return;
    }

    setMessage("");

    try {
      const [restaurantCollections, restaurantDocs, restaurantFiles, myAcknowledgements, assignments, groupMembers] = await Promise.all([
        listCollectionsForRestaurant(workspace.restaurant.id),
        listTrainingDocsForRestaurant(workspace.restaurant.id),
        listFileAssetsForRestaurant(workspace.restaurant.id),
        listMyTrainingAcknowledgements({
          restaurantId: workspace.restaurant.id,
          userProfileId: workspace.userProfile.id
        }),
        listTrainingAssignmentsForRestaurant(workspace.restaurant.id),
        listStaffGroupMembersForRestaurant(workspace.restaurant.id)
      ]);

      setCollections(restaurantCollections);
      setDocs(restaurantDocs.filter((doc) => doc.status === "published"));
      setFileAssets(restaurantFiles);
      setAcknowledgements(myAcknowledgements);
      setAssignedTrainingDocIds(
        getAssignedItemIdsForUser({
          assignments,
          groupMembers,
          userProfileId: workspace.userProfile.id,
          itemType: "trainingDoc"
        })
      );
      setAssignedCollectionIds(
        getAssignedItemIdsForUser({
          assignments,
          groupMembers,
          userProfileId: workspace.userProfile.id,
          itemType: "collection"
        })
      );
    } catch (error) {
      setMessage(error.message || "Could not load the staff library.");
    }
  }

  useEffect(() => {
    if (workspace.status === "ready") {
      loadStaffLibrary();
    }

    if (workspace.status === "empty" || workspace.status === "error") {
      setCollections([]);
      setDocs([]);
      setFileAssets([]);
      setFilePreviewUrls({});
      setAcknowledgements([]);
      setAssignedTrainingDocIds(new Set());
      setAssignedCollectionIds(new Set());
    }
  }, [workspace.status, workspace.restaurant?.id]);

  // Dashboard assignment links can open the requested published page directly.
  useEffect(() => {
    const requestedDocId = searchParams.get("open");
    if (requestedDocId && docs.some((doc) => doc.id === requestedDocId)) {
      setActiveReaderDocId(requestedDocId);
    }
  }, [docs, searchParams]);

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

  const collectionMap = new Map(collections.map((collection) => [collection.id, collection]));
  const decoratedDocs = docs.map((doc) => {
    const collection = collectionMap.get(doc.collectionId);
    return {
      doc,
      collection,
      section: getSectionLabel(doc, collection),
      subsection: getSubsectionLabel(doc)
    };
  });
  const availableSections = [...new Set(decoratedDocs.map((item) => item.section).filter(Boolean))].sort((a, b) => {
    const orderA = collectionOrder.indexOf(a);
    const orderB = collectionOrder.indexOf(b);
    const safeOrderA = orderA === -1 ? 999 : orderA;
    const safeOrderB = orderB === -1 ? 999 : orderB;
    return safeOrderA - safeOrderB || a.localeCompare(b);
  });
  const availableSubsections = [
    ...new Set(
      decoratedDocs
        .filter((item) => sectionFilter === allFilter || item.section === sectionFilter)
        .map((item) => item.subsection)
        .filter(Boolean)
    )
  ].sort((a, b) => {
    const orderA = subsectionOrder.indexOf(a);
    const orderB = subsectionOrder.indexOf(b);
    const safeOrderA = orderA === -1 ? 999 : orderA;
    const safeOrderB = orderB === -1 ? 999 : orderB;
    return safeOrderA - safeOrderB || a.localeCompare(b);
  });
  const normalizedSearch = normalizeValue(searchTerm);
  const reviewedDocIds = new Set(acknowledgements.map((item) => item.trainingDocId));
  const isAssignedDoc = (doc) => assignedTrainingDocIds.has(doc.id) || assignedCollectionIds.has(doc.collectionId);
  const filteredItems = decoratedDocs
    .filter((item) => sectionFilter === allFilter || item.section === sectionFilter)
    .filter((item) => subsectionFilter === allFilter || item.subsection === subsectionFilter)
    .filter((item) => {
      if (studyStatusFilter === reviewedFilter) return reviewedDocIds.has(item.doc.id);
      if (studyStatusFilter === assignedFilter) return isAssignedDoc(item.doc) && !reviewedDocIds.has(item.doc.id);
      if (studyStatusFilter === toStudyFilter) return !reviewedDocIds.has(item.doc.id);
      return true;
    })
    .filter((item) => docMatchesSearch(item.doc, item.collection, normalizedSearch));
  const filteredDocs = filteredItems.map((item) => item.doc);
  const visualRows = groupStaffRows(filteredItems);
  const canManageLibrary = isAdminOrManager(workspace.role);
  const activeReaderDoc = docs.find((doc) => doc.id === activeReaderDocId);
  const activeReaderContent = activeReaderDoc ? parseContentJson(activeReaderDoc.contentJson) : null;
  const activeReaderFiles = activeReaderDoc ? fileAssets.filter((fileAsset) => fileAsset.trainingDocId === activeReaderDoc.id) : [];
  const activeReaderImage = activeReaderFiles.find((fileAsset) => filePreviewUrls[fileAsset.id]);
  const activeReaderAcknowledgement = activeReaderDoc
    ? acknowledgements.find((item) => item.trainingDocId === activeReaderDoc.id)
    : null;
  const activeSectionLabel = sectionFilter === allFilter ? "All" : sectionFilter.replace(" Menu", "");
  const activeSubsectionLabel = subsectionFilter === allFilter ? "" : subsectionFilter;

  async function openAttachedResource(fileAsset) {
    try {
      const url = await getFileAssetUrl({
        fileAsset,
        restaurantId: workspace.restaurant.id
      });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(error.message || "Could not open this resource.");
    }
  }

  function openReader(doc) {
    setActiveReaderDocId(doc.id);
    setActiveReviewDocId("");
    setReviewQuestions([]);
    setReviewAnswers({});
    setReviewResult(null);
    setMessage("");
  }

  function startReviewCheck(doc) {
    const questions = buildReviewQuestionsForDoc(doc, docs);

    if (questions.length < reviewQuestionCount) {
      setMessage("This page needs more testable staff knowledge before it can use a review check.");
      return;
    }

    setActiveReviewDocId(doc.id);
    setReviewQuestions(questions);
    setReviewAnswers({});
    setReviewResult(null);
    setMessage("");
  }

  function updateReviewAnswer(questionIndex, answer) {
    setReviewAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionIndex]: answer
    }));
  }

  async function submitReviewCheck(doc) {
    const existing = acknowledgements.find((item) => item.trainingDocId === doc.id);
    const answeredCount = reviewQuestions.filter((_, index) => reviewAnswers[index]).length;

    if (answeredCount < reviewQuestionCount) {
      setReviewResult({
        passed: false,
        score: 0,
        message: `Answer all ${reviewQuestionCount} questions before submitting.`
      });
      return;
    }

    const correctCount = reviewQuestions.reduce(
      (count, question, index) => count + (reviewAnswers[index] === question.correctAnswer ? 1 : 0),
      0
    );

    if (correctCount < reviewPassingScore) {
      setReviewResult({
        passed: false,
        score: correctCount,
        message: `You scored ${correctCount}/${reviewQuestionCount}. Review the notes and try again.`
      });
      return;
    }

    setReviewingDocId(doc.id);
    setMessage("");

    try {
      const saved = await markTrainingDocReviewed({
        restaurantId: workspace.restaurant.id,
        trainingDoc: doc,
        userProfileId: workspace.userProfile.id,
        cognitoUserId: workspace.user?.userId,
        existingId: existing?.id
      });
      setAcknowledgements((current) => [...current.filter((item) => item.trainingDocId !== doc.id), saved]);
      setReviewResult({
        passed: true,
        score: correctCount,
        message: `Passed ${correctCount}/${reviewQuestionCount}. This page is now marked reviewed.`
      });
    } catch (error) {
      setMessage(error.message || "Could not mark this page as reviewed.");
    } finally {
      setReviewingDocId("");
    }
  }

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Staff library</p>
          <h1>{workspace.restaurant?.name || "Training Library"}</h1>
          <p>Everything your team needs to study, organized by your restaurant.</p>
        </div>
        <button className="secondary-button" type="button" onClick={loadStaffLibrary}>
          Refresh
        </button>
      </div>

      {workspace.status === "loading" ? (
        <div className="empty-panel">Loading staff library...</div>
      ) : null}

      {workspace.status === "empty" || workspace.status === "error" ? (
        <div className="form-card">
          <h2>Training library unavailable</h2>
          <p>{workspace.message || message}</p>
          <Link className="primary-button full-width" to="/trial">
            Return home
          </Link>
        </div>
      ) : null}

      {workspace.status === "ready" && docs.length === 0 ? (
        <div className="empty-panel">
          No published training pages yet. A manager needs to publish training material before staff can study.
        </div>
      ) : null}

      {workspace.status === "ready" && docs.length > 0 ? (
        <div className="staff-visual-library">
          <aside className="staff-library-sidebar" aria-label="Browse training sections">
            <label className="staff-sidebar-search">
              <span>Search</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search menu item, allergen, wine, SOP..."
              />
            </label>

            <div className="sidebar-section">
              <button
                className={sectionFilter === allFilter ? "sidebar-filter is-active" : "sidebar-filter"}
                type="button"
                onClick={() => {
                  setSectionFilter(allFilter);
                  setSubsectionFilter(allFilter);
                }}
              >
                <span>All pages</span>
                <strong>{docs.length}</strong>
              </button>
              {availableSections.map((section) => {
                const count = decoratedDocs.filter((item) => item.section === section).length;

                return (
                  <button
                    className={sectionFilter === section ? "sidebar-filter is-active" : "sidebar-filter"}
                    type="button"
                    key={section}
                    onClick={() => {
                      setSectionFilter(section);
                      setSubsectionFilter(allFilter);
                    }}
                  >
                    <span>{section}</span>
                    <strong>{count}</strong>
                  </button>
                );
              })}
            </div>

            <div className="sidebar-section">
              <div className="sidebar-heading-row">
                <h2>Study status</h2>
              </div>
              {[
                [allFilter, "Everything"],
                [toStudyFilter, "To study"],
                [assignedFilter, "Assigned"],
                [reviewedFilter, "Reviewed"]
              ].map(([value, label]) => (
                <button
                  className={studyStatusFilter === value ? "sidebar-filter is-active" : "sidebar-filter"}
                  type="button"
                  key={value}
                  onClick={() => setStudyStatusFilter(value)}
                >
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {availableSubsections.length > 0 ? (
              <div className="sidebar-section">
                <div className="sidebar-heading-row">
                  <h2>Subsections</h2>
                </div>
                <button
                  className={subsectionFilter === allFilter ? "sidebar-filter is-active" : "sidebar-filter"}
                  type="button"
                  onClick={() => setSubsectionFilter(allFilter)}
                >
                  <span>All</span>
                  <strong>{filteredDocs.length}</strong>
                </button>
                {availableSubsections.map((subsection) => {
                  const count = decoratedDocs.filter(
                    (item) => (sectionFilter === allFilter || item.section === sectionFilter) && item.subsection === subsection
                  ).length;

                  return (
                    <button
                      className={subsectionFilter === subsection ? "sidebar-filter is-active" : "sidebar-filter"}
                      type="button"
                      key={subsection}
                      onClick={() => setSubsectionFilter(subsection)}
                    >
                      <span>{subsection}</span>
                      <strong>{count}</strong>
                    </button>
                  );
                })}
              </div>
            ) : null}

            <button
              className="secondary-button full-width"
              type="button"
              onClick={() => {
                setSectionFilter(allFilter);
                setSubsectionFilter(allFilter);
                setStudyStatusFilter(allFilter);
                setSearchTerm("");
              }}
            >
              Clear filters
            </button>
          </aside>

          <main className="staff-visual-main">
            <section className="staff-library-context-bar" aria-label="Current library view">
              <div>
                <p className="eyebrow">Viewing</p>
                <h2>{activeSectionLabel}{activeSubsectionLabel ? ` · ${activeSubsectionLabel}` : ""}</h2>
                <p>{filteredDocs.length} of {docs.length} training pages · {reviewedDocIds.size} reviewed</p>
              </div>
            </section>

            {filteredDocs.length === 0 ? (
              <div className="empty-panel">
                No pages match those filters. Try clearing search or choosing another section.
              </div>
            ) : null}

            <div className="staff-visual-rows">
              {visualRows.map((row) => (
                <section className="staff-visual-row" key={row.id}>
                  <div className="staff-visual-row-heading">
                    <div>
                      <h2>{row.name}</h2>
                      <p>{row.description} · {row.items.length} page{row.items.length === 1 ? "" : "s"}</p>
                    </div>
                  </div>

                  <div className="staff-visual-track">
                    {row.items.map(({ doc }) => {
                      const content = parseContentJson(doc.contentJson);
                      const attachedFiles = fileAssets.filter((fileAsset) => fileAsset.trainingDocId === doc.id);
                      const primaryImage = attachedFiles.find((fileAsset) => filePreviewUrls[fileAsset.id]);
                      const acknowledgement = acknowledgements.find((item) => item.trainingDocId === doc.id);
                      const isAssigned = assignedTrainingDocIds.has(doc.id) || assignedCollectionIds.has(doc.collectionId);

                      return (
                        <article className="staff-visual-card" key={`${row.id}-${doc.id}`}>
                          <button className="staff-visual-open" type="button" onClick={() => openReader(doc)}>
                            <div className="staff-visual-media">
                              {primaryImage ? (
                                <img src={filePreviewUrls[primaryImage.id]} alt="" />
                              ) : (
                                <div className="staff-visual-fallback">
                                  <span>{typeLabels[doc.type] || doc.type || "Training"}</span>
                                </div>
                              )}
                              {acknowledgement ? <span className="reviewed-pill">Reviewed</span> : null}
                              {!acknowledgement && isAssigned ? <span className="assigned-pill">Assigned</span> : null}
                            </div>
                            <div className="staff-visual-copy">
                              <span className="type-pill">{typeLabels[doc.type] || doc.type}</span>
                              <h3>{doc.title}</h3>
                              <p>{content.summary || doc.category || "Open this page to study the full training notes."}</p>
                            </div>
                          </button>
                          <div className="staff-card-status-row">
                            <span className={acknowledgement ? "status-badge status-published" : "status-badge status-draft"}>
                              {acknowledgement ? "Reviewed" : "Unreviewed"}
                            </span>
                            {isAssigned ? <span className="status-badge status-review">Assigned</span> : null}
                          </div>
                          <div className="staff-visual-actions">
                            <button
                              className={acknowledgement ? "secondary-button" : "primary-button"}
                              type="button"
                              onClick={() => openReader(doc)}
                            >
                              {acknowledgement ? "Review again" : "Study"}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </main>
        </div>
      ) : null}

      {activeReaderDoc ? (
        <div className="staff-reader-backdrop" role="presentation" onClick={() => setActiveReaderDocId("")}>
          <section className="staff-reader" role="dialog" aria-modal="true" aria-label={`${activeReaderDoc.title} large view`} onClick={(event) => event.stopPropagation()}>
            <div className="staff-reader-heading">
              <div>
                <p className="eyebrow">{typeLabels[activeReaderDoc.type] || activeReaderDoc.type}</p>
                <h2>{activeReaderDoc.title}</h2>
                <p>{activeReaderDoc.category || "Uncategorized"}</p>
              </div>
              <button className="secondary-button" type="button" onClick={() => setActiveReaderDocId("")}>
                Close
              </button>
            </div>

            <div className="staff-reader-status">
              <span className={activeReaderAcknowledgement ? "status-badge status-published" : "status-badge status-draft"}>
                {activeReaderAcknowledgement ? "Reviewed" : "To study"}
              </span>
              <span>{reviewQuestionCount} questions · Pass {reviewPassingScore} to complete</span>
              {canManageLibrary ? (
                <Link className="manager-edit-link" to={`/manager/content?edit=${activeReaderDoc.id}#training-page-form`}>
                  Edit this page
                </Link>
              ) : null}
            </div>

            {activeReaderImage ? (
              <img className="staff-reader-image" src={filePreviewUrls[activeReaderImage.id]} alt={`${activeReaderDoc.title} photo`} />
            ) : null}

            {activeReaderContent?.summary ? (
              <div className="info-block">
                <h3>One-liner</h3>
                <p>{activeReaderContent.summary}</p>
              </div>
            ) : null}

            {activeReaderContent?.body ? (
              <div className="info-block">
                <h3>Full Notes</h3>
                <p className="preserve-lines">{activeReaderContent.body}</p>
              </div>
            ) : null}

            {activeReaderContent?.details ? (
              <div className="info-block">
                <h3>Extra Training Notes</h3>
                <p>{activeReaderContent.details}</p>
              </div>
            ) : null}

            {activeReaderContent?.ingredients ? (
              <div className="info-block">
                <h3>Ingredients</h3>
                <p className="preserve-lines">{activeReaderContent.ingredients}</p>
              </div>
            ) : null}

            {activeReaderContent?.allergens ? (
              <div className="info-block">
                <h3>Allergens</h3>
                <p>{activeReaderContent.allergens}</p>
              </div>
            ) : null}

            {activeReaderContent?.talkingPoints ? (
              <div className="info-block">
                <h3>Talking Points</h3>
                <p>{activeReaderContent.talkingPoints}</p>
              </div>
            ) : null}

            {activeReaderContent?.serviceNotes ? (
              <div className="info-block">
                <h3>Service Notes</h3>
                <p>{activeReaderContent.serviceNotes}</p>
              </div>
            ) : null}

            {activeReaderFiles.length > 0 ? (
              <div className="info-block">
                <h3>Attached Resources</h3>
                <div className="attachment-list">
                  {activeReaderFiles.map((fileAsset) => (
                    <button className="secondary-button" type="button" key={fileAsset.id} onClick={() => openAttachedResource(fileAsset)}>
                      View {fileAsset.fileName}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {activeReviewDocId !== activeReaderDoc.id ? (
              <section className="staff-reader-check-prompt">
                <div>
                  <p className="eyebrow">Knowledge check</p>
                  <h3>{activeReaderAcknowledgement ? "Want to review it again?" : "Ready to complete this page?"}</h3>
                  <p>Answer five questions based on the training notes. Passing marks this page reviewed.</p>
                </div>
                <button className="primary-button" type="button" onClick={() => startReviewCheck(activeReaderDoc)}>
                  {activeReaderAcknowledgement ? "Retake 5-question check" : "Take 5-question check"}
                </button>
              </section>
            ) : (
              <section className="inline-review-check staff-reader-review">
                <div>
                  <p className="eyebrow">5-question check</p>
                  <h3>{activeReaderDoc.title}</h3>
                  <p>Score at least {reviewPassingScore}/{reviewQuestionCount} to mark this page reviewed.</p>
                </div>

                {reviewQuestions.map((question, questionIndex) => (
                  <fieldset className="review-question" key={`${activeReaderDoc.id}-${question.prompt}`}>
                    <legend>{questionIndex + 1}. {question.prompt}</legend>
                    {question.choices.map((choice) => (
                      <label className="quiz-choice" key={choice}>
                        <input
                          type="radio"
                          name={`${activeReaderDoc.id}-review-${questionIndex}`}
                          value={choice}
                          checked={reviewAnswers[questionIndex] === choice}
                          onChange={() => updateReviewAnswer(questionIndex, choice)}
                        />
                        <span>{choice}</span>
                      </label>
                    ))}
                  </fieldset>
                ))}

                {reviewResult ? (
                  <div className={reviewResult.passed ? "quiz-result quiz-result-pass" : "quiz-result quiz-result-review"}>
                    <h3>{reviewResult.passed ? "Page complete" : "Needs review"}</h3>
                    <p>{reviewResult.message}</p>
                  </div>
                ) : null}

                <div className="form-button-row">
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => submitReviewCheck(activeReaderDoc)}
                    disabled={reviewingDocId === activeReaderDoc.id || reviewResult?.passed}
                  >
                    {reviewingDocId === activeReaderDoc.id ? "Saving..." : reviewResult?.passed ? "Completed" : "Submit answers"}
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      setActiveReviewDocId("");
                      setReviewQuestions([]);
                      setReviewAnswers({});
                      setReviewResult(null);
                    }}
                  >
                    Back to notes
                  </button>
                </div>
              </section>
            )}
          </section>
        </div>
      ) : null}

      {workspace.status === "ready" ? (
        <div className="staff-library-footer-links">
          <Link to="/my-progress">See my full progress</Link>
          <Link to="/report-issue">Report outdated information</Link>
        </div>
      ) : null}
    </section>
  );
}
