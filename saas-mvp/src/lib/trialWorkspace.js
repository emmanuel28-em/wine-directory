import { getDataClient } from "./dataClient.js";

export function createSlug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getTrialEndDate() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString();
}

function getUserEmail(user, fallbackEmail = "") {
  return user?.signInDetails?.loginId || fallbackEmail;
}

function assertNoErrors(result, fallbackMessage) {
  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  if (!result.data) {
    throw new Error(fallbackMessage);
  }

  return result.data;
}

async function findExistingUserProfile(dataClient, cognitoUserId) {
  const result = await dataClient.models.UserProfile.list({
    filter: {
      cognitoUserId: {
        eq: cognitoUserId
      }
    }
  });

  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  return result.data?.[0] || null;
}

export async function createTrialWorkspace({ user, restaurantName, managerName, email, restaurantAddress = "", restaurantWebsite = "" }) {
  const dataClient = getDataClient();
  const slug = `${createSlug(restaurantName)}-${Date.now().toString().slice(-5)}`;
  const userEmail = getUserEmail(user, email);

  // 1. Restaurant is the customer account / tenant.
  const restaurant = assertNoErrors(
    await dataClient.models.Restaurant.create({
      name: restaurantName,
      slug,
      plan: "trial",
      status: "trial",
      trialEndsAt: getTrialEndDate(),
      stripePaymentLink: "",
      address: restaurantAddress,
      city: restaurantAddress,
      website: restaurantWebsite,
      primaryContactName: managerName,
      primaryContactEmail: userEmail
    }),
    "Restaurant was not created."
  );

  const existingProfile = await findExistingUserProfile(dataClient, user.userId);

  // 2. UserProfile stores app-specific details for the Cognito user.
  const userProfile = existingProfile
    ? assertNoErrors(
        await dataClient.models.UserProfile.update({
          id: existingProfile.id,
          name: managerName,
          email: userEmail,
          activeRestaurantId: restaurant.id
        }),
        "User profile was not updated."
      )
    : assertNoErrors(
        await dataClient.models.UserProfile.create({
          cognitoUserId: user.userId,
          name: managerName,
          email: userEmail,
          activeRestaurantId: restaurant.id
        }),
        "User profile was not created."
      );

  // 3. Membership connects this user to this restaurant as the owner.
  const membership = assertNoErrors(
    await dataClient.models.Membership.create({
      restaurantId: restaurant.id,
      userProfileId: userProfile.id,
      role: "owner",
      status: "active"
    }),
    "Membership was not created."
  );

  return {
    restaurant,
    userProfile,
    membership
  };
}
