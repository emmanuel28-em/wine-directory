import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { getCertificationProgress, listCertificationsForRestaurant } from "../lib/certifications.js";
import { listQuizAttemptsForUser, listQuizzesForRestaurant } from "../lib/quizzes.js";

export default function StaffCertificationsPage() {
  const workspace = useCurrentWorkspace();
  const [certifications, setCertifications] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [message, setMessage] = useState("");

  async function loadCertifications() {
    if (workspace.status !== "ready") return;

    setMessage("");

    try {
      const [nextCertifications, nextQuizzes, nextAttempts] = await Promise.all([
        listCertificationsForRestaurant(workspace.restaurant.id),
        listQuizzesForRestaurant(workspace.restaurant.id),
        listQuizAttemptsForUser({
          restaurantId: workspace.restaurant.id,
          userProfileId: workspace.userProfile.id
        })
      ]);

      setCertifications(nextCertifications.filter((certification) => certification.status === "published"));
      setQuizzes(nextQuizzes);
      setAttempts(nextAttempts);
    } catch (error) {
      setMessage(error.message || "Could not load certifications.");
    }
  }

  useEffect(() => {
    loadCertifications();
  }, [workspace.status, workspace.restaurant?.id, workspace.userProfile?.id]);

  const certificationRows = useMemo(
    () =>
      certifications.map((certification) => ({
        certification,
        progress: getCertificationProgress({
          certification,
          quizzes,
          attempts
        })
      })),
    [certifications, quizzes, attempts]
  );

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Certifications</p>
          <h1>My Certifications</h1>
          <p>See which training goals you have earned and what to finish next.</p>
        </div>
        <Link className="primary-button" to="/quizzes">
          Take a Quiz
        </Link>
      </div>

      {message ? <p className="form-message page-message">{message}</p> : null}

      {workspace.status === "loading" ? <div className="empty-panel">Loading certifications...</div> : null}

      {workspace.status === "empty" || workspace.status === "error" ? (
        <div className="form-card">
          <h2>Restaurant access needed</h2>
          <p>{workspace.message}</p>
        </div>
      ) : null}

      {workspace.status === "ready" && certificationRows.length === 0 ? (
        <div className="empty-panel">No certifications are published yet. Check back after a manager creates one.</div>
      ) : null}

      {workspace.status === "ready" && certificationRows.length > 0 ? (
        <div className="dashboard-grid">
          {certificationRows.map(({ certification, progress }) => (
            <article className="stat-card certification-card" key={certification.id}>
              <span className={progress.earned ? "status-badge status-published" : "status-badge status-draft"}>
                {progress.earned ? "Certified" : "In Progress"}
              </span>
              <h2>{certification.name}</h2>
              <p>{certification.description || certification.category || "Training mastery"}</p>
              <div className="progress-track" aria-label={`${progress.completedCount} of ${progress.totalCount} quizzes passed`}>
                <span style={{ width: `${progress.totalCount ? (progress.completedCount / progress.totalCount) * 100 : 0}%` }} />
              </div>
              <p>{progress.completedCount} of {progress.totalCount} quizzes passed</p>

              <div className="certification-requirement-list">
                {progress.requirements.map((requirement) => (
                  <div key={requirement.quizId}>
                    <strong>{requirement.complete ? "Passed" : "Needs review"}</strong>
                    <span>{requirement.quiz?.title || "Quiz"}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
