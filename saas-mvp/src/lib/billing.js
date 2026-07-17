import { getDataClient } from "./dataClient.js";
import { requireRestaurantId } from "./permissions.js";

function assertNoErrors(result, fallbackMessage) {
  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  if (!result.data) {
    throw new Error(fallbackMessage);
  }

  return result.data;
}

export function isTrialExpired(restaurant) {
  if (!restaurant?.trialEndsAt) {
    return false;
  }

  return new Date(restaurant.trialEndsAt) < new Date();
}

export function hasActiveTrial(restaurant) {
  return (restaurant?.subscriptionStatus || restaurant?.status || "trialing") === "trialing" && !isTrialExpired(restaurant);
}

export function hasActiveSubscription(restaurant) {
  return restaurant?.subscriptionStatus === "active";
}

export function getTrialDaysRemaining(restaurant) {
  if (!restaurant?.trialEndsAt) {
    return 0;
  }

  const millisecondsRemaining = new Date(restaurant.trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(millisecondsRemaining / (24 * 60 * 60 * 1000)));
}

export function checkoutPreservesTrial(restaurant) {
  if (!hasActiveTrial(restaurant)) {
    return false;
  }

  return new Date(restaurant.trialEndsAt).getTime() - Date.now() >= 48 * 60 * 60 * 1000;
}

export function isWorkspaceBillingPaused(restaurant) {
  if (!restaurant) {
    return false;
  }

  return !hasActiveTrial(restaurant) && !hasActiveSubscription(restaurant);
}

export function formatBillingStatus(restaurant) {
  const status = restaurant?.subscriptionStatus || restaurant?.status || "trialing";

  if (status === "trialing") return isTrialExpired(restaurant) ? "Trial expired" : "Trial active";
  if (status === "active") return "Subscription active";
  if (status === "past_due") return "Payment past due";
  if (status === "canceled") return "Subscription canceled";
  if (status === "paused") return "Subscription paused";
  if (status === "unpaid") return "Payment unpaid";
  if (status === "incomplete") return "Billing setup incomplete";

  return "Billing not set up";
}

export function getBillingMessage(restaurant) {
  const status = restaurant?.subscriptionStatus || restaurant?.status || "trialing";

  if (status === "active") {
    return "Your subscription is active.";
  }

  if (status === "trialing" && !isTrialExpired(restaurant)) {
    const daysRemaining = getTrialDaysRemaining(restaurant);
    return `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining in the free trial.`;
  }

  if (status === "past_due") {
    return "Payment is past due. Update billing to keep service running smoothly.";
  }

  if (status === "canceled") {
    return "This subscription is canceled. Set up billing again when you are ready.";
  }

  if (isTrialExpired(restaurant)) {
    return "The free trial has ended. Set up billing to restore full workspace access.";
  }

  return "Billing is not set up yet.";
}

export async function updateBillingEmail({ restaurantId, billingEmail }) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();
  const existing = await dataClient.models.Restaurant.get({ id: restaurantId });

  if (existing.errors?.length) {
    throw new Error(existing.errors.map((error) => error.message).join(" "));
  }

  if (!existing.data) {
    throw new Error("Restaurant workspace was not found.");
  }

  return assertNoErrors(
    await dataClient.models.Restaurant.update({
      id: restaurantId,
      billingEmail: billingEmail.trim().toLowerCase()
    }),
    "Billing email was not updated."
  );
}

export async function createCheckoutSessionForRestaurant({ restaurant }) {
  requireRestaurantId(restaurant?.id);
  const dataClient = getDataClient();
  const billingEmail = restaurant.billingEmail || restaurant.primaryContactEmail;

  if (!billingEmail) {
    throw new Error("Add a billing email before setting up billing.");
  }

  const result = await dataClient.mutations.createCheckoutSession({
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    billingEmail,
    stripeCustomerId: restaurant.stripeCustomerId || "",
    trialEndsAt: restaurant.trialEndsAt || null,
    requestedByRole: restaurant.currentUserRole || ""
  });

  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  if (!result.data?.success) {
    throw new Error(result.data?.error || "Stripe Checkout could not be created.");
  }

  if (result.data.stripeCustomerId && result.data.stripeCustomerId !== restaurant.stripeCustomerId) {
    await dataClient.models.Restaurant.update({
      id: restaurant.id,
      stripeCustomerId: result.data.stripeCustomerId,
      billingEmail,
      subscriptionStatus: restaurant.subscriptionStatus || "trialing"
    });
  }

  return result.data.checkoutUrl;
}

export async function createBillingPortalSessionForRestaurant({ restaurantId, currentRole }) {
  requireRestaurantId(restaurantId);
  const dataClient = getDataClient();
  const result = await dataClient.mutations.createBillingPortalSession({
    restaurantId,
    requestedByRole: currentRole || ""
  });

  if (result.errors?.length) {
    throw new Error(result.errors.map((error) => error.message).join(" "));
  }

  if (!result.data?.success) {
    throw new Error(result.data?.error || "Stripe Billing Portal could not be opened.");
  }

  return result.data.portalUrl;
}
