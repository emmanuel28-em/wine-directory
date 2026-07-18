import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { listCollectionsForRestaurant } from "../lib/collections.js";
import { getFileAssetUrl, listFileAssetsForRestaurant } from "../lib/fileAssets.js";
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
  const [sectionFilter, setSectionFilter] = useState(allFilter);
  const [subsectionFilter, setSubsectionFilter] = useState(allFilter);
  const [activeReviewDocId, setActiveReviewDocId] = useState("");
  const [reviewQuestions, setReviewQuestions] = useState([]);
  const [reviewAnswers, setReviewAnswers] = useState({});
  const [reviewResult, setReviewResult] = useState(null);

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
  const filteredDocs = decoratedDocs
    .filter((item) => sectionFilter === allFilter || item.section === sectionFilter)
    .filter((item) => subsectionFilter === allFilter || item.subsection === subsectionFilter)
    .filter((item) => docMatchesSearch(item.doc, item.collection, normalizedSearch))
    .map((item) => item.doc);
  const groupedContent = groupDocsByCollectionAndType(filteredDocs, collections);
  const canManageLibrary = isAdminOrManager(workspace.role);

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
        <div className="staff-library-sections">
          <section className="staff-library-filter-panel" aria-label="Training library filters">
            <div>
              <p className="eyebrow">Browse</p>
              <h2 className="staff-library-tabs-title">Choose a training area</h2>
            </div>

            <div className="staff-library-tabs" aria-label="Training area tabs">
              <button
                className={sectionFilter === allFilter ? "library-tab active-library-tab" : "library-tab"}
                type="button"
                onClick={() => {
                  setSectionFilter(allFilter);
                  setSubsectionFilter(allFilter);
                }}
              >
                All
              </button>
              {availableSections.map((section) => (
                <button
                  className={sectionFilter === section ? "library-tab active-library-tab" : "library-tab"}
                  type="button"
                  key={section}
                  onClick={() => {
                    setSectionFilter(section);
                    setSubsectionFilter(allFilter);
                  }}
                >
                  {section.replace(" Menu", "")}
                </button>
              ))}
            </div>

            {availableSubsections.length > 0 ? (
              <div className="quick-filter-row" aria-label="Menu subsection tabs">
                <button
                  className={subsectionFilter === allFilter ? "filter-chip active-filter-chip" : "filter-chip"}
                  type="button"
                  onClick={() => setSubsectionFilter(allFilter)}
                >
                  All
                </button>
                {availableSubsections.map((subsection) => (
                  <button
                    className={subsectionFilter === subsection ? "filter-chip active-filter-chip" : "filter-chip"}
                    type="button"
                    key={subsection}
                    onClick={() => setSubsectionFilter(subsection)}
                  >
                    {subsection}
                  </button>
                ))}
              </div>
            ) : null}

            <label className="staff-library-search">
              Search anything
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Try antipasta, Nebbiolo, dairy, cocktail, course 1..."
              />
            </label>

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
                          {canManageLibrary ? (
                            <Link className="manager-edit-link" to={`/manager/content?edit=${doc.id}#training-page-form`}>
                              Edit / add photos
                            </Link>
                          ) : null}
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
                              onClick={() => startReviewCheck(doc)}
                              disabled={reviewingDocId === doc.id}
                            >
                              {acknowledgement ? "Retake review check" : "Start 5-question review"}
                            </button>
                            <small>
                              {acknowledgement
                                ? `Reviewed ${new Date(acknowledgement.reviewedAt).toLocaleDateString()}`
                                : `Answer ${reviewQuestionCount} questions to mark this page reviewed.`}
                            </small>
                          </div>

                          {activeReviewDocId === doc.id ? (
                            <div className="inline-review-check">
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
                                  {!reviewResult.passed ? (
                                    <div className="result-answer-list">
                                      {reviewQuestions.map((question, questionIndex) => (
                                        <article key={`${question.prompt}-answer`}>
                                          <strong>{question.prompt}</strong>
                                          <p>Correct answer: {question.correctAnswer}</p>
                                          {question.explanation ? <p>{question.explanation}</p> : null}
                                        </article>
                                      ))}
                                    </div>
                                  ) : null}
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
