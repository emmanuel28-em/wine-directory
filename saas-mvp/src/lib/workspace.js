import { getDataClient } from "./dataClient.js";

// Temporary public workspace: this exposes only Rezdora's published library.
// Replace this with a per-restaurant public slug before publishing other tenants.
export const PUBLIC_RESTAURANT_ID = "46ecf15d-aa17-487f-93e4-510385cd4b36";

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
  const dataClient = getDataClient({ authMode: "identityPool" });
  const restaurantResult = await dataClient.models.Restaurant.get({ id: PUBLIC_RESTAURANT_ID });

  if (restaurantResult.errors?.length) {
    throw new Error(restaurantResult.errors.map((error) => error.message).join(" "));
  }

  if (!restaurantResult.data) {
    throw new Error("The public Rezdora library could not be found.");
  }

  return {
    status: "ready",
    restaurant: restaurantResult.data,
    userProfile: {
      id: "public-visitor",
      name: "Public visitor",
      email: "",
      cognitoUserId: ""
    },
    membership: {
      id: "public-read-only",
      restaurantId: PUBLIC_RESTAURANT_ID,
      role: "staff",
      status: "active"
    },
    message: ""
  };
}
