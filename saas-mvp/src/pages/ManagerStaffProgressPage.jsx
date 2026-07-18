import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatRole, useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { getDataClient } from "../lib/dataClient.js";
import { requireRestaurantId } from "../lib/permissions.js";
import { listQuizAttemptsForRestaurant, listQuizzesForRestaurant } from "../lib/quizzes.js";

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
  const [message, setMessage] = useState("");

  async function loadProgress() {
    if (workspace.status !== "ready") {
      return;
    }

    setMessage("");

    try {
      const [restaurantAttempts, restaurantQuizzes, restaurantMembers] = await Promise.all([
        listQuizAttemptsForRestaurant(workspace.restaurant.id),
        listQuizzesForRestaurant(workspace.restaurant.id),
        listMembersForRestaurant(workspace.restaurant.id)
      ]);

      setAttempts(restaurantAttempts);
      setQuizzes(restaurantQuizzes);
      setMembers(restaurantMembers);
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

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Staff Quiz Results</p>
          <h1>Staff Progress</h1>
          <p>See who has completed quizzes and who is ready for service.</p>
        </div>
        <Link className="primary-button" to="/manager/quizzes">
          Create Quiz
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
      ) : null}
    </section>
  );
}
