import { getDataClient } from "./dataClient.js";

export async function listFirst(model, filter) {
  const result = await model.list({ filter });

  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  return result.data?.[0] || null;
}

export async function loadUserWorkspace(user) {
  if (!user?.userId) {
    throw new Error("A signed-in user is required.");
  }

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

  const membershipResult = await dataClient.models.Membership.list({
    filter: {
      userProfileId: {
        eq: userProfile.id
      }
    }
  });

  if (membershipResult.errors?.length) {
    throw new Error(membershipResult.errors.map((error) => error.message).join(" "));
  }

  const activeMemberships = (membershipResult.data || []).filter((membership) => membership.status === "active");
  const membership =
    activeMemberships.find((item) => item.restaurantId === userProfile.activeRestaurantId) || activeMemberships[0];
  const restaurantId = membership?.restaurantId;

  if (!membership || !restaurantId) {
    return {
      status: "empty",
      restaurant: null,
      userProfile,
      membership,
      message: "No restaurant workspace found for this account."
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
