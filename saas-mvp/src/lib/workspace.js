import { getDataClient } from "./dataClient.js";

export async function listFirst(model, filter) {
  const result = await model.list({ filter });

  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  return result.data?.[0] || null;
}

export async function loadUserWorkspace(user) {
  const dataClient = getDataClient();

  const userProfile = await listFirst(dataClient.models.UserProfile, {
    cognitoUserId: {
      eq: user.userId
    }
  });

  if (!userProfile) {
    return {
      status: "empty",
      restaurant: null,
      userProfile: null,
      membership: null,
      message: "No restaurant workspace is connected to this user yet."
    };
  }

  const membership = await listFirst(dataClient.models.Membership, {
    userProfileId: {
      eq: userProfile.id
    }
  });

  const restaurantId = userProfile.activeRestaurantId || membership?.restaurantId;

  if (!restaurantId) {
    return {
      status: "empty",
      restaurant: null,
      userProfile,
      membership,
      message: "This user profile does not have an active restaurant yet."
    };
  }

  const restaurantResult = await dataClient.models.Restaurant.get({ id: restaurantId });

  if (restaurantResult.errors?.length) {
    throw new Error(restaurantResult.errors.map((error) => error.message).join(" "));
  }

  return {
    status: "ready",
    restaurant: restaurantResult.data,
    userProfile,
    membership,
    message: ""
  };
}
