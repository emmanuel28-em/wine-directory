import { getDataClient } from "./dataClient.js";
import { assertSameRestaurant, requireRestaurantId } from "./permissions.js";

function assertNoErrors(result, fallbackMessage) {
  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  if (!result.data) {
    throw new Error(fallbackMessage);
  }

  return result.data;
}

export async function listCollectionsForRestaurant(restaurantId, options = {}) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();
  const result = await dataClient.models.ContentCollection.list({
    filter: {
      restaurantId: {
        eq: restaurantId
      }
    }
  });

  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  const collections = result.data || [];
  const visibleCollections = options.includeArchived
    ? collections
    : collections.filter((collection) => collection.status !== "archived");

  return [...visibleCollections].sort((a, b) => {
    const sortCompare = (a.sortOrder || 0) - (b.sortOrder || 0);
    return sortCompare || (a.name || "").localeCompare(b.name || "");
  });
}

export async function saveCollection({ collection, restaurantId, userProfileId, editingCollectionId }) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();
  const payload = {
    restaurantId,
    name: collection.name.trim(),
    description: collection.description.trim(),
    categoryType: collection.categoryType,
    status: collection.status,
    sortOrder: Number(collection.sortOrder) || 0,
    updatedBy: userProfileId
  };

  if (editingCollectionId) {
    const existing = await dataClient.models.ContentCollection.get({ id: editingCollectionId });

    if (existing.errors?.length) {
      throw new Error(existing.errors.map((error) => error.message).join(" "));
    }

    assertSameRestaurant(existing.data, restaurantId, "Training Category");

    return assertNoErrors(
      await dataClient.models.ContentCollection.update({
        id: editingCollectionId,
        ...payload
      }),
      "Collection was not updated."
    );
  }

  return assertNoErrors(
    await dataClient.models.ContentCollection.create({
      ...payload,
      createdBy: userProfileId
    }),
    "Collection was not created."
  );
}

export async function archiveCollection({ collectionId, restaurantId, userProfileId }) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();
  const existing = await dataClient.models.ContentCollection.get({ id: collectionId });

  if (existing.errors?.length) {
    throw new Error(existing.errors.map((error) => error.message).join(" "));
  }

  assertSameRestaurant(existing.data, restaurantId, "Training Category");

  return assertNoErrors(
    await dataClient.models.ContentCollection.update({
      id: collectionId,
      status: "archived",
      updatedBy: userProfileId
    }),
    "Collection was not archived."
  );
}
