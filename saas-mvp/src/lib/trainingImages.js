function normalizeTrainingTitle(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isPreviewableImage(fileAsset) {
  const fileType = String(fileAsset?.fileType || "").toLowerCase();
  const fileName = String(fileAsset?.fileName || fileAsset?.name || fileAsset?.storageKey || "").toLowerCase();
  return fileType.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/.test(fileName);
}

// Menu imports can create separate TrainingDoc records for the same dish in
// Lunch, Dinner, and Brunch. This map lets those copies share one existing
// photo while still preferring a photo uploaded directly to the current card.
export function buildTrainingDocImageAssetMap({ trainingDocs = [], fileAssets = [] }) {
  const docsById = new Map(trainingDocs.map((doc) => [doc.id, doc]));
  const directImageByDocId = new Map();

  fileAssets
    .filter((fileAsset) => fileAsset.trainingDocId && isPreviewableImage(fileAsset))
    .forEach((fileAsset) => {
      if (docsById.has(fileAsset.trainingDocId) && !directImageByDocId.has(fileAsset.trainingDocId)) {
        directImageByDocId.set(fileAsset.trainingDocId, fileAsset);
      }
    });

  const sharedImageByTitle = new Map();
  trainingDocs.forEach((doc) => {
    const normalizedTitle = normalizeTrainingTitle(doc.title);
    const directImage = directImageByDocId.get(doc.id);
    const titleKey = `${doc.type || "training"}:${normalizedTitle}`;
    if (directImage && normalizedTitle && !sharedImageByTitle.has(titleKey)) {
      sharedImageByTitle.set(titleKey, directImage);
    }
  });

  const imageByDocId = new Map(directImageByDocId);
  trainingDocs.forEach((doc) => {
    if (imageByDocId.has(doc.id)) return;
    const titleKey = `${doc.type || "training"}:${normalizeTrainingTitle(doc.title)}`;
    const sharedImage = sharedImageByTitle.get(titleKey);
    if (sharedImage) imageByDocId.set(doc.id, sharedImage);
  });

  return imageByDocId;
}
