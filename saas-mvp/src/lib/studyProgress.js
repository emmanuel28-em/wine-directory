const recentUpdateWindowDays = 14;

function toTime(value) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

// A review is current only when it happened after the latest page update.
// Editing a published page therefore returns it to "Needs Review" automatically.
export function isTrainingReviewCurrent(trainingDoc, acknowledgement) {
  if (!trainingDoc || !acknowledgement) return false;
  return toTime(acknowledgement.reviewedAt) >= toTime(trainingDoc.updatedAt || trainingDoc.createdAt);
}

export function isRecentlyUpdated(trainingDoc, now = new Date(), windowDays = recentUpdateWindowDays) {
  const updatedAt = toTime(trainingDoc?.updatedAt || trainingDoc?.createdAt);
  if (!updatedAt) return false;
  return now.getTime() - updatedAt <= windowDays * 24 * 60 * 60 * 1000;
}

export function getLatestStudyDate(acknowledgements = [], attempts = []) {
  const values = [
    ...acknowledgements.map((item) => item.reviewedAt),
    ...attempts.map((item) => item.completedAt)
  ].filter(Boolean);

  if (!values.length) return "";
  return values.sort((left, right) => toTime(right) - toTime(left))[0];
}
