import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import DailyStudyDeck from "../components/DailyStudyDeck.jsx";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import {
  getAssignedItemIdsForUser,
  listStaffGroupMembersForRestaurant,
  listTrainingAssignmentsForRestaurant
} from "../lib/assignments.js";
import { listCollectionsForRestaurant } from "../lib/collections.js";
import { getFileAssetUrl, isPreviewableImageFileAsset, listFileAssetsForRestaurant } from "../lib/fileAssets.js";
import { syncMyLeaderboardEntry } from "../lib/leaderboard.js";
import { isAdminOrManager } from "../lib/permissions.js";
import { buildReviewQuestionsForDoc, deriveReviewContent, reviewQuestionCount } from "../lib/reviewQuestions.js";
import { isTrainingReviewCurrent } from "../lib/studyProgress.js";
import {
  listMyTrainingAcknowledgements,
  markTrainingDocReviewed
} from "../lib/trainingAcknowledgements.js";
import {
  listMyTrainingProgress,
  readTrainingProgress,
  recordTrainingFactResponse
} from "../lib/trainingProgress.js";
import { listTrainingDocsForRestaurant, parseContentJson } from "../lib/trainingDocs.js";
import { buildTrainingDocImageAssetMap } from "../lib/trainingImages.js";

const typeLabels = {
  wine: "Wine",
  cocktail: "Cocktail",
  food: "Food",
  sop: "SOP",
  pastaTasting: "Pasta Tasting",
  custom: "Training"
};

const preferredSectionOrder = [
  "Dinner Menu",
  "Lunch Menu",
  "Brunch Menu",
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

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function splitList(value) {
  return String(value || "")
    .split(/\n|,|;|\|/)
    .map((item) => item.replace(/^[-*•]+\s*/, "").trim())
    .filter(Boolean);
}

function getSectionName(doc, collection) {
  const collectionName = collection?.name || "";
  const combined = normalize(`${collectionName} ${doc.category} ${doc.type}`);

  if (combined.includes("lunch")) return "Lunch Menu";
  if (combined.includes("brunch")) return "Brunch Menu";
  if (combined.includes("dinner")) return "Dinner Menu";
  if (combined.includes("vegetarian") && combined.includes("pasta")) return "Vegetarian Pasta Tasting";
  if (combined.includes("dessert") || combined.includes("gelati") || combined.includes("sorbet")) return "Desserts";
  if (combined.includes("cocktail")) return "Cocktails";
  if (combined.includes("pasta")) return "Pasta Tasting Menu";
  if (combined.includes("pairing")) return "Wine Pairings";
  if (combined.includes("btg") || combined.includes("by-the-glass")) return "BTG Wines";
  if (combined.includes("spirit") || combined.includes("agave") || combined.includes("amari") || combined.includes("grappa")) return "Spirits";
  if (combined.includes("sop") || combined.includes("procedure")) return "SOPs";
  if (collectionName) return collectionName;
  return doc.type === "food" ? "Food Items" : typeLabels[doc.type] || "Other Training";
}

function matchesSearch(doc, collection, query) {
  if (!query) return true;
  const content = parseContentJson(doc.contentJson);
  return [
    doc.title,
    doc.category,
    doc.type,
    collection?.name,
    content.summary,
    content.body,
    content.details,
    content.ingredients,
    content.allergens,
    content.talkingPoints,
    content.serviceNotes
  ].filter(Boolean).join(" ").toLowerCase().includes(query);
}

function replaceRecord(records, nextRecord) {
  const exists = records.some((record) => record.id === nextRecord.id);
  return exists ? records.map((record) => record.id === nextRecord.id ? nextRecord : record) : [...records, nextRecord];
}

function textBlock(title, value, preserveLines = false) {
  if (!value) return null;
  return (
    <section className="library-document-block">
      <h3>{title}</h3>
      <p className={preserveLines ? "preserve-lines" : ""}>{value}</p>
    </section>
  );
}

export default function StaffLibrary() {
  const workspace = useCurrentWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const [collections, setCollections] = useState([]);
  const [docs, setDocs] = useState([]);
  const [fileAssets, setFileAssets] = useState([]);
  const [assetUrls, setAssetUrls] = useState({});
  const [acknowledgements, setAcknowledgements] = useState([]);
  const [progressRecords, setProgressRecords] = useState([]);
  const [assignedDocIds, setAssignedDocIds] = useState(new Set());
  const [assignedCollectionIds, setAssignedCollectionIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeDocId, setActiveDocId] = useState(searchParams.get("open") || "");
  const [studyCards, setStudyCards] = useState([]);
  const [isStudyOpen, setIsStudyOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadLibrary() {
    if (workspace.status !== "ready") return;
    setIsLoading(true);
    setMessage("");

    try {
      const restaurantId = workspace.restaurant.id;
      const userProfileId = workspace.userProfile.id;
      const [nextCollections, allDocs, nextFiles, nextAcknowledgements, assignments, groupMembers, nextProgress] = await Promise.all([
        listCollectionsForRestaurant(restaurantId),
        listTrainingDocsForRestaurant(restaurantId),
        listFileAssetsForRestaurant(restaurantId),
        listMyTrainingAcknowledgements({ restaurantId, userProfileId }),
        listTrainingAssignmentsForRestaurant(restaurantId),
        listStaffGroupMembersForRestaurant(restaurantId),
        listMyTrainingProgress({ restaurantId, userProfileId })
      ]);
      const publishedDocs = allDocs.filter((doc) => doc.status === "published");
      const firstImageByDoc = new Map();

      nextFiles.filter(isPreviewableImageFileAsset).forEach((fileAsset) => {
        if (fileAsset.trainingDocId && !firstImageByDoc.has(fileAsset.trainingDocId)) {
          firstImageByDoc.set(fileAsset.trainingDocId, fileAsset);
        }
      });
      const urlEntries = await Promise.all(
        [...firstImageByDoc.values()].map(async (fileAsset) => {
          try {
            return [fileAsset.id, await getFileAssetUrl({ fileAsset, restaurantId })];
          } catch {
            return null;
          }
        })
      );

      setCollections(nextCollections);
      setDocs(publishedDocs);
      setFileAssets(nextFiles);
      setAssetUrls(Object.fromEntries(urlEntries.filter(Boolean)));
      setAcknowledgements(nextAcknowledgements);
      setProgressRecords(nextProgress);
      setAssignedDocIds(getAssignedItemIdsForUser({ assignments, groupMembers, userProfileId, itemType: "trainingDoc" }));
      setAssignedCollectionIds(getAssignedItemIdsForUser({ assignments, groupMembers, userProfileId, itemType: "collection" }));
      setActiveDocId((current) => publishedDocs.some((doc) => doc.id === current) ? current : publishedDocs[0]?.id || "");
    } catch (error) {
      setMessage(error.message || "Could not load the training library.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLibrary();
  }, [workspace.status, workspace.restaurant?.id, workspace.userProfile?.id]);

  const collectionById = useMemo(() => new Map(collections.map((collection) => [collection.id, collection])), [collections]);
  const imageAssetByDocId = useMemo(
    () => buildTrainingDocImageAssetMap({ trainingDocs: docs, fileAssets }),
    [docs, fileAssets]
  );
  const reviewedDocIds = useMemo(() => new Set(
    acknowledgements
      .filter((item) => isTrainingReviewCurrent(docs.find((doc) => doc.id === item.trainingDocId), item))
      .map((item) => item.trainingDocId)
  ), [acknowledgements, docs]);
  const normalizedSearch = normalize(searchTerm);
  const filteredDocs = useMemo(() => docs.filter((doc) => {
    const assigned = assignedDocIds.has(doc.id) || assignedCollectionIds.has(doc.collectionId);
    const reviewed = reviewedDocIds.has(doc.id);
    if (statusFilter === "assigned" && !assigned) return false;
    if (statusFilter === "needs-review" && reviewed) return false;
    if (statusFilter === "reviewed" && !reviewed) return false;
    return matchesSearch(doc, collectionById.get(doc.collectionId), normalizedSearch);
  }), [assignedCollectionIds, assignedDocIds, collectionById, docs, normalizedSearch, reviewedDocIds, statusFilter]);
  const sectionGroups = useMemo(() => {
    const groups = new Map();
    filteredDocs.forEach((doc) => {
      const sectionName = getSectionName(doc, collectionById.get(doc.collectionId));
      if (!groups.has(sectionName)) groups.set(sectionName, []);
      groups.get(sectionName).push(doc);
    });

    return [...groups.entries()]
      .map(([name, items]) => ({ name, items: [...items].sort((a, b) => (a.category || "").localeCompare(b.category || "") || a.title.localeCompare(b.title)) }))
      .sort((left, right) => {
        const leftIndex = preferredSectionOrder.indexOf(left.name);
        const rightIndex = preferredSectionOrder.indexOf(right.name);
        return (leftIndex < 0 ? 999 : leftIndex) - (rightIndex < 0 ? 999 : rightIndex) || left.name.localeCompare(right.name);
      });
  }, [collectionById, filteredDocs]);

  useEffect(() => {
    if (!filteredDocs.length) return;
    if (!filteredDocs.some((doc) => doc.id === activeDocId)) setActiveDocId(filteredDocs[0].id);
  }, [activeDocId, filteredDocs]);

  const activeDoc = docs.find((doc) => doc.id === activeDocId) || null;
  const activeContent = activeDoc ? deriveReviewContent(activeDoc) : null;
  const activeFiles = activeDoc ? fileAssets.filter((fileAsset) => fileAsset.trainingDocId === activeDoc.id) : [];
  const activeImageAsset = activeDoc ? imageAssetByDocId.get(activeDoc.id) : null;
  const activeProgressRecord = activeDoc ? progressRecords.find((record) => record.trainingDocId === activeDoc.id) : null;
  const activeProgress = activeDoc ? readTrainingProgress(activeProgressRecord, activeDoc) : null;
  const activeQuestions = activeDoc ? buildReviewQuestionsForDoc(activeDoc, docs) : [];
  const activeFactCount = activeProgress?.masteredFactKeys.filter((key) => activeQuestions.some((question) => question.prompt === key)).length || 0;
  const activeReviewed = activeDoc ? reviewedDocIds.has(activeDoc.id) : false;
  const activeAssigned = activeDoc ? assignedDocIds.has(activeDoc.id) || assignedCollectionIds.has(activeDoc.collectionId) : false;
  const canManageLibrary = isAdminOrManager(workspace.role);

  function selectDoc(doc) {
    setActiveDocId(doc.id);
    setSearchParams({ open: doc.id }, { replace: true });
  }

  function buildStudyCards(doc) {
    const content = deriveReviewContent(doc);
    const collection = collectionById.get(doc.collectionId);
    const imageAsset = imageAssetByDocId.get(doc.id);

    const progress = readTrainingProgress(progressRecords.find((record) => record.trainingDocId === doc.id), doc);
    return buildReviewQuestionsForDoc(doc, docs).map((question, questionIndex) => ({
      id: `${doc.id}:${question.prompt}`,
      trainingDocId: doc.id,
      trainingDoc: doc,
      title: doc.title,
      category: doc.category || collection?.name || typeLabels[doc.type] || "Training",
      section: getSectionName(doc, collection),
      assigned: assignedDocIds.has(doc.id) || assignedCollectionIds.has(doc.collectionId),
      reviewed: reviewedDocIds.has(doc.id),
      recent: false,
      imageUrl: imageAsset ? assetUrls[imageAsset.id] : "",
      allergens: content.allergens,
      ingredients: content.ingredients,
      summary: content.summary,
      serviceNotes: content.serviceNotes || content.talkingPoints,
      prompt: question.prompt,
      answer: question.correctAnswer,
      explanation: question.explanation,
      question,
      questionIndex,
      factKey: question.prompt,
      mastered: progress.masteredFactKeys.includes(question.prompt)
    })).sort((left, right) => Number(left.mastered) - Number(right.mastered));
  }

  function startReview() {
    if (!activeDoc) return;
    setStudyCards(buildStudyCards(activeDoc));
    setIsStudyOpen(true);
  }

  async function openResource(fileAsset) {
    try {
      const url = assetUrls[fileAsset.id] || await getFileAssetUrl({ fileAsset, restaurantId: workspace.restaurant.id });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(error.message || "Could not open this training resource.");
    }
  }

  async function handleStudyResponse(card, response) {
    const existingProgress = progressRecords.find((record) => record.trainingDocId === card.trainingDocId);
    const result = await recordTrainingFactResponse({
      restaurantId: workspace.restaurant.id,
      trainingDoc: card.trainingDoc,
      userProfileId: workspace.userProfile.id,
      cognitoUserId: workspace.userProfile.cognitoUserId,
      existingProgress,
      question: card.question,
      response,
      requiredFactCount: reviewQuestionCount
    });
    setProgressRecords((current) => replaceRecord(current, result.record));

    if (result.isComplete) {
      const existingAcknowledgement = acknowledgements.find((item) => item.trainingDocId === card.trainingDocId);
      const savedAcknowledgement = await markTrainingDocReviewed({
        restaurantId: workspace.restaurant.id,
        trainingDoc: card.trainingDoc,
        userProfileId: workspace.userProfile.id,
        cognitoUserId: workspace.userProfile.cognitoUserId,
        existingId: existingAcknowledgement?.id
      });
      setAcknowledgements((current) => replaceRecord(current, savedAcknowledgement));
      setMessage(`${card.title} is reviewed and current.`);
      try {
        await syncMyLeaderboardEntry({
          restaurantId: workspace.restaurant.id,
          userProfile: workspace.userProfile,
          membership: workspace.membership
        });
      } catch {
        // The completion is saved even if leaderboard aggregation is delayed.
      }
    }
  }

  return (
    <section className="library-workspace">
      <header className="library-workspace-header">
        <div>
          <p className="eyebrow">{workspace.restaurant?.name || "Restaurant"}</p>
          <h1>Training Library</h1>
          <p>Find a dish, drink, wine, or procedure and study it without leaving the page.</p>
        </div>
        <div className="header-action-row">
          <Link className="secondary-button" to="/home">Quick practice</Link>
          {canManageLibrary ? <Link className="primary-button" to="/manager/create-training">Add training page</Link> : null}
        </div>
      </header>

      <div className="library-search-row">
        <label className="library-search-box">
          <span>Search the library</span>
          <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search dishes, allergens, ingredients, wines..." />
        </label>
        <div className="quick-filter-row" aria-label="Study status filters">
          {[
            ["all", "All"],
            ["needs-review", "Needs review"],
            ["assigned", "Assigned"],
            ["reviewed", "Reviewed"]
          ].map(([value, label]) => (
            <button className={statusFilter === value ? "filter-chip active-filter-chip" : "filter-chip"} type="button" key={value} onClick={() => setStatusFilter(value)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {message ? <div className="inline-alert">{message}</div> : null}
      {isLoading ? <div className="empty-panel">Loading your training library...</div> : null}

      {!isLoading && workspace.status === "ready" ? (
        <div className="course-library-layout">
          <aside className="course-library-sidebar" aria-label="Training sections">
            <div className="course-sidebar-heading">
              <strong>Sections</strong>
              <span>{filteredDocs.length} pages</span>
            </div>
            {sectionGroups.length ? sectionGroups.map((section) => (
              <details key={section.name} open={section.items.some((doc) => doc.id === activeDocId)}>
                <summary>
                  <span>{section.name}</span>
                  <small>{section.items.length}</small>
                </summary>
                <div className="course-section-pages">
                  {section.items.map((doc) => {
                    const reviewed = reviewedDocIds.has(doc.id);
                    const assigned = assignedDocIds.has(doc.id) || assignedCollectionIds.has(doc.collectionId);
                    return (
                      <button className={doc.id === activeDocId ? "course-page-link is-active" : "course-page-link"} type="button" key={doc.id} onClick={() => selectDoc(doc)}>
                        <span className={reviewed ? "course-page-status is-complete" : "course-page-status"}>{reviewed ? "✓" : assigned ? "!" : ""}</span>
                        <span>
                          <strong>{doc.title}</strong>
                          <small>{doc.category || typeLabels[doc.type] || "Training"}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </details>
            )) : <p className="empty-panel">No training pages match these filters.</p>}
          </aside>

          <details className="mobile-course-nav">
            <summary>Browse sections and pages</summary>
            <div className="mobile-course-nav-list">
              {sectionGroups.map((section) => (
                <section key={section.name}>
                  <h3>{section.name}</h3>
                  {section.items.map((doc) => (
                    <button className={doc.id === activeDocId ? "course-page-link is-active" : "course-page-link"} type="button" key={doc.id} onClick={() => selectDoc(doc)}>
                      <span className={reviewedDocIds.has(doc.id) ? "course-page-status is-complete" : "course-page-status"}>{reviewedDocIds.has(doc.id) ? "✓" : ""}</span>
                      <span><strong>{doc.title}</strong><small>{doc.category || typeLabels[doc.type] || "Training"}</small></span>
                    </button>
                  ))}
                </section>
              ))}
            </div>
          </details>

          <main className="library-document-reader">
            {activeDoc ? (
              <>
                <header className="library-document-heading">
                  <div>
                    <div className="library-document-labels">
                      <span>{typeLabels[activeDoc.type] || activeDoc.type}</span>
                      <span>{activeDoc.category || getSectionName(activeDoc, collectionById.get(activeDoc.collectionId))}</span>
                      {activeAssigned ? <strong>Assigned</strong> : null}
                    </div>
                    <h2>{activeDoc.title}</h2>
                    {activeContent?.summary ? <p>{activeContent.summary}</p> : null}
                  </div>
                  {canManageLibrary ? <Link className="secondary-button" to={`/manager/content?edit=${activeDoc.id}#training-page-form`}>Edit page</Link> : null}
                </header>

                {activeImageAsset ? (
                  <div className="library-document-image">
                    <img src={assetUrls[activeImageAsset.id]} alt={`${activeDoc.title} training`} />
                  </div>
                ) : (
                  <div className="library-document-image is-empty"><span>{activeDoc.title.charAt(0)}</span></div>
                )}

                <div className="library-document-content">
                  {textBlock("Training notes", activeContent?.body || activeContent?.description, true)}
                  {textBlock("Details", activeContent?.details)}
                  {textBlock("Ingredients", activeContent?.ingredients, true)}
                  {textBlock("Allergens", activeContent?.allergens)}
                  {textBlock("Talking points", activeContent?.talkingPoints)}
                  {textBlock("Service notes", activeContent?.serviceNotes)}
                  {activeFiles.length ? (
                    <section className="library-document-block">
                      <h3>Resources</h3>
                      <div className="attachment-list">
                        {activeFiles.map((fileAsset) => (
                          <button className="secondary-button" type="button" key={fileAsset.id} onClick={() => openResource(fileAsset)}>
                            Open {fileAsset.fileName}
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="library-reader-empty"><h2>Choose a training page</h2><p>Select a page from the section list to begin.</p></div>
            )}
          </main>

          <aside className="library-study-panel">
            {activeDoc ? (
              <>
                <div className="library-study-status">
                  <span className={activeReviewed ? "status-badge status-published" : "status-badge status-review"}>{activeReviewed ? "Reviewed" : "Needs review"}</span>
                  <h2>{activeFactCount}/{reviewQuestionCount} facts complete</h2>
                  <div className="study-progress-track"><span style={{ width: `${Math.min(100, (activeFactCount / reviewQuestionCount) * 100)}%` }} /></div>
                  <p>Get five facts right to mark this page current.</p>
                  <button className="primary-button full-width" type="button" onClick={startReview}>{activeReviewed ? "Practice again" : activeFactCount ? "Continue review" : "Start review"}</button>
                </div>

                {activeContent?.allergens ? (
                  <div className="library-study-summary">
                    <h3>Allergens</h3>
                    <div className="allergen-chip-row">{splitList(activeContent.allergens).map((allergen) => <span key={allergen}>{allergen}</span>)}</div>
                  </div>
                ) : null}

                <div className="library-study-summary">
                  <h3>Study facts</h3>
                  <ol>
                    {activeQuestions.map((question, index) => (
                      <li key={question.prompt} className={activeProgress?.masteredFactKeys.includes(question.prompt) ? "is-complete" : ""}>
                        <span>{activeProgress?.masteredFactKeys.includes(question.prompt) ? "✓" : index + 1}</span>
                        <p>{question.prompt}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            ) : null}
          </aside>
        </div>
      ) : null}

      {isStudyOpen && studyCards.length ? (
        <DailyStudyDeck
          cards={studyCards}
          onResponse={handleStudyResponse}
          onRestart={() => setStudyCards(buildStudyCards(activeDoc))}
          isExpanded
          onToggleExpanded={() => setIsStudyOpen(false)}
        />
      ) : null}

      <footer className="library-workspace-footer">
        <Link to="/report-issue">Report outdated information</Link>
      </footer>
    </section>
  );
}
