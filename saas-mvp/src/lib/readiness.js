const fallbackSectionName = "Training Library";

export function getTrainingDocSectionName({ doc, collection }) {
  if (collection?.name) return collection.name;
  if (doc?.category) return doc.category;
  if (doc?.type) return doc.type;
  return fallbackSectionName;
}

export function buildSectionReadiness({ docs, collections = [], acknowledgements = [] }) {
  const collectionById = new Map(collections.map((collection) => [collection.id, collection]));
  const reviewedDocIds = new Set(acknowledgements.map((acknowledgement) => acknowledgement.trainingDocId));
  const sections = new Map();

  docs
    .filter((doc) => doc.status === "published")
    .forEach((doc) => {
      const sectionName = getTrainingDocSectionName({
        doc,
        collection: collectionById.get(doc.collectionId)
      });

      if (!sections.has(sectionName)) {
        sections.set(sectionName, {
          sectionName,
          totalCards: 0,
          reviewedCards: 0,
          missingCards: [],
          latestReviewedAt: ""
        });
      }

      const section = sections.get(sectionName);
      const isReviewed = reviewedDocIds.has(doc.id);
      const acknowledgement = acknowledgements.find((item) => item.trainingDocId === doc.id);

      section.totalCards += 1;
      if (isReviewed) {
        section.reviewedCards += 1;
        if (acknowledgement?.reviewedAt && (!section.latestReviewedAt || acknowledgement.reviewedAt > section.latestReviewedAt)) {
          section.latestReviewedAt = acknowledgement.reviewedAt;
        }
      } else {
        section.missingCards.push(doc);
      }
    });

  return [...sections.values()]
    .map((section) => ({
      ...section,
      earned: section.totalCards > 0 && section.reviewedCards === section.totalCards,
      percent: section.totalCards > 0 ? Math.round((section.reviewedCards / section.totalCards) * 100) : 0
    }))
    .sort((left, right) => left.sectionName.localeCompare(right.sectionName));
}
