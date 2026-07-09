import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { listQuizAttemptsForUser, listQuizzesForRestaurant } from "../lib/quizzes.js";

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
  const [message, setMessage] = useState("");

  async function loadMyProgress() {
    if (workspace.status !== "ready") {
      return;
    }

    setMessage("");

    try {
      const [myAttempts, restaurantQuizzes] = await Promise.all([
        listQuizAttemptsForUser({
          restaurantId: workspace.restaurant.id,
          userProfileId: workspace.userProfile.id
        }),
        listQuizzesForRestaurant(workspace.restaurant.id)
      ]);

      setAttempts(myAttempts);
      setQuizzes(restaurantQuizzes);
    } catch (error) {
      setMessage(error.message || "Could not load your progress.");
    }
  }

  useEffect(() => {
    loadMyProgress();
  }, [workspace.status, workspace.restaurant?.id, workspace.userProfile?.id]);

  const quizById = useMemo(() => new Map(quizzes.map((quiz) => [quiz.id, quiz])), [quizzes]);

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">My Progress</p>
          <h1>Training Progress</h1>
          <p>Review your quiz history and see where you are ready for service.</p>
        </div>
        <Link className="primary-button" to="/quizzes">
          Take a Quiz
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

      {workspace.status === "ready" && attempts.length === 0 ? (
        <div className="empty-panel">No quiz attempts yet. Take a quiz to start building your progress record.</div>
      ) : null}

      {workspace.status === "ready" && attempts.length > 0 ? (
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
      ) : null}
    </section>
  );
}
