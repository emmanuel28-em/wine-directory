import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TeamReadinessTable from "../components/readiness/TeamReadinessTable.jsx";
import { formatRole, useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import {
  listStaffGroupMembersForRestaurant,
  listStaffGroupsForRestaurant
} from "../lib/assignments.js";
import { listCollectionsForRestaurant } from "../lib/collections.js";
import { listQuizAttemptsForRestaurant, listQuizzesForRestaurant } from "../lib/quizzes.js";
import { buildSectionReadiness } from "../lib/readiness.js";
import { listTeamMembersForRestaurant } from "../lib/settings.js";
import { getLatestStudyDate, isRecentlyUpdated, isTrainingReviewCurrent } from "../lib/studyProgress.js";
import { listTrainingAcknowledgementsForRestaurant } from "../lib/trainingAcknowledgements.js";
import { listTrainingDocsForRestaurant } from "../lib/trainingDocs.js";
import { listTrainingProgressForRestaurant, readTrainingProgress } from "../lib/trainingProgress.js";

const allTeamsFilter = "all";

function formatDateTime(value) {
  if (!value) return "Not completed";
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

export default function ManagerReadinessPage() {
  const workspace = useCurrentWorkspace();
  const [attempts, setAttempts] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [members, setMembers] = useState([]);
  const [acknowledgements, setAcknowledgements] = useState([]);
  const [trainingDocs, setTrainingDocs] = useState([]);
  const [collections, setCollections] = useState([]);
  const [staffGroups, setStaffGroups] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [trainingProgress, setTrainingProgress] = useState([]);
  const [teamFilter, setTeamFilter] = useState(allTeamsFilter);
  const [message, setMessage] = useState("");

  async function loadReadiness() {
    if (workspace.status !== "ready") return;
    setMessage("");

    try {
      const restaurantId = workspace.restaurant.id;
      const [
        restaurantAttempts,
        restaurantQuizzes,
        restaurantMembers,
        restaurantAcknowledgements,
        restaurantDocs,
        restaurantCollections,
        restaurantGroups,
        restaurantGroupMembers,
        restaurantProgress
      ] = await Promise.all([
        listQuizAttemptsForRestaurant(restaurantId),
        listQuizzesForRestaurant(restaurantId),
        listTeamMembersForRestaurant(restaurantId),
        listTrainingAcknowledgementsForRestaurant(restaurantId),
        listTrainingDocsForRestaurant(restaurantId),
        listCollectionsForRestaurant(restaurantId),
        listStaffGroupsForRestaurant(restaurantId),
        listStaffGroupMembersForRestaurant(restaurantId),
        listTrainingProgressForRestaurant(restaurantId)
      ]);

      setAttempts(restaurantAttempts);
      setQuizzes(restaurantQuizzes);
      setMembers(restaurantMembers);
      setAcknowledgements(restaurantAcknowledgements);
      setTrainingDocs(restaurantDocs);
      setCollections(restaurantCollections);
      setStaffGroups(restaurantGroups.filter((group) => group.status === "active"));
      setGroupMembers(restaurantGroupMembers.filter((member) => member.status === "active"));
      setTrainingProgress(restaurantProgress);
    } catch (error) {
      setMessage(error.message || "Could not load team readiness.");
    }
  }

  useEffect(() => {
    loadReadiness();
  }, [workspace.status, workspace.restaurant?.id]);

  const quizById = useMemo(() => new Map(quizzes.map((quiz) => [quiz.id, quiz])), [quizzes]);
  const memberByProfileId = useMemo(
    () => new Map(members.map((member) => [member.profile?.id || member.membership.userProfileId, member])),
    [members]
  );
  const trainingDocById = useMemo(() => new Map(trainingDocs.map((doc) => [doc.id, doc])), [trainingDocs]);
  const publishedDocs = useMemo(() => trainingDocs.filter((doc) => doc.status === "published"), [trainingDocs]);
  const recentDocs = useMemo(() => publishedDocs.filter((doc) => isRecentlyUpdated(doc)), [publishedDocs]);
  const activeStaffMembers = useMemo(
    () => members.filter((member) => member.membership?.status === "active" && member.membership?.role === "staff"),
    [members]
  );
  const groupById = useMemo(() => new Map(staffGroups.map((group) => [group.id, group])), [staffGroups]);

  const staffReadinessRows = useMemo(
    () => activeStaffMembers.map((member) => {
      const profileId = member.profile?.id || member.membership.userProfileId;
      const memberAcknowledgements = acknowledgements.filter((item) => item.userProfileId === profileId);
      const currentAcknowledgements = memberAcknowledgements.filter((item) =>
        isTrainingReviewCurrent(trainingDocById.get(item.trainingDocId), item)
      );
      const currentReviewIds = new Set(currentAcknowledgements.map((item) => item.trainingDocId));
      const memberAttempts = attempts.filter((attempt) => attempt.userProfileId === profileId);
      const memberGroupIds = groupMembers
        .filter((item) => item.userProfileId === profileId)
        .map((item) => item.staffGroupId);
      const groupNames = memberGroupIds.map((groupId) => groupById.get(groupId)?.name).filter(Boolean);
      const reviewedCards = publishedDocs.filter((doc) => currentReviewIds.has(doc.id)).length;
      const memberProgress = trainingProgress.filter((item) => item.userProfileId === profileId);
      const inProgressCards = publishedDocs.filter((doc) => {
        if (currentReviewIds.has(doc.id)) return false;
        const progress = readTrainingProgress(memberProgress.find((item) => item.trainingDocId === doc.id), doc);
        return progress.masteredFactKeys.length > 0;
      }).length;
      const completionPercent = publishedDocs.length ? Math.round((reviewedCards / publishedDocs.length) * 100) : 0;
      const recentMissingCount = recentDocs.filter((doc) => !currentReviewIds.has(doc.id)).length;
      const sections = buildSectionReadiness({
        docs: publishedDocs,
        collections,
        acknowledgements: currentAcknowledgements
      });

      return {
        member,
        groupIds: memberGroupIds,
        groupNames,
        reviewedCards,
        totalCards: publishedDocs.length,
        completionPercent,
        recentMissingCount,
        isUpToDate: recentDocs.length ? recentMissingCount === 0 : publishedDocs.length > 0 && reviewedCards === publishedDocs.length,
        lastActiveAt: [
          getLatestStudyDate(memberAcknowledgements, memberAttempts),
          ...memberProgress.map((item) => item.lastStudiedAt)
        ].filter(Boolean).sort((left, right) => new Date(right) - new Date(left))[0] || "",
        inProgressCards,
        earnedSections: sections.filter((section) => section.earned),
        missingSections: sections.filter((section) => !section.earned),
        attempts: memberAttempts
      };
    }),
    [activeStaffMembers, acknowledgements, attempts, publishedDocs, recentDocs, collections, groupMembers, groupById, trainingDocById, trainingProgress]
  );

  const filteredRows = useMemo(
    () => staffReadinessRows.filter((row) => teamFilter === allTeamsFilter || row.groupIds.includes(teamFilter)),
    [staffReadinessRows, teamFilter]
  );
  const readinessSections = useMemo(
    () => buildSectionReadiness({ docs: publishedDocs, collections, acknowledgements: [] }).map((section) => section.sectionName),
    [publishedDocs, collections]
  );
  const averageCompletion = filteredRows.length
    ? Math.round(filteredRows.reduce((sum, row) => sum + row.completionPercent, 0) / filteredRows.length)
    : 0;
  const upToDateCount = filteredRows.filter((row) => row.isUpToDate).length;
  const recentlyActiveCount = filteredRows.filter((row) =>
    row.lastActiveAt && Date.now() - new Date(row.lastActiveAt).getTime() <= 7 * 24 * 60 * 60 * 1000
  ).length;

  return (
    <section className="page-section manager-readiness-page">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Manager view</p>
          <h1>Team Readiness</h1>
          <p>See who is current on published training, who needs review, and when each person last studied.</p>
        </div>
        <div className="header-action-row">
          <Link className="secondary-button" to="/manage/team">Assign Training</Link>
          <button className="primary-button" type="button" onClick={loadReadiness}>Refresh</button>
        </div>
      </div>

      {message ? <p className="form-message page-message">{message}</p> : null}
      {workspace.status === "loading" ? <div className="empty-panel">Loading team readiness...</div> : null}

      {workspace.status === "ready" ? (
        <>
          <div className="readiness-summary-grid">
            <article><span>Average completion</span><strong>{averageCompletion}%</strong></article>
            <article><span>Up to date</span><strong>{upToDateCount}/{filteredRows.length}</strong></article>
            <article><span>Needs review</span><strong>{filteredRows.length - upToDateCount}</strong></article>
            <article><span>Active this week</span><strong>{recentlyActiveCount}</strong></article>
          </div>

          <section className="readiness-filter-panel" aria-label="Filter readiness by team role">
            <div>
              <h2>Team progress</h2>
              <p>Filter by the roles your restaurant created, such as Servers, Bartenders, or Runners.</p>
            </div>
            <div className="quick-filter-row">
              <button className={teamFilter === allTeamsFilter ? "filter-chip active-filter-chip" : "filter-chip"} type="button" onClick={() => setTeamFilter(allTeamsFilter)}>
                Everyone
              </button>
              {staffGroups.map((group) => (
                <button className={teamFilter === group.id ? "filter-chip active-filter-chip" : "filter-chip"} type="button" key={group.id} onClick={() => setTeamFilter(group.id)}>
                  {group.name}
                </button>
              ))}
            </div>
          </section>

          <TeamReadinessTable rows={filteredRows} />

          <details className="data-list-panel progress-detail-panel">
            <summary>Readiness by training section</summary>
            <p className="table-scroll-hint">Swipe sideways to see every training section.</p>
            <div className="readiness-matrix-wrap">
              <table className="readiness-matrix">
                <thead>
                  <tr><th>Team member</th><th>Overall</th>{readinessSections.map((name) => <th key={name}>{name}</th>)}</tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => {
                    const sectionByName = new Map([...row.earnedSections, ...row.missingSections].map((section) => [section.sectionName, section]));
                    return (
                      <tr key={row.member.membership.id}>
                        <th scope="row"><strong>{row.member.profile?.name || "Team Member"}</strong><small>{row.groupNames.join(" · ") || "No team group"}</small></th>
                        <td><strong>{row.completionPercent}%</strong><small>{row.reviewedCards}/{row.totalCards} pages</small></td>
                        {readinessSections.map((name) => {
                          const section = sectionByName.get(name);
                          return <td key={name}><span className={section?.earned ? "matrix-status is-ready" : section?.reviewedCards ? "matrix-status is-progress" : "matrix-status"}>{section?.earned ? "Ready" : section ? `${section.reviewedCards}/${section.totalCards}` : "—"}</span></td>;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>

          <details className="data-list-panel progress-detail-panel">
            <summary>Training page review history ({acknowledgements.length})</summary>
            <div className="operator-table">
              {[...acknowledgements].sort((a, b) => new Date(b.reviewedAt || 0) - new Date(a.reviewedAt || 0)).map((acknowledgement) => {
                const member = memberByProfileId.get(acknowledgement.userProfileId);
                const trainingDoc = trainingDocById.get(acknowledgement.trainingDocId);
                return (
                  <article className="operator-table-row progress-row" key={acknowledgement.id}>
                    <div><h4>{member?.profile?.name || "Team Member"}</h4><p>{member?.profile?.email || "No email found"}</p></div>
                    <div><h4>{trainingDoc?.title || "Training Page"}</h4><p>{trainingDoc?.category || trainingDoc?.type || "Training"}</p></div>
                    <div><span className={isTrainingReviewCurrent(trainingDoc, acknowledgement) ? "status-badge status-published" : "status-badge status-draft"}>{isTrainingReviewCurrent(trainingDoc, acknowledgement) ? "Current" : "Needs refresh"}</span></div>
                    <div><h4>Completed</h4><p>{formatDateTime(acknowledgement.reviewedAt)}</p></div>
                  </article>
                );
              })}
            </div>
          </details>

          <details className="data-list-panel progress-detail-panel">
            <summary>Quiz attempt history ({attempts.length})</summary>
            <div className="operator-table">
              {attempts.map((attempt) => {
                const member = memberByProfileId.get(attempt.userProfileId);
                const quiz = quizById.get(attempt.quizId);
                return (
                  <article className="operator-table-row progress-row" key={attempt.id}>
                    <div><h4>{member?.profile?.name || "Staff Member"}</h4><p>{member?.profile?.email || "No email found"} · {formatRole(member?.membership?.role)}</p></div>
                    <div><h4>{quiz?.title || "Quiz"}</h4><p>{quiz?.category || "Training"}</p></div>
                    <div><span className={attempt.passed ? "status-badge status-published" : "status-badge status-draft"}>{resultLabel(attempt.passed)}</span><p>{attempt.score}%</p></div>
                    <div><h4>Completed</h4><p>{formatDateTime(attempt.completedAt)}</p></div>
                  </article>
                );
              })}
            </div>
          </details>
        </>
      ) : null}
    </section>
  );
}
