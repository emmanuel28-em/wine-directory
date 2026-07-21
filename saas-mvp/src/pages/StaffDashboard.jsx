import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import {
  getAssignedItemIdsForUser,
  listStaffGroupMembersForRestaurant,
  listTrainingAssignmentsForRestaurant
} from "../lib/assignments.js";
import { getCertificationProgress, listCertificationsForRestaurant } from "../lib/certifications.js";
import { listCollectionsForRestaurant } from "../lib/collections.js";
import { listQuizAttemptsForUser, listQuizzesForRestaurant } from "../lib/quizzes.js";
import { buildSectionReadiness } from "../lib/readiness.js";
import { listMyTrainingAcknowledgements } from "../lib/trainingAcknowledgements.js";
import { listTrainingDocsForRestaurant, parseContentJson } from "../lib/trainingDocs.js";

const recentWindowMs = 14 * 24 * 60 * 60 * 1000;

function wasPublishedRecently(doc) {
  const date = new Date(doc.updatedAt || doc.createdAt || 0).getTime();
  return Number.isFinite(date) && Date.now() - date <= recentWindowMs;
}

function formatDueDate(value) {
  if (!value) return "No due date";
  return `Due ${new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

export default function StaffDashboard() {
  const workspace = useCurrentWorkspace();
  const [data, setData] = useState({
    docs: [],
    collections: [],
    acknowledgements: [],
    assignments: [],
    groupMembers: [],
    quizzes: [],
    attempts: [],
    certifications: []
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function loadDashboard() {
      if (workspace.status !== "ready") return;
      setMessage("");

      try {
        const restaurantId = workspace.restaurant.id;
        const userProfileId = workspace.userProfile.id;
        const [docs, collections, acknowledgements, assignments, groupMembers, quizzes, attempts, certifications] = await Promise.all([
          listTrainingDocsForRestaurant(restaurantId),
          listCollectionsForRestaurant(restaurantId),
          listMyTrainingAcknowledgements({ restaurantId, userProfileId }),
          listTrainingAssignmentsForRestaurant(restaurantId),
          listStaffGroupMembersForRestaurant(restaurantId),
          listQuizzesForRestaurant(restaurantId),
          listQuizAttemptsForUser({ restaurantId, userProfileId }),
          listCertificationsForRestaurant(restaurantId)
        ]);

        if (isCurrent) {
          setData({ docs, collections, acknowledgements, assignments, groupMembers, quizzes, attempts, certifications });
        }
      } catch (error) {
        if (isCurrent) setMessage(error.message || "Your training dashboard could not be loaded.");
      }
    }

    loadDashboard();
    return () => {
      isCurrent = false;
    };
  }, [workspace.status, workspace.restaurant?.id, workspace.userProfile?.id]);

  const summary = useMemo(() => {
    const publishedDocs = data.docs.filter((doc) => doc.status === "published");
    const reviewedDocIds = new Set(data.acknowledgements.map((item) => item.trainingDocId));
    const assignedDocIds = getAssignedItemIdsForUser({
      assignments: data.assignments,
      groupMembers: data.groupMembers,
      userProfileId: workspace.userProfile?.id,
      itemType: "trainingDoc"
    });
    const assignedQuizIds = getAssignedItemIdsForUser({
      assignments: data.assignments,
      groupMembers: data.groupMembers,
      userProfileId: workspace.userProfile?.id,
      itemType: "quiz"
    });
    const assignedCertificationIds = getAssignedItemIdsForUser({
      assignments: data.assignments,
      groupMembers: data.groupMembers,
      userProfileId: workspace.userProfile?.id,
      itemType: "certification"
    });
    const passedQuizIds = new Set(data.attempts.filter((attempt) => attempt.passed).map((attempt) => attempt.quizId));
    const myGroupIds = new Set(
      data.groupMembers
        .filter((member) => member.status === "active" && member.userProfileId === workspace.userProfile?.id)
        .map((member) => member.staffGroupId)
    );
    const myAssignments = data.assignments
      .filter((assignment) => assignment.status === "active")
      .filter(
        (assignment) =>
          (assignment.targetType === "member" && assignment.targetId === workspace.userProfile?.id) ||
          (assignment.targetType === "group" && myGroupIds.has(assignment.targetId))
      );
    const assignmentByItemId = new Map(myAssignments.map((assignment) => [assignment.itemId, assignment]));
    const assignedDocs = publishedDocs.filter((doc) => assignedDocIds.has(doc.id) && !reviewedDocIds.has(doc.id));
    const assignedQuizzes = data.quizzes.filter((quiz) => quiz.isPublished && assignedQuizIds.has(quiz.id) && !passedQuizIds.has(quiz.id));
    const publishedCertifications = data.certifications.filter((certification) => certification.status === "published");
    const certificationRows = publishedCertifications.map((certification) => ({
      certification,
      assigned: assignedCertificationIds.has(certification.id),
      progress: getCertificationProgress({ certification, quizzes: data.quizzes, attempts: data.attempts })
    }));
    const assignedCertifications = certificationRows.filter((row) => row.assigned && !row.progress.earned);
    const earnedNamedCertifications = certificationRows.filter((row) => row.progress.earned);
    const sectionReadiness = buildSectionReadiness({ docs: publishedDocs, collections: data.collections, acknowledgements: data.acknowledgements });

    return {
      publishedDocs,
      reviewedDocIds,
      assignedDocs,
      assignedQuizzes,
      assignedCertifications,
      assignmentByItemId,
      newDocs: publishedDocs.filter((doc) => !reviewedDocIds.has(doc.id) && wasPublishedRecently(doc)).slice(0, 6),
      needsStudy: publishedDocs.filter((doc) => !reviewedDocIds.has(doc.id)),
      reviewedCount: publishedDocs.filter((doc) => reviewedDocIds.has(doc.id)).length,
      earnedNamedCertifications,
      sectionReadiness,
      earnedSections: sectionReadiness.filter((section) => section.earned)
    };
  }, [data, workspace.userProfile?.id]);

  const assignedItems = [
    ...summary.assignedDocs.map((doc) => ({
      id: `doc-${doc.id}`,
      label: "Training page",
      title: doc.title,
      detail: formatDueDate(summary.assignmentByItemId.get(doc.id)?.dueDate),
      to: `/training-library?open=${doc.id}`
    })),
    ...summary.assignedQuizzes.map((quiz) => ({
      id: `quiz-${quiz.id}`,
      label: "Quiz",
      title: quiz.title,
      detail: formatDueDate(summary.assignmentByItemId.get(quiz.id)?.dueDate),
      to: "/quizzes"
    })),
    ...summary.assignedCertifications.map(({ certification, progress }) => ({
      id: `cert-${certification.id}`,
      label: "Certification",
      title: certification.name,
      detail: `${progress.completedCount} of ${progress.totalCount} quizzes passed`,
      to: "/certifications"
    }))
  ];

  const firstName = workspace.userProfile?.name?.split(" ")?.[0] || "there";

  return (
    <section className="page-section staff-home">
      <div className="staff-home-hero">
        <div>
          <p className="eyebrow">Your Line Up</p>
          <h1>Hi {firstName}. Here’s what to study.</h1>
          <p>Finish assigned training, catch up on new pages, and stay ready for service.</p>
        </div>
        <Link className="primary-button" to={assignedItems[0]?.to || "/training-library"}>
          {assignedItems.length ? "Start assigned training" : "Browse training"}
        </Link>
      </div>

      {message ? <p className="form-message page-message">{message}</p> : null}
      {workspace.isLoading ? <div className="empty-panel">Loading your Line Up...</div> : null}

      {workspace.status === "ready" ? (
        <>
          <section className="staff-readiness-strip" aria-label="Training status">
            <Link to="/training-library"><strong>{assignedItems.length}</strong><span>Assigned</span></Link>
            <Link to="/training-library"><strong>{summary.newDocs.length}</strong><span>New</span></Link>
            <Link to="/my-progress"><strong>{summary.reviewedCount}</strong><span>Reviewed</span></Link>
            <Link to="/my-progress"><strong>{summary.needsStudy.length}</strong><span>Needs study</span></Link>
            <Link to="/certifications"><strong>{summary.earnedNamedCertifications.length + summary.earnedSections.length}</strong><span>Certified</span></Link>
          </section>

          <div className="staff-home-grid">
            <section className="staff-home-panel staff-home-priority">
              <div className="staff-home-panel-heading">
                <div><p className="eyebrow">Priority</p><h2>Assigned to me</h2></div>
                <Link to="/training-library">Open library</Link>
              </div>
              {assignedItems.length === 0 ? (
                <div className="staff-home-empty"><strong>You’re caught up.</strong><p>No assigned training is waiting right now.</p></div>
              ) : (
                <div className="staff-home-list">
                  {assignedItems.slice(0, 6).map((item) => (
                    <Link key={item.id} to={item.to}>
                      <span>{item.label}</span><strong>{item.title}</strong><small>{item.detail}</small>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="staff-home-panel">
              <div className="staff-home-panel-heading">
                <div><p className="eyebrow">Latest</p><h2>Recently published</h2></div>
              </div>
              {summary.newDocs.length === 0 ? (
                <div className="staff-home-empty"><strong>No new pages waiting.</strong><p>Your current training is up to date.</p></div>
              ) : (
                <div className="staff-home-list compact">
                  {summary.newDocs.map((doc) => {
                    const content = parseContentJson(doc.contentJson);
                    return (
                      <Link key={doc.id} to={`/training-library?open=${doc.id}`}>
                        <span>{doc.category || doc.type || "Training"}</span><strong>{doc.title}</strong><small>{content.summary || "Open to study"}</small>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <section className="staff-home-panel">
            <div className="staff-home-panel-heading">
              <div><p className="eyebrow">Readiness</p><h2>My certifications</h2></div>
              <Link to="/my-progress">See full progress</Link>
            </div>
            {summary.sectionReadiness.length === 0 && summary.earnedNamedCertifications.length === 0 ? (
              <div className="staff-home-empty"><strong>No readiness goals yet.</strong><p>Your managers can publish training and certifications for the team.</p></div>
            ) : (
              <div className="staff-certificate-row">
                {summary.sectionReadiness.slice(0, 6).map((section) => (
                  <article key={section.sectionName} className={section.earned ? "is-earned" : ""}>
                    <span>{section.earned ? "Ready" : `${section.percent}%`}</span>
                    <strong>{section.sectionName} Ready</strong>
                    <small>{section.reviewedCards} of {section.totalCards} cards reviewed</small>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}
