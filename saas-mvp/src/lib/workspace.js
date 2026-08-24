import { getDataClient } from "./dataClient.js";
import { getWorkspaceGroups } from "./workspaceGroups.js";

const publicUserProfile = {
  id: "public-user",
  cognitoUserId: "public-visitor",
  name: "Public Visitor",
  email: "public@lineup.local"
};

function buildPublicMembership(restaurantId) {
  return {
    id: "public-membership",
    restaurantId,
    userProfileId: publicUserProfile.id,
    cognitoUserId: publicUserProfile.cognitoUserId,
    role: "staff",
    status: "active",
    ...getWorkspaceGroups(restaurantId)
  };
}

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
  const disabledMembership = (membershipResult.data || []).find((membershipItem) => membershipItem.status === "disabled");
  const restaurantId = membership?.restaurantId;

  if (!membership || !restaurantId) {
    return {
      status: disabledMembership ? "disabled" : "empty",
      restaurant: null,
      userProfile,
      membership: disabledMembership || membership,
      message: disabledMembership
        ? "Your access to this workspace has been disabled."
        : "No restaurant workspace found for this account."
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

export async function loadPublicWorkspace() {
  const dataClient = getDataClient();
  const restaurantResult = await dataClient.models.Restaurant.list({ limit: 100 });

  if (restaurantResult.errors?.length) {
    throw new Error(restaurantResult.errors.map((error) => error.message).join(" "));
  }

  const restaurants = restaurantResult.data || [];
  const restaurant =
    restaurants.find((item) => ["active", "trialing"].includes(item.status || item.subscriptionStatus)) ||
    restaurants.find((item) => item.status !== "archived") ||
    restaurants[0] ||
    null;

  if (!restaurant?.id) {
    return {
      status: "empty",
      restaurant: null,
      userProfile: publicUserProfile,
      membership: null,
      message: "No public restaurant workspace is available yet."
    };
  }

  return {
    status: "ready",
    restaurant,
    userProfile: publicUserProfile,
    membership: buildPublicMembership(restaurant.id),
    message: ""
  };
}
