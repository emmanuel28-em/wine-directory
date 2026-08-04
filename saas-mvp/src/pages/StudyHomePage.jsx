import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import DailyStudyDeck from "../components/DailyStudyDeck.jsx";
import LeaderboardTable from "../components/leaderboard/LeaderboardTable.jsx";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import {
  getAssignedItemIdsForUser,
  listStaffGroupMembersForRestaurant,
  listTrainingAssignmentsForRestaurant
} from "../lib/assignments.js";
import { listCollectionsForRestaurant } from "../lib/collections.js";
import { buildDailyStudyQueue, dailyStudyGoal } from "../lib/dailyStudy.js";
import { getFileAssetUrl, isPreviewableImageFileAsset, listFileAssetsForRestaurant } from "../lib/fileAssets.js";
import { listLeaderboardForRestaurant, syncMyLeaderboardEntry } from "../lib/leaderboard.js";
import { isAdminOrManager } from "../lib/permissions.js";
import { reviewQuestionCount } from "../lib/reviewQuestions.js";
import { isRecentlyUpdated, isTrainingReviewCurrent } from "../lib/studyProgress.js";
import {
  listMyTrainingAcknowledgements,
  markTrainingDocReviewed
} from "../lib/trainingAcknowledgements.js";
import {
  listMyTrainingProgress,
  recordTrainingFactResponse
} from "../lib/trainingProgress.js";
import { listTrainingDocsForRestaurant } from "../lib/trainingDocs.js";

function replaceRecord(records, nextRecord) {
  const exists = records.some((record) => record.id === nextRecord.id);
  return exists ? records.map((record) => record.id === nextRecord.id ? nextRecord : record) : [...records, nextRecord];
}

export default function StudyHomePage() {
  const workspace = useCurrentWorkspace();
  const [studyData, setStudyData] = useState(null);
  const [sessionCards, setSessionCards] = useState([]);
  const [progressRecords, setProgressRecords] = useState([]);
  const [acknowledgements, setAcknowledgements] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sessionNumber, setSessionNumber] = useState(0);

  const makeQueue = useCallback((data, nextProgress = progressRecords) => buildDailyStudyQueue({
    ...data,
    acknowledgements,
    progressRecords: nextProgress,
    limit: dailyStudyGoal
  }), [acknowledgements, progressRecords]);

  useEffect(() => {
    let isCurrent = true;

    async function loadHome() {
      if (workspace.status !== "ready") return;
      setIsLoading(true);
      setMessage("");

      try {
        const restaurantId = workspace.restaurant.id;
        const userProfileId = workspace.userProfile.id;
        const [collections, allDocs, nextAcknowledgements, assignments, groupMembers, fileAssets, nextProgress, nextLeaderboard] = await Promise.all([
          listCollectionsForRestaurant(restaurantId),
          listTrainingDocsForRestaurant(restaurantId),
          listMyTrainingAcknowledgements({ restaurantId, userProfileId }),
          listTrainingAssignmentsForRestaurant(restaurantId),
          listStaffGroupMembersForRestaurant(restaurantId),
          listFileAssetsForRestaurant(restaurantId),
          listMyTrainingProgress({ restaurantId, userProfileId }),
          listLeaderboardForRestaurant(restaurantId)
        ]);
        const docs = allDocs.filter((doc) => doc.status === "published");
        const assignedTrainingDocIds = getAssignedItemIdsForUser({
          assignments,
          groupMembers,
          userProfileId,
          itemType: "trainingDoc"
        });
        const assignedCollectionIds = getAssignedItemIdsForUser({
          assignments,
          groupMembers,
          userProfileId,
          itemType: "collection"
        });
        const baseData = {
          docs,
          collections,
          assignedTrainingDocIds,
          assignedCollectionIds,
          fileUrlByTrainingDocId: {}
        };
        const preliminaryQueue = buildDailyStudyQueue({
          ...baseData,
          acknowledgements: nextAcknowledgements,
          progressRecords: nextProgress,
          limit: dailyStudyGoal
        });
        const queueDocIds = new Set(preliminaryQueue.map((card) => card.trainingDocId));
        const firstImageByDocId = new Map();

        fileAssets
          .filter((fileAsset) => queueDocIds.has(fileAsset.trainingDocId) && isPreviewableImageFileAsset(fileAsset))
          .forEach((fileAsset) => {
            if (!firstImageByDocId.has(fileAsset.trainingDocId)) firstImageByDocId.set(fileAsset.trainingDocId, fileAsset);
          });

        const imageEntries = await Promise.all(
          [...firstImageByDocId.entries()].map(async ([trainingDocId, fileAsset]) => {
            try {
              return [trainingDocId, await getFileAssetUrl({ fileAsset, restaurantId })];
            } catch {
              return null;
            }
          })
        );
        const data = {
          ...baseData,
          fileUrlByTrainingDocId: Object.fromEntries(imageEntries.filter(Boolean))
        };

        if (isCurrent) {
          setStudyData(data);
          setProgressRecords(nextProgress);
          setAcknowledgements(nextAcknowledgements);
          setLeaderboard(nextLeaderboard);
          setSessionCards(buildDailyStudyQueue({
            ...data,
            acknowledgements: nextAcknowledgements,
            progressRecords: nextProgress,
            limit: dailyStudyGoal
          }));
        }
      } catch (error) {
        if (isCurrent) setMessage(error.message || "Could not prepare your training dashboard.");
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    loadHome();
    return () => {
      isCurrent = false;
    };
  }, [workspace.status, workspace.restaurant?.id, workspace.userProfile?.id]);

  async function refreshLeaderboard() {
    try {
      await syncMyLeaderboardEntry({
        restaurantId: workspace.restaurant.id,
        userProfile: workspace.userProfile,
        membership: workspace.membership
      });
      setLeaderboard(await listLeaderboardForRestaurant(workspace.restaurant.id));
    } catch {
      // Completion remains saved even if the aggregate refresh is delayed.
    }
  }

  async function handleResponse(card, response) {
    const existingProgress = progressRecords.find((record) => record.trainingDocId === card.trainingDocId);
    const result = await recordTrainingFactResponse({
      restaurantId: workspace.restaurant.id,
      trainingDoc: card.trainingDoc,
      userProfileId: workspace.userProfile.id,
      cognitoUserId: workspace.userProfile.cognitoUserId,
      existingProgress,
      question: card.question,
      response,
      requiredFactCount: reviewQuestionCount
    });
    const nextProgress = replaceRecord(progressRecords, result.record);
    setProgressRecords(nextProgress);

    if (result.isComplete) {
      const existingAcknowledgement = acknowledgements.find((item) => item.trainingDocId === card.trainingDocId);
      const savedAcknowledgement = await markTrainingDocReviewed({
        restaurantId: workspace.restaurant.id,
        trainingDoc: card.trainingDoc,
        userProfileId: workspace.userProfile.id,
        cognitoUserId: workspace.userProfile.cognitoUserId,
        existingId: existingAcknowledgement?.id
      });
      setAcknowledgements((current) => replaceRecord(current, savedAcknowledgement));
      setMessage(`${card.title} is now reviewed.`);
      await refreshLeaderboard();
    }
  }

  function restartSession() {
    if (!studyData) return;
    setSessionCards(makeQueue(studyData));
    setSessionNumber((number) => number + 1);
  }

  const publishedDocs = studyData?.docs || [];
  const reviewedDocIds = useMemo(() => new Set(
    acknowledgements
      .filter((item) => isTrainingReviewCurrent(publishedDocs.find((doc) => doc.id === item.trainingDocId), item))
      .map((item) => item.trainingDocId)
  ), [acknowledgements, publishedDocs]);
  const completionPercent = publishedDocs.length ? Math.round((reviewedDocIds.size / publishedDocs.length) * 100) : 0;
  const attentionItems = useMemo(() => {
    if (!studyData) return [];
    return publishedDocs
      .filter((doc) => !reviewedDocIds.has(doc.id))
      .map((doc) => ({
        doc,
        assigned: studyData.assignedTrainingDocIds.has(doc.id) || studyData.assignedCollectionIds.has(doc.collectionId),
        recent: isRecentlyUpdated(doc)
      }))
      .filter((item) => item.assigned || item.recent)
      .sort((left, right) => Number(right.assigned) - Number(left.assigned) || new Date(right.doc.updatedAt || 0) - new Date(left.doc.updatedAt || 0))
      .slice(0, 5);
  }, [publishedDocs, reviewedDocIds, studyData]);
  const firstName = workspace.userProfile?.name?.split(" ")?.[0] || "there";

  return (
    <section className="page-section study-home-page">
      <header className="study-home-header">
        <div>
          <p className="eyebrow">{workspace.restaurant?.name || "Your restaurant"}</p>
          <h1>Welcome back, {firstName}</h1>
          <p>See what changed, practice what matters, and get ready for service.</p>
        </div>
        <div className="study-home-links">
          <Link className="secondary-button" to="/library">Search the library</Link>
          {isAdminOrManager(workspace.role) ? <Link className="secondary-button" to="/manage">Manage team</Link> : null}
        </div>
      </header>

      {message ? <div className="inline-alert">{message}</div> : null}
      {isLoading || workspace.isLoading ? <div className="daily-study-loading">Preparing your training...</div> : null}

      {!isLoading && workspace.status === "ready" ? (
        <>
          <div className="study-dashboard-grid">
            <aside className="study-overview-panel">
              <div className="study-overview-heading">
                <div className="study-readiness-ring" style={{ "--study-progress": `${completionPercent * 3.6}deg` }}>
                  <strong>{completionPercent}%</strong>
                </div>
                <div>
                  <p className="eyebrow">Your readiness</p>
                  <h2>{reviewedDocIds.size} of {publishedDocs.length} pages current</h2>
                </div>
              </div>

              <div className="study-progress-track" aria-label={`${completionPercent}% of published training reviewed`}>
                <span style={{ width: `${completionPercent}%` }} />
              </div>

              <div className="attention-list-heading">
                <div>
                  <h3>New and assigned</h3>
                  <p>Start here before your shift.</p>
                </div>
                <span>{attentionItems.length}</span>
              </div>

              {attentionItems.length ? (
                <div className="attention-list">
                  {attentionItems.map(({ doc, assigned }) => (
                    <Link key={doc.id} to={`/library?open=${doc.id}`}>
                      <span>{assigned ? "Assigned" : "Updated"}</span>
                      <strong>{doc.title}</strong>
                      <small>{doc.category || doc.type || "Training"}</small>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="attention-empty">
                  <strong>You are caught up.</strong>
                  <p>New assignments and menu updates will appear here.</p>
                </div>
              )}
            </aside>

            <div className="study-deck-panel">
              <div className="study-deck-panel-heading">
                <div>
                  <p className="eyebrow">Quick practice</p>
                  <h2>One fact at a time</h2>
                </div>
                <span>{sessionCards.length} facts ready</span>
              </div>
              <DailyStudyDeck
                key={sessionNumber}
                cards={sessionCards}
                onResponse={handleResponse}
                onRestart={restartSession}
                isExpanded={isExpanded}
                onToggleExpanded={() => setIsExpanded((value) => !value)}
              />
            </div>
          </div>

          <section className="home-leaderboard" id="leaderboard">
            <div className="home-section-heading">
              <div>
                <p className="eyebrow">Team momentum</p>
                <h2>Leaderboard</h2>
                <p>Pages reviewed, facts mastered, and active study streaks.</p>
              </div>
            </div>
            <LeaderboardTable entries={leaderboard.slice(0, 8)} currentUserProfileId={workspace.userProfile.id} />
          </section>

        </>
      ) : null}
    </section>
  );
}
