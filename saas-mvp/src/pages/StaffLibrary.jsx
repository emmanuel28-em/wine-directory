import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { listCollectionsForRestaurant } from "../lib/collections.js";
import { getFileAssetUrl, listFileAssetsForRestaurant } from "../lib/fileAssets.js";
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

const collectionOrder = [
  "Dinner Menu",
  "Lunch Menu",
  "Brunch Menu",
  "Pasta Tasting Menu",
  "BTG Wines",
  "Cocktails",
  "Food Items"
];

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

function getMainArea(doc, collection) {
  const content = parseContentJson(doc.contentJson);
  const text = normalizeValue([doc.type, doc.category, collection?.name, content.contentType, content.tags?.join?.(" ")].join(" "));

  if (text.includes("wine") || text.includes("cocktail") || text.includes("beverage") || text.includes("btg")) {
    return "beverage";
  }

  return "food";
}

function getSectionLabel(doc, collection) {
  const name = collection?.name || "";
  const category = doc.category || "";
  const combined = normalizeValue(`${name} ${category}`);

  if (combined.includes("dinner")) return "Dinner Menu";
  if (combined.includes("lunch")) return "Lunch Menu";
  if (combined.includes("brunch")) return "Brunch Menu";
  if (combined.includes("pasta") || combined.includes("pairing")) return "Pasta Tasting Menu";
  if (combined.includes("btg") || combined.includes("by-the-glass")) return "BTG Wines";
  if (combined.includes("cocktail")) return "Cocktails";
  if (combined.includes("sop") || combined.includes("procedure")) return "SOPs";

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

  return "";
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

function groupDocsByCollectionAndType(docs, collections) {
  const collectionMap = new Map(collections.map((collection) => [collection.id, collection]));
  const groups = new Map();

  docs.forEach((doc) => {
    const collection = collectionMap.get(doc.collectionId);
    const collectionKey = collection?.id || "unassigned";
    const collectionName = collection?.name || "Unassigned";
    const collectionDescription = collection?.description || "Training pages that have not been placed in a library section yet.";
    const typeKey = doc.type || "custom";

    if (!groups.has(collectionKey)) {
      groups.set(collectionKey, {
        id: collectionKey,
        name: collectionName,
        description: collectionDescription,
        typeGroups: new Map()
      });
    }

    const collectionGroup = groups.get(collectionKey);

    if (!collectionGroup.typeGroups.has(typeKey)) {
      collectionGroup.typeGroups.set(typeKey, []);
    }

    collectionGroup.typeGroups.get(typeKey).push(doc);
  });

  return [...groups.values()]
    .sort((a, b) => {
      const orderA = collectionOrder.indexOf(a.name);
      const orderB = collectionOrder.indexOf(b.name);
      const safeOrderA = orderA === -1 ? 999 : orderA;
      const safeOrderB = orderB === -1 ? 999 : orderB;
      return safeOrderA - safeOrderB || a.name.localeCompare(b.name);
    })
    .map((collectionGroup) => ({
      ...collectionGroup,
      typeGroups: [...collectionGroup.typeGroups.entries()].map(([type, typeDocs]) => ({
      type,
      docs: [...typeDocs].sort((a, b) => (a.category || "").localeCompare(b.category || "") || a.title.localeCompare(b.title))
    }))
    }));
}

export default function StaffLibrary() {
  const workspace = useCurrentWorkspace();
  const [collections, setCollections] = useState([]);
  const [docs, setDocs] = useState([]);
  const [fileAssets, setFileAssets] = useState([]);
  const [acknowledgements, setAcknowledgements] = useState([]);
  const [reviewingDocId, setReviewingDocId] = useState("");
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [mainAreaFilter, setMainAreaFilter] = useState(allFilter);
  const [sectionFilter, setSectionFilter] = useState(allFilter);

  async function loadStaffLibrary() {
    if (workspace.status !== "ready") {
      return;
    }

    setMessage("");

    try {
      const [restaurantCollections, restaurantDocs, restaurantFiles, myAcknowledgements] = await Promise.all([
        listCollectionsForRestaurant(workspace.restaurant.id),
        listTrainingDocsForRestaurant(workspace.restaurant.id),
        listFileAssetsForRestaurant(workspace.restaurant.id),
        listMyTrainingAcknowledgements({
          restaurantId: workspace.restaurant.id,
          userProfileId: workspace.userProfile.id
        })
      ]);

      setCollections(restaurantCollections);
      setDocs(restaurantDocs.filter((doc) => doc.status === "published"));
      setFileAssets(restaurantFiles);
      setAcknowledgements(myAcknowledgements);
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
      setAcknowledgements([]);
    }
  }, [workspace.status, workspace.restaurant?.id]);

  const collectionMap = new Map(collections.map((collection) => [collection.id, collection]));
  const decoratedDocs = docs.map((doc) => {
    const collection = collectionMap.get(doc.collectionId);
    return {
      doc,
      collection,
      mainArea: getMainArea(doc, collection),
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
  const normalizedSearch = normalizeValue(searchTerm);
  const filteredDocs = decoratedDocs
    .filter((item) => mainAreaFilter === allFilter || item.mainArea === mainAreaFilter)
    .filter((item) => sectionFilter === allFilter || item.section === sectionFilter)
    .filter((item) => docMatchesSearch(item.doc, item.collection, normalizedSearch))
    .map((item) => item.doc);
  const groupedContent = groupDocsByCollectionAndType(filteredDocs, collections);

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

  async function markReviewed(doc) {
    const existing = acknowledgements.find((item) => item.trainingDocId === doc.id);
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
        <div className="staff-library-sections">
          <section className="staff-library-filter-panel" aria-label="Training library filters">
            <label className="staff-library-search">
              Search anything
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Try antipasta, Nebbiolo, dairy, cocktail, course 1..."
              />
            </label>

            <div className="quick-filter-row" aria-label="Main training area">
              {[
                [allFilter, "All"],
                ["food", "Food"],
                ["beverage", "Beverage"]
              ].map(([value, label]) => (
                <button
                  className={mainAreaFilter === value ? "filter-chip active-filter-chip" : "filter-chip"}
                  type="button"
                  key={value}
                  onClick={() => {
                    setMainAreaFilter(value);
                    setSectionFilter(allFilter);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="quick-filter-row" aria-label="Training section">
              <button
                className={sectionFilter === allFilter ? "filter-chip active-filter-chip" : "filter-chip"}
                type="button"
                onClick={() => setSectionFilter(allFilter)}
              >
                All sections
              </button>
              {availableSections
                .filter((section) => {
                  if (mainAreaFilter === allFilter) return true;
                  return decoratedDocs.some((item) => item.section === section && item.mainArea === mainAreaFilter);
                })
                .map((section) => (
                  <button
                    className={sectionFilter === section ? "filter-chip active-filter-chip" : "filter-chip"}
                    type="button"
                    key={section}
                    onClick={() => setSectionFilter(section)}
                  >
                    {section}
                  </button>
                ))}
            </div>

            <p className="library-result-count">
              Showing {filteredDocs.length} of {docs.length} published training pages.
            </p>
          </section>

          {filteredDocs.length === 0 ? (
            <div className="empty-panel">
              No pages match those filters. Try clearing search or choosing another section.
            </div>
          ) : null}

          {groupedContent.map((collectionGroup) => (
            <section className="library-section collection-section" key={collectionGroup.id}>
              <div className="section-heading compact-heading">
                <p className="eyebrow">Library section</p>
                <h2>{collectionGroup.name}</h2>
                <p>{collectionGroup.description}</p>
              </div>

              {collectionGroup.typeGroups.map((typeGroup) => (
                <section className="library-section" key={`${collectionGroup.id}-${typeGroup.type}`}>
                  <div className="type-heading">
                    <h3>{typeLabels[typeGroup.type] || typeGroup.type}</h3>
                  </div>

                  <div className="library-preview">
                    {typeGroup.docs.map((doc) => {
                      const content = parseContentJson(doc.contentJson);
                      const attachedFiles = fileAssets.filter((fileAsset) => fileAsset.trainingDocId === doc.id);
                      const acknowledgement = acknowledgements.find((item) => item.trainingDocId === doc.id);

                      return (
                        <article className="training-card" key={doc.id}>
                          <span className="type-pill">{typeLabels[doc.type] || doc.type}</span>
                          <h2>{doc.title}</h2>
                          <p className="card-category">{doc.category || "Uncategorized"}</p>
                          <p>{content.summary || "No one-liner yet."}</p>

                          {content.body ? (
                            <details className="study-notes">
                              <summary>Full Notes</summary>
                              <p className="preserve-lines">{content.body}</p>
                            </details>
                          ) : null}

                          {content.details ? (
                            <details className="study-notes">
                              <summary>Extra Training Notes</summary>
                              <p>{content.details}</p>
                            </details>
                          ) : null}

                          {content.ingredients ? (
                            <div className="info-block">
                              <h3>Ingredients</h3>
                              <p className="preserve-lines">{content.ingredients}</p>
                            </div>
                          ) : null}

                          {content.allergens ? (
                            <div className="info-block">
                              <h3>Allergens</h3>
                              <p>{content.allergens}</p>
                            </div>
                          ) : null}

                          {content.talkingPoints ? (
                            <div className="info-block">
                              <h3>Talking Points</h3>
                              <p>{content.talkingPoints}</p>
                            </div>
                          ) : null}

                          {content.serviceNotes ? (
                            <div className="info-block">
                              <h3>Service Notes</h3>
                              <p>{content.serviceNotes}</p>
                            </div>
                          ) : null}

                          {attachedFiles.length > 0 ? (
                            <div className="info-block">
                              <h3>Attached Resources</h3>
                              <div className="attachment-list">
                                {attachedFiles.map((fileAsset) => (
                                  <button className="secondary-button" type="button" key={fileAsset.id} onClick={() => openAttachedResource(fileAsset)}>
                                    View {fileAsset.fileName}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          <div className="training-review-action">
                            <button
                              className={acknowledgement ? "secondary-button" : "primary-button"}
                              type="button"
                              onClick={() => markReviewed(doc)}
                              disabled={reviewingDocId === doc.id}
                            >
                              {reviewingDocId === doc.id
                                ? "Saving..."
                                : acknowledgement
                                  ? "Reviewed — update confirmation"
                                  : "Mark as reviewed"}
                            </button>
                            <small>{acknowledgement ? `Reviewed ${new Date(acknowledgement.reviewedAt).toLocaleDateString()}` : "Confirm after you have studied this page."}</small>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </section>
          ))}
        </div>
      ) : null}

      {workspace.status === "ready" ? (
        <section className="setup-steps staff-next-steps">
          <div className="dashboard-grid">
            <article className="stat-card" id="quizzes">
              <span>Quizzes</span>
              <h2>Take a Quiz</h2>
              <p>Show that you understand the training pages your restaurant publishes.</p>
              <Link className="secondary-button card-action" to="/quizzes">
                Start Quiz
              </Link>
            </article>

            <article className="stat-card" id="progress">
              <span>My Progress</span>
              <h2>Review My Progress</h2>
              <p>See your quiz scores and whether you are ready for service.</p>
              <Link className="secondary-button card-action" to="/my-progress">
                View Progress
              </Link>
            </article>

            <article className="stat-card" id="report-issue">
              <span>Report Issue</span>
              <h2>Something not right?</h2>
              <p>Report outdated information or a problem using Line Up.</p>
              <Link className="secondary-button card-action" to="/report-issue">
                Get Help
              </Link>
            </article>
          </div>
        </section>
      ) : null}
    </section>
  );
}
