import { getDataClient } from "./dataClient.js";
import { assertSameRestaurant, requireRestaurantId } from "./permissions.js";
import { getWorkspaceGroups } from "./workspaceGroups.js";

function assertNoErrors(result, fallbackMessage) {
  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  if (!result.data) throw new Error(fallbackMessage);
  return result.data;
}

export async function listTrainingAcknowledgementsForRestaurant(restaurantId) {
  requireRestaurantId(restaurantId);
  const result = await getDataClient().models.TrainingDocAcknowledgement.list({
    filter: { restaurantId: { eq: restaurantId } }
  });

  if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join(" "));
  return result.data || [];
}

export async function listMyTrainingAcknowledgements({ restaurantId, userProfileId }) {
  requireRestaurantId(restaurantId);
  const result = await getDataClient().models.TrainingDocAcknowledgement.list({
    filter: {
      restaurantId: { eq: restaurantId },
      userProfileId: { eq: userProfileId }
    }
  });

  if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join(" "));
  return result.data || [];
}

export async function markTrainingDocReviewed({ restaurantId, trainingDoc, userProfileId, cognitoUserId, existingId }) {
  requireRestaurantId(restaurantId);
  assertSameRestaurant(trainingDoc, restaurantId, "Training Page");
  const reviewedAt = new Date().toISOString();
  const client = getDataClient();

  if (existingId) {
    return assertNoErrors(
      await client.models.TrainingDocAcknowledgement.update({ id: existingId, reviewedAt }),
      "Training page review was not updated."
    );
  }

  return assertNoErrors(
    await client.models.TrainingDocAcknowledgement.create({
      restaurantId,
      trainingDocId: trainingDoc.id,
      userProfileId,
      cognitoUserId,
      reviewedAt,
      ...getWorkspaceGroups(restaurantId)
    }),
    "Training page was not marked as reviewed."
  );
}
