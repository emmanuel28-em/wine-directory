import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatRole, useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { listCollectionsForRestaurant } from "../lib/collections.js";
import { getDataClient } from "../lib/dataClient.js";
import { requireRestaurantId } from "../lib/permissions.js";
import { listQuizAttemptsForRestaurant, listQuizzesForRestaurant } from "../lib/quizzes.js";
import { buildSectionReadiness } from "../lib/readiness.js";
import { listTrainingAcknowledgementsForRestaurant } from "../lib/trainingAcknowledgements.js";
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

async function listMembersForRestaurant(restaurantId) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();
  const membershipResult = await dataClient.models.Membership.list({
    filter: {
      restaurantId: {
        eq: restaurantId
      }
    }
  });

  if (membershipResult.errors?.length) {
    throw new Error(membershipResult.errors.map((error) => error.message).join(" "));
  }

  const memberships = membershipResult.data || [];
  const profiles = await Promise.all(
    memberships.map(async (membership) => {
      const profileResult = await dataClient.models.UserProfile.get({ id: membership.userProfileId });

      if (profileResult.errors?.length) {
        throw new Error(profileResult.errors.map((error) => error.message).join(" "));
      }

      return {
        membership,
        profile: profileResult.data || null
      };
    })
  );

  return profiles;
}

export default function ManagerStaffProgressPage() {
  const workspace = useCurrentWorkspace();
  const [attempts, setAttempts] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [members, setMembers] = useState([]);
  const [acknowledgements, setAcknowledgements] = useState([]);
  const [trainingDocs, setTrainingDocs] = useState([]);
  const [collections, setCollections] = useState([]);
  const [message, setMessage] = useState("");

  async function loadProgress() {
    if (workspace.status !== "ready") {
      return;
    }

    setMessage("");

    try {
      const [restaurantAttempts, restaurantQuizzes, restaurantMembers, restaurantAcknowledgements, restaurantDocs, restaurantCollections] = await Promise.all([
        listQuizAttemptsForRestaurant(workspace.restaurant.id),
        listQuizzesForRestaurant(workspace.restaurant.id),
        listMembersForRestaurant(workspace.restaurant.id),
        listTrainingAcknowledgementsForRestaurant(workspace.restaurant.id),
        listTrainingDocsForRestaurant(workspace.restaurant.id),
        listCollectionsForRestaurant(workspace.restaurant.id)
      ]);

      setAttempts(restaurantAttempts);
      setQuizzes(restaurantQuizzes);
      setMembers(restaurantMembers);
      setAcknowledgements(restaurantAcknowledgements);
      setTrainingDocs(restaurantDocs);
      setCollections(restaurantCollections);
    } catch (error) {
      setMessage(error.message || "Could not load staff progress.");
    }
  }

  useEffect(() => {
    loadProgress();
  }, [workspace.status, workspace.restaurant?.id]);

  const quizById = useMemo(() => new Map(quizzes.map((quiz) => [quiz.id, quiz])), [quizzes]);
  const memberByProfileId = useMemo(
    () => new Map(members.map((member) => [member.profile?.id || member.membership.userProfileId, member])),
    [members]
  );
  const trainingDocById = useMemo(() => new Map(trainingDocs.map((doc) => [doc.id, doc])), [trainingDocs]);
  const publishedDocs = useMemo(() => trainingDocs.filter((doc) => doc.status === "published"), [trainingDocs]);
  const activeStaffMembers = useMemo(
    () => members.filter((member) => member.membership?.status === "active" && member.membership?.role === "staff"),
    [members]
  );
  const staffReadinessRows = useMemo(
    () =>
      activeStaffMembers.map((member) => {
        const memberAcknowledgements = acknowledgements.filter((acknowledgement) => acknowledgement.userProfileId === member.profile?.id);
        const memberAttempts = attempts.filter((attempt) => attempt.userProfileId === member.profile?.id);
        const sections = buildSectionReadiness({
          docs: publishedDocs,
          collections,
          acknowledgements: memberAcknowledgements
        });

        return {
          member,
          reviewedCards: memberAcknowledgements.filter((acknowledgement) => publishedDocs.some((doc) => doc.id === acknowledgement.trainingDocId)).length,
          totalCards: publishedDocs.length,
          earnedSections: sections.filter((section) => section.earned),
          missingSections: sections.filter((section) => !section.earned),
          attempts: memberAttempts
        };
      }),
    [activeStaffMembers, acknowledgements, attempts, publishedDocs, collections]
  );

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Staff Quiz Results</p>
          <h1>Staff Progress</h1>
          <p>See who studied each card, who is section-ready, and who still needs review before service.</p>
        </div>
        <Link className="primary-button" to="/manager/assignments">
          Assign Training
        </Link>
      </div>

      {message ? <p className="form-message page-message">{message}</p> : null}

      {workspace.status === "loading" ? <div className="empty-panel">Loading staff progress...</div> : null}

      {workspace.status === "empty" || workspace.status === "error" ? (
        <div className="form-card">
          <h2>Restaurant access needed</h2>
          <p>{workspace.message}</p>
        </div>
      ) : null}

      {workspace.status === "ready" ? (
        <>
        <section className="data-list-panel">
          <div className="data-list-heading">
            <h2>Readiness by Staff Member</h2>
            <span>{activeStaffMembers.length} staff members</span>
          </div>

          {activeStaffMembers.length === 0 ? (
            <div className="empty-panel">No staff members yet. Invite staff before tracking readiness.</div>
          ) : (
            <div className="operator-table">
              {staffReadinessRows.map((row) => (
                <article className="operator-table-row progress-row" key={row.member.membership.id}>
                  <div>
                    <h4>{row.member.profile?.name || "Team Member"}</h4>
                    <p>{row.member.profile?.email || "No email found"}</p>
                  </div>
                  <div>
                    <h4>{row.reviewedCards}/{row.totalCards} cards reviewed</h4>
                    <p>{row.attempts.length} quiz attempt{row.attempts.length === 1 ? "" : "s"}</p>
                  </div>
                  <div>
                    <span className={row.missingSections.length === 0 && row.totalCards > 0 ? "status-badge status-published" : "status-badge status-draft"}>
                      {row.missingSections.length === 0 && row.totalCards > 0 ? "Fully Ready" : "Needs Review"}
                    </span>
                    <p>{row.earnedSections.length} section certificate{row.earnedSections.length === 1 ? "" : "s"} current</p>
                  </div>
                  <div>
                    <h4>Needs work</h4>
                    <p>{row.missingSections.slice(0, 3).map((section) => section.sectionName).join(", ") || "Nothing right now"}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="data-list-panel">
          <div className="data-list-heading">
            <h2>Training Pages Reviewed</h2>
            <span>{acknowledgements.length} confirmations</span>
          </div>

          {acknowledgements.length === 0 ? (
            <div className="empty-panel">No page reviews yet. Staff can mark a page as reviewed from the Training Library.</div>
          ) : (
            <div className="operator-table">
              {[...acknowledgements]
                .sort((a, b) => new Date(b.reviewedAt || 0) - new Date(a.reviewedAt || 0))
                .map((acknowledgement) => {
                  const member = memberByProfileId.get(acknowledgement.userProfileId);
                  const trainingDoc = trainingDocById.get(acknowledgement.trainingDocId);
                  return (
                    <article className="operator-table-row progress-row" key={acknowledgement.id}>
                      <div>
                        <h4>{member?.profile?.name || "Team Member"}</h4>
                        <p>{member?.profile?.email || "No email found"}</p>
                      </div>
                      <div>
                        <h4>{trainingDoc?.title || "Training Page"}</h4>
                        <p>{trainingDoc?.category || trainingDoc?.type || "Training"}</p>
                      </div>
                      <div>
                        <span className="status-badge status-published">Reviewed</span>
                      </div>
                      <div>
                        <h4>Confirmed</h4>
                        <p>{formatDateTime(acknowledgement.reviewedAt)}</p>
                      </div>
                    </article>
                  );
                })}
            </div>
          )}
        </section>

        <section className="data-list-panel">
          <div className="data-list-heading">
            <h2>Quiz Attempts</h2>
            <button className="secondary-button" type="button" onClick={loadProgress}>
              Refresh
            </button>
          </div>

          {attempts.length === 0 ? (
            <div className="empty-panel">No quiz results yet. Staff results will appear here after they submit quizzes.</div>
          ) : (
            <div className="operator-table">
              {attempts.map((attempt) => {
                const member = memberByProfileId.get(attempt.userProfileId);
                const quiz = quizById.get(attempt.quizId);

                return (
                  <article className="operator-table-row progress-row" key={attempt.id}>
                    <div>
                      <h4>{member?.profile?.name || "Staff Member"}</h4>
                      <p>{member?.profile?.email || "No email found"} · {formatRole(member?.membership?.role)}</p>
                    </div>
                    <div>
                      <h4>{quiz?.title || "Quiz"}</h4>
                      <p>{quiz?.category || "Training"}</p>
                    </div>
                    <div>
                      <span className={attempt.passed ? "status-badge status-published" : "status-badge status-draft"}>
                        {resultLabel(attempt.passed)}
                      </span>
                      <p>{attempt.score}%</p>
                    </div>
                    <div>
                      <h4>Completed</h4>
                      <p>{formatDateTime(attempt.completedAt)}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        </>
      ) : null}
    </section>
  );
}
