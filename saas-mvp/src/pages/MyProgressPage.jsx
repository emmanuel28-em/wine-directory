import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { listCollectionsForRestaurant } from "../lib/collections.js";
import { listQuizAttemptsForUser, listQuizzesForRestaurant } from "../lib/quizzes.js";
import { buildSectionReadiness } from "../lib/readiness.js";
import { listMyTrainingAcknowledgements } from "../lib/trainingAcknowledgements.js";
import { listTrainingDocsForRestaurant } from "../lib/trainingDocs.js";

function formatDateTime(value) {
  if (!value) {
    return "Not completed";
  }

  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function resultLabel(passed) {
  return passed ? "Ready for Service" : "Needs Review";
}

export default function MyProgressPage() {
  const workspace = useCurrentWorkspace();
  const [attempts, setAttempts] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [acknowledgements, setAcknowledgements] = useState([]);
  const [trainingDocs, setTrainingDocs] = useState([]);
  const [collections, setCollections] = useState([]);
  const [message, setMessage] = useState("");

  async function loadMyProgress() {
    if (workspace.status !== "ready") {
      return;
    }

    setMessage("");

    try {
      const [myAttempts, restaurantQuizzes, myAcknowledgements, restaurantDocs, restaurantCollections] = await Promise.all([
        listQuizAttemptsForUser({
          restaurantId: workspace.restaurant.id,
          userProfileId: workspace.userProfile.id
        }),
        listQuizzesForRestaurant(workspace.restaurant.id),
        listMyTrainingAcknowledgements({
          restaurantId: workspace.restaurant.id,
          userProfileId: workspace.userProfile.id
        }),
        listTrainingDocsForRestaurant(workspace.restaurant.id),
        listCollectionsForRestaurant(workspace.restaurant.id)
      ]);

      setAttempts(myAttempts);
      setQuizzes(restaurantQuizzes);
      setAcknowledgements(myAcknowledgements);
      setTrainingDocs(restaurantDocs);
      setCollections(restaurantCollections);
    } catch (error) {
      setMessage(error.message || "Could not load your progress.");
    }
  }

  useEffect(() => {
    loadMyProgress();
  }, [workspace.status, workspace.restaurant?.id, workspace.userProfile?.id]);

  const quizById = useMemo(() => new Map(quizzes.map((quiz) => [quiz.id, quiz])), [quizzes]);
  const publishedDocs = useMemo(() => trainingDocs.filter((doc) => doc.status === "published"), [trainingDocs]);
  const reviewedDocIds = useMemo(() => new Set(acknowledgements.map((acknowledgement) => acknowledgement.trainingDocId)), [acknowledgements]);
  const sectionReadiness = useMemo(
    () => buildSectionReadiness({ docs: publishedDocs, collections, acknowledgements }),
    [publishedDocs, collections, acknowledgements]
  );
  const reviewedCount = acknowledgements.filter((acknowledgement) => publishedDocs.some((doc) => doc.id === acknowledgement.trainingDocId)).length;

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">My Progress</p>
          <h1>Training Progress</h1>
          <p>See what you reviewed, what still needs work, and which sections you are ready for.</p>
        </div>
        <Link className="primary-button" to="/training-library">
          Study Library
        </Link>
      </div>

      {message ? <p className="form-message page-message">{message}</p> : null}

      {workspace.status === "loading" ? <div className="empty-panel">Loading your progress...</div> : null}

      {workspace.status === "empty" || workspace.status === "error" ? (
        <div className="form-card">
          <h2>Workspace setup needed</h2>
          <p>{workspace.message}</p>
        </div>
      ) : null}

      {workspace.status === "ready" ? (
        <section className="progress-summary-grid">
          <article className="stat-card">
            <span>Cards Reviewed</span>
            <h2>{reviewedCount}/{publishedDocs.length}</h2>
            <p>Complete the review questions on each card to mark it reviewed.</p>
          </article>
          <article className="stat-card">
            <span>Section Certificates</span>
            <h2>{sectionReadiness.filter((section) => section.earned).length}/{sectionReadiness.length}</h2>
            <p>A certificate is current only when every published card in that section is reviewed.</p>
          </article>
          <article className="stat-card">
            <span>Quiz Attempts</span>
            <h2>{attempts.length}</h2>
            <p>Passed quizzes and card reviews both help managers see readiness.</p>
          </article>
        </section>
      ) : null}

      {workspace.status === "ready" && sectionReadiness.length > 0 ? (
        <section className="data-list-panel">
          <div className="data-list-heading">
            <h2>Section Readiness</h2>
            <span>{sectionReadiness.filter((section) => section.earned).length} current certificates</span>
          </div>
          <div className="dashboard-grid">
            {sectionReadiness.map((section) => (
              <article className="stat-card certification-card" key={section.sectionName}>
                <span className={section.earned ? "status-badge status-published" : "status-badge status-draft"}>
                  {section.earned ? "Certificate Current" : "Needs Work"}
                </span>
                <h2>{section.sectionName} Ready</h2>
                <p>{section.reviewedCards}/{section.totalCards} cards reviewed · {section.percent}% complete</p>
                {section.earned ? (
                  <p>Earned {section.latestReviewedAt ? formatDateTime(section.latestReviewedAt) : "after your final review"}.</p>
                ) : (
                  <p>Next up: {section.missingCards.slice(0, 3).map((doc) => doc.title).join(", ")}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {workspace.status === "ready" ? (
        <section className="data-list-panel">
          <div className="data-list-heading">
            <h2>Cards Studied</h2>
            <span>{reviewedCount} reviewed</span>
          </div>
          {publishedDocs.length === 0 ? (
            <div className="empty-panel">No published training cards yet.</div>
          ) : (
            <div className="operator-table">
              {publishedDocs.map((doc) => {
                const reviewed = reviewedDocIds.has(doc.id);
                return (
                  <article className="operator-table-row progress-row" key={doc.id}>
                    <div>
                      <h4>{doc.title}</h4>
                      <p>{doc.category || doc.type || "Training"}</p>
                    </div>
                    <div>
                      <span className={reviewed ? "status-badge status-published" : "status-badge status-draft"}>
                        {reviewed ? "Reviewed" : "Needs study"}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {workspace.status === "ready" && attempts.length > 0 ? (
        <section className="data-list-panel">
          <div className="data-list-heading">
            <h2>Quiz History</h2>
            <Link className="secondary-button" to="/quizzes">Take a Quiz</Link>
          </div>
          <div className="dashboard-grid">
            {attempts.map((attempt) => {
              const quiz = quizById.get(attempt.quizId);

              return (
                <article className="stat-card" key={attempt.id}>
                  <span className={attempt.passed ? "status-badge status-published" : "status-badge status-draft"}>
                    {resultLabel(attempt.passed)}
                  </span>
                  <h2>{quiz?.title || "Quiz"}</h2>
                  <p>{attempt.score}% · {formatDateTime(attempt.completedAt)}</p>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </section>
  );
}
