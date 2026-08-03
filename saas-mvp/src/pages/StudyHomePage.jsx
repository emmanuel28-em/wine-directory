import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DailyStudyDeck from "../components/DailyStudyDeck.jsx";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import {
  getAssignedItemIdsForUser,
  listStaffGroupMembersForRestaurant,
  listTrainingAssignmentsForRestaurant
} from "../lib/assignments.js";
import { listCollectionsForRestaurant } from "../lib/collections.js";
import {
  buildDailyStudyQueue,
  countDailyMastered,
  dailyStudyGoal,
  getDailyStudyStorageKey,
  parseDailyStudyProgress,
  recordDailyStudyResponse
} from "../lib/dailyStudy.js";
import { getFileAssetUrl, isPreviewableImageFileAsset, listFileAssetsForRestaurant } from "../lib/fileAssets.js";
import { isAdminOrManager } from "../lib/permissions.js";
import {
  getPracticeStorageKey,
  markPracticePrompt,
  parsePracticeProgress
} from "../lib/practiceProgress.js";
import { listMyTrainingAcknowledgements } from "../lib/trainingAcknowledgements.js";
import { listTrainingDocsForRestaurant } from "../lib/trainingDocs.js";

const emptyDailyProgress = { masteredKeys: [], reviewAgainKeys: [] };

export default function StudyHomePage() {
  const workspace = useCurrentWorkspace();
  const [studyData, setStudyData] = useState(null);
  const [sessionCards, setSessionCards] = useState([]);
  const [practiceProgress, setPracticeProgress] = useState({});
  const [dailyProgress, setDailyProgress] = useState(emptyDailyProgress);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sessionNumber, setSessionNumber] = useState(0);

  function makeQueue(data, nextPracticeProgress = practiceProgress) {
    return buildDailyStudyQueue({
      ...data,
      practiceProgress: nextPracticeProgress,
      limit: dailyStudyGoal
    });
  }

  useEffect(() => {
    let isCurrent = true;

    async function loadDailyStudy() {
      if (workspace.status !== "ready") return;
      setIsLoading(true);
      setMessage("");

      try {
        const restaurantId = workspace.restaurant.id;
        const userProfileId = workspace.userProfile.id;
        const practiceStorageKey = getPracticeStorageKey(restaurantId, userProfileId);
        const dailyStorageKey = getDailyStudyStorageKey(restaurantId, userProfileId);
        const storedPractice = parsePracticeProgress(window.localStorage.getItem(practiceStorageKey));
        const storedDaily = parseDailyStudyProgress(window.localStorage.getItem(dailyStorageKey));
        const [collections, allDocs, acknowledgements, assignments, groupMembers, fileAssets] = await Promise.all([
          listCollectionsForRestaurant(restaurantId),
          listTrainingDocsForRestaurant(restaurantId),
          listMyTrainingAcknowledgements({ restaurantId, userProfileId }),
          listTrainingAssignmentsForRestaurant(restaurantId),
          listStaffGroupMembersForRestaurant(restaurantId),
          listFileAssetsForRestaurant(restaurantId)
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
          acknowledgements,
          assignedTrainingDocIds,
          assignedCollectionIds,
          fileUrlByTrainingDocId: {}
        };
        const preliminaryQueue = buildDailyStudyQueue({
          ...baseData,
          practiceProgress: storedPractice,
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
              const url = await getFileAssetUrl({ fileAsset, restaurantId });
              return [trainingDocId, url];
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
          setPracticeProgress(storedPractice);
          setDailyProgress(storedDaily);
          setSessionCards(buildDailyStudyQueue({ ...data, practiceProgress: storedPractice, limit: dailyStudyGoal }));
        }
      } catch (error) {
        if (isCurrent) setMessage(error.message || "Could not prepare today's study cards.");
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    loadDailyStudy();
    return () => {
      isCurrent = false;
    };
  }, [workspace.status, workspace.restaurant?.id, workspace.userProfile?.id]);

  function handleResponse(card, response) {
    if (workspace.status !== "ready") return;

    if (response === "got-it") {
      setPracticeProgress((current) => {
        const next = markPracticePrompt(current, {
          trainingDocId: card.trainingDocId,
          prompt: card.prompt
        });
        window.localStorage.setItem(
          getPracticeStorageKey(workspace.restaurant.id, workspace.userProfile.id),
          JSON.stringify(next)
        );
        return next;
      });
    }

    setDailyProgress((current) => {
      const next = recordDailyStudyResponse(current, card, response);
      window.localStorage.setItem(
        getDailyStudyStorageKey(workspace.restaurant.id, workspace.userProfile.id),
        JSON.stringify(next)
      );
      return next;
    });
  }

  function restartSession() {
    if (!studyData) return;
    setSessionCards(makeQueue(studyData));
    setSessionNumber((number) => number + 1);
  }

  const masteredToday = countDailyMastered(dailyProgress);
  const progressPercent = Math.min(100, Math.round((masteredToday / dailyStudyGoal) * 100));
  const firstName = workspace.userProfile?.name?.split(" ")?.[0] || "there";

  return (
    <section className="page-section study-home-page">
      <header className="study-home-header">
        <div>
          <p className="eyebrow">Today at {workspace.restaurant?.name || "your restaurant"}</p>
          <h1>Ready for service, {firstName}?</h1>
          <p>One card at a time. Start with assignments and recent menu updates.</p>
        </div>
        <div className="study-home-links">
          <Link className="secondary-button" to="/training-library">Search the library</Link>
          {isAdminOrManager(workspace.role) ? <Link to="/manager">Manager tools</Link> : null}
        </div>
      </header>

      <section className="daily-goal-banner" aria-label="Daily study goal">
        <div className="daily-goal-ring" style={{ "--daily-progress": `${progressPercent * 3.6}deg` }}>
          <span>{progressPercent}%</span>
        </div>
        <div>
          <p className="eyebrow">Daily goal</p>
          <h2>{masteredToday} / {dailyStudyGoal} facts mastered today</h2>
          <p>Your progress saves automatically on this device.</p>
        </div>
      </section>

      {message ? <div className="inline-alert">{message}</div> : null}
      {isLoading || workspace.isLoading ? <div className="daily-study-loading">Preparing today’s cards...</div> : null}

      {!isLoading && workspace.status === "ready" ? (
        <DailyStudyDeck
          key={sessionNumber}
          cards={sessionCards}
          onResponse={handleResponse}
          onRestart={restartSession}
        />
      ) : null}
    </section>
  );
}
