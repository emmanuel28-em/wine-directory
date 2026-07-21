import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import {
  getAssignedItemIdsForUser,
  listStaffGroupMembersForRestaurant,
  listTrainingAssignmentsForRestaurant
} from "../lib/assignments.js";
import { listCollectionsForRestaurant } from "../lib/collections.js";
import { getFileAssetUrl, isPreviewableImageFileAsset, listFileAssetsForRestaurant } from "../lib/fileAssets.js";
import { isAdminOrManager } from "../lib/permissions.js";
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
  "Lunch Menu",
  "Brunch Menu",
  "Dinner Menu",
  "Cocktails",
  "Pasta Tasting Menu",
  "BTG Wines",
  "Food Items"
];

const subsectionOrder = ["Antipasta", "Primi", "Secondi", "Verdure", "Course 1", "Course 2", "Course 3", "Course 4", "Course 5"];
const reviewQuestionCount = 5;
const reviewPassingScore = 4;

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanText(value) {
  return String(value || "").trim();
}

function splitList(value) {
  return cleanText(value)
    .split(/\n|,|;|\|/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(values) {
  return [...new Set(values.map(cleanText).filter(Boolean))];
}

function firstSentence(value) {
  const text = cleanText(value);
  return text.split(/(?<=[.!?])\s+/)[0] || text;
}

function shuffle(values) {
  return [...values].sort(() => Math.random() - 0.5);
}

function collectReviewAnswerPool(docs, fieldName) {
  return unique(
    docs.flatMap((doc) => {
      const content = parseContentJson(doc.contentJson);

      if (fieldName === "ingredients") return splitList(content.ingredients);
      if (fieldName === "allergens") return splitList(content.allergens);
      if (fieldName === "summary") return [content.summary];
      if (fieldName === "serviceNotes") return [firstSentence(content.serviceNotes)];
      if (fieldName === "category") return [doc.category, doc.type];

      const facts = content.testableStaffKnowledge || content.quizFacts || [];
      return facts
        .filter((fact) => normalizeValue(fact.label).includes(fieldName))
        .map((fact) => fact.value);
    })
  );
}

function makeReviewChoices({ correctAnswer, pool, fallback = [] }) {
  const wrongAnswers = unique([...pool, ...fallback]).filter((choice) => choice !== correctAnswer).slice(0, 3);
  const choices = unique([correctAnswer, ...wrongAnswers]);

  while (choices.length < 4) {
    choices.push(`Review the training notes option ${choices.length + 1}`);
  }

  return shuffle(choices).slice(0, 4);
}

function addReviewQuestion(questions, question) {
  if (!question.correctAnswer || questions.some((item) => item.prompt === question.prompt)) {
    return;
  }

  questions.push(question);
}

function buildReviewQuestionsForDoc(doc, allDocs) {
  const content = parseContentJson(doc.contentJson);
  const title = doc.title || "this item";
  const questions = [];
  const facts = content.testableStaffKnowledge || content.quizFacts || [];

  facts
    .filter((fact) => fact.quizEligible !== false && cleanText(fact.value))
    .forEach((fact) => {
      const label = cleanText(fact.label) || "detail";
      const lowerLabel = normalizeValue(label);
      const poolKey =
        lowerLabel.includes("allergen")
          ? "allergens"
          : lowerLabel.includes("ingredient")
            ? "ingredients"
            : lowerLabel.includes("service")
              ? "serviceNotes"
              : "category";

      addReviewQuestion(questions, {
        prompt: fact.questionHint || `What should staff know about ${label} for ${title}?`,
        correctAnswer: cleanText(fact.value),
        choices: makeReviewChoices({
          correctAnswer: cleanText(fact.value),
          pool: collectReviewAnswerPool(allDocs, poolKey),
          fallback: ["Ask a manager before service", "Check the most recent training page", "Review the dish notes"]
        }),
        explanation: `${label}: ${cleanText(fact.value)}`
      });
    });

  addReviewQuestion(questions, {
    prompt: `What is the correct one-liner for ${title}?`,
    correctAnswer: content.summary,
    choices: makeReviewChoices({
      correctAnswer: content.summary,
      pool: collectReviewAnswerPool(allDocs, "summary"),
      fallback: ["A classic house favorite with seasonal garnish.", "A rich preparation with bright acidity.", "A staff-only note for pre-shift."]
    }),
    explanation: content.summary
  });

  addReviewQuestion(questions, {
    prompt: `What allergens should staff know for ${title}?`,
    correctAnswer: content.allergens,
    choices: makeReviewChoices({
      correctAnswer: content.allergens,
      pool: collectReviewAnswerPool(allDocs, "allergens"),
      fallback: ["Dairy, gluten", "Citrus, allium", "Nuts, egg"]
    }),
    explanation: content.allergens ? `${title} allergens: ${content.allergens}` : ""
  });

  splitList(content.ingredients).slice(0, 2).forEach((ingredient) => {
    addReviewQuestion(questions, {
      prompt: `Which ingredient is used in ${title}?`,
      correctAnswer: ingredient,
      choices: makeReviewChoices({
        correctAnswer: ingredient,
        pool: collectReviewAnswerPool(allDocs, "ingredients"),
        fallback: ["Parmigiano", "Lemon", "Garlic"]
      }),
      explanation: `${ingredient} is listed for ${title}.`
    });
  });

  addReviewQuestion(questions, {
    prompt: `What service note should staff remember for ${title}?`,
    correctAnswer: firstSentence(content.serviceNotes || content.talkingPoints || content.body),
    choices: makeReviewChoices({
      correctAnswer: firstSentence(content.serviceNotes || content.talkingPoints || content.body),
      pool: collectReviewAnswerPool(allDocs, "serviceNotes"),
      fallback: ["Confirm with a manager before promising changes.", "Serve only after the table is cleared.", "This is used during opening sidework."]
    }),
    explanation: firstSentence(content.serviceNotes || content.talkingPoints || content.body)
  });

  addReviewQuestion(questions, {
    prompt: `Where is ${title} organized in the training library?`,
    correctAnswer: doc.category || doc.type,
    choices: makeReviewChoices({
      correctAnswer: doc.category || doc.type,
      pool: collectReviewAnswerPool(allDocs, "category"),
      fallback: ["Dinner Menu", "Cocktails", "BTG Wines"]
    }),
    explanation: `${title} is organized as ${doc.category || doc.type}.`
  });

  addReviewQuestion(questions, {
    prompt: "Which training page are you reviewing?",
    correctAnswer: title,
    choices: makeReviewChoices({
      correctAnswer: title,
      pool: allDocs.map((item) => item.title),
      fallback: ["Opening Sidework", "Dinner Menu Overview", "Wine Service Standards"]
    }),
    explanation: `This review check is for ${title}.`
  });

  addReviewQuestion(questions, {
    prompt: `What type of training page is ${title}?`,
    correctAnswer: typeLabels[doc.type] || doc.type,
    choices: makeReviewChoices({
      correctAnswer: typeLabels[doc.type] || doc.type,
      pool: Object.values(typeLabels),
      fallback: ["Food", "Wine", "Cocktail"]
    }),
    explanation: `${title} is saved as ${typeLabels[doc.type] || doc.type}.`
  });

  return shuffle(questions).slice(0, reviewQuestionCount);
}

function getSectionLabel(doc, collection) {
  const name = collection?.name || "";
  const category = doc.category || "";
  const combined = normalizeValue(`${name} ${category}`);

  if (combined.includes("lunch")) return "Lunch Menu";
  if (combined.includes("brunch")) return "Brunch Menu";
  if (combined.includes("dinner")) return "Dinner Menu";
  if (combined.includes("cocktail")) return "Cocktails";
  if (combined.includes("pasta") || combined.includes("pairing")) return "Pasta Tasting Menu";
  if (combined.includes("btg") || combined.includes("by-the-glass")) return "BTG Wines";
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
  const [collections, setCollections] = useState([]);
  const [docs, setDocs] = useState([]);
  const [fileAssets, setFileAssets] = useState([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState({});
  const [acknowledgements, setAcknowledgements] = useState([]);
  const [assignedTrainingDocIds, setAssignedTrainingDocIds] = useState(new Set());
  const [reviewingDocId, setReviewingDocId] = useState("");
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sectionFilter, setSectionFilter] = useState(allFilter);
  const [subsectionFilter, setSubsectionFilter] = useState(allFilter);
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
  const filteredItems = decoratedDocs
    .filter((item) => sectionFilter === allFilter || item.section === sectionFilter)
    .filter((item) => subsectionFilter === allFilter || item.subsection === subsectionFilter)
    .filter((item) => docMatchesSearch(item.doc, item.collection, normalizedSearch));
  const filteredDocs = filteredItems.map((item) => item.doc);
  const visualRows = groupStaffRows(filteredItems);
  const canManageLibrary = isAdminOrManager(workspace.role);
  const activeReaderDoc = docs.find((doc) => doc.id === activeReaderDocId);
  const activeReaderContent = activeReaderDoc ? parseContentJson(activeReaderDoc.contentJson) : null;
  const activeReaderFiles = activeReaderDoc ? fileAssets.filter((fileAsset) => fileAsset.trainingDocId === activeReaderDoc.id) : [];
  const activeReaderImage = activeReaderFiles.find((fileAsset) => filePreviewUrls[fileAsset.id]);
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
      setActiveReviewDocId("");
      setReviewQuestions([]);
      setReviewAnswers({});
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
                <p>{filteredDocs.length} of {docs.length} published training pages</p>
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
                      const isAssigned = assignedTrainingDocIds.has(doc.id);

                      return (
                        <article className="staff-visual-card" key={`${row.id}-${doc.id}`}>
                          <button className="staff-visual-open" type="button" onClick={() => setActiveReaderDocId(doc.id)}>
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
                            <button className="secondary-button" type="button" onClick={() => setActiveReaderDocId(doc.id)}>
                              Open
                            </button>
                            <button
                              className={acknowledgement ? "secondary-button" : "primary-button"}
                              type="button"
                              onClick={() => startReviewCheck(doc)}
                              disabled={reviewingDocId === doc.id}
                            >
                              {acknowledgement ? "Retake review" : "Review check"}
                            </button>
                            {canManageLibrary ? (
                              <Link className="manager-edit-link" to={`/manager/content?edit=${doc.id}#training-page-form`}>
                                Edit
                              </Link>
                            ) : null}
                          </div>

                          {activeReviewDocId === doc.id ? (
                            <div className="inline-review-check staff-visual-review">
                              <div>
                                <p className="eyebrow">Review check</p>
                                <h3>{doc.title}</h3>
                                <p>Score at least {reviewPassingScore}/{reviewQuestionCount} to mark this page reviewed.</p>
                              </div>

                              {reviewQuestions.map((question, questionIndex) => (
                                <fieldset className="review-question" key={`${doc.id}-${question.prompt}`}>
                                  <legend>{questionIndex + 1}. {question.prompt}</legend>
                                  {question.choices.map((choice) => (
                                    <label className="quiz-choice" key={choice}>
                                      <input
                                        type="radio"
                                        name={`${doc.id}-review-${questionIndex}`}
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
                                  <h3>{reviewResult.passed ? "Ready" : "Needs review"}</h3>
                                  <p>{reviewResult.message}</p>
                                </div>
                              ) : null}

                              <div className="form-button-row">
                                <button
                                  className="primary-button"
                                  type="button"
                                  onClick={() => submitReviewCheck(doc)}
                                  disabled={reviewingDocId === doc.id}
                                >
                                  {reviewingDocId === doc.id ? "Saving..." : "Submit review check"}
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
                                  Close
                                </button>
                              </div>
                            </div>
                          ) : null}
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
          </section>
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
