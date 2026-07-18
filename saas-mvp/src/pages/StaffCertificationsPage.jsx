import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import {
  getAssignedItemIdsForUser,
  listStaffGroupMembersForRestaurant,
  listTrainingAssignmentsForRestaurant
} from "../lib/assignments.js";
import { getCertificationProgress, listCertificationsForRestaurant } from "../lib/certifications.js";
import { listQuizAttemptsForUser, listQuizzesForRestaurant } from "../lib/quizzes.js";

export default function StaffCertificationsPage() {
  const workspace = useCurrentWorkspace();
  const [certifications, setCertifications] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [assignedCertificationIds, setAssignedCertificationIds] = useState(new Set());
  const [hasAssignments, setHasAssignments] = useState(false);
  const [message, setMessage] = useState("");

  async function loadCertifications() {
    if (workspace.status !== "ready") return;

    setMessage("");

    try {
      const [nextCertifications, nextQuizzes, nextAttempts, assignments, groupMembers] = await Promise.all([
        listCertificationsForRestaurant(workspace.restaurant.id),
        listQuizzesForRestaurant(workspace.restaurant.id),
        listQuizAttemptsForUser({
          restaurantId: workspace.restaurant.id,
          userProfileId: workspace.userProfile.id
        }),
        listTrainingAssignmentsForRestaurant(workspace.restaurant.id),
        listStaffGroupMembersForRestaurant(workspace.restaurant.id)
      ]);
      const nextAssignedCertificationIds = getAssignedItemIdsForUser({
        assignments,
        groupMembers,
        userProfileId: workspace.userProfile.id,
        itemType: "certification"
      });

      setCertifications(nextCertifications.filter((certification) => certification.status === "published"));
      setQuizzes(nextQuizzes);
      setAttempts(nextAttempts);
      setAssignedCertificationIds(nextAssignedCertificationIds);
      setHasAssignments(assignments.some((assignment) => assignment.status === "active" && assignment.itemType === "certification"));
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
        assigned: assignedCertificationIds.has(certification.id),
        progress: getCertificationProgress({
          certification,
          quizzes,
          attempts
        })
      })),
    [certifications, quizzes, attempts, assignedCertificationIds]
  );
  const assignedRows = certificationRows.filter((row) => row.assigned);
  const otherRows = certificationRows.filter((row) => !row.assigned);
  const visibleSections = hasAssignments
    ? [
        { title: "Assigned to me", rows: assignedRows, empty: "No certifications are assigned to you yet." },
        { title: "Other available certifications", rows: otherRows, empty: "" }
      ]
    : [{ title: "Available certifications", rows: certificationRows, empty: "No certifications are published yet." }];

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
        <div className="staff-library-sections">
          {visibleSections.map((section) => (
            <section className="assignment-section" key={section.title}>
              <h2>{section.title}</h2>
              {section.rows.length === 0 && section.empty ? <p className="empty-panel">{section.empty}</p> : null}
              {section.rows.length > 0 ? (
                <div className="dashboard-grid">
                  {section.rows.map(({ certification, progress, assigned }) => (
                    <article className="stat-card certification-card" key={certification.id}>
                      <span className={progress.earned ? "status-badge status-published" : "status-badge status-draft"}>
                        {progress.earned ? "Certified" : assigned ? "Assigned" : "In Progress"}
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
          ))}
        </div>
      ) : null}
    </section>
  );
}
