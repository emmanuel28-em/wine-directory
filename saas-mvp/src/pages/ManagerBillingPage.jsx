import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import {
  createBillingPortalSessionForRestaurant,
  createCheckoutSessionForRestaurant,
  checkoutPreservesTrial,
  formatBillingStatus,
  getBillingMessage,
  getTrialDaysRemaining,
  hasActiveSubscription,
  isTrialExpired,
  updateBillingEmail
} from "../lib/billing.js";

function formatDate(value) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function getInitialBillingEmail(restaurant) {
  return restaurant?.billingEmail || restaurant?.primaryContactEmail || "";
}

export default function ManagerBillingPage() {
  const workspace = useCurrentWorkspace();
  const [searchParams] = useSearchParams();
  const [billingEmail, setBillingEmail] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (workspace.restaurant) {
      setBillingEmail(getInitialBillingEmail(workspace.restaurant));
    }
  }, [workspace.restaurant?.id, workspace.restaurant?.billingEmail, workspace.restaurant?.primaryContactEmail]);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      setMessage("Payment setup was completed. Line Up is confirming the subscription with Stripe.");

      let isCancelled = false;
      let attemptCount = 0;
      let refreshTimer;

      async function refreshSubscription() {
        attemptCount += 1;
        const nextWorkspace = await workspace.reloadWorkspace();

        if (isCancelled) {
          return;
        }

        if (nextWorkspace?.restaurant?.stripeSubscriptionId) {
          setMessage("Billing is connected. Your Line Up subscription is ready.");
          return;
        }

        if (attemptCount < 8) {
          refreshTimer = window.setTimeout(refreshSubscription, 2500);
        } else {
          setMessage("Stripe received the payment setup. Use Refresh Billing Status in a moment if the status has not changed yet.");
        }
      }

      refreshTimer = window.setTimeout(refreshSubscription, 1500);

      return () => {
        isCancelled = true;
        window.clearTimeout(refreshTimer);
      };
    }

    if (searchParams.get("checkout") === "cancelled") {
      setMessage("Stripe Checkout was cancelled. You can set up billing whenever you are ready.");
    }
  }, [searchParams.get("checkout")]);

  async function saveBillingEmail(event) {
    event.preventDefault();
    setIsWorking(true);
    setMessage("");

    try {
      await updateBillingEmail({
        restaurantId: workspace.restaurant.id,
        billingEmail
      });
      await workspace.reloadWorkspace();
      setMessage("Billing email updated.");
    } catch (error) {
      setMessage(error.message || "Could not update billing email.");
    } finally {
      setIsWorking(false);
    }
  }

  async function startCheckout() {
    setIsWorking(true);
    setMessage("");

    try {
      if (billingEmail && billingEmail !== getInitialBillingEmail(workspace.restaurant)) {
        await updateBillingEmail({
          restaurantId: workspace.restaurant.id,
          billingEmail
        });
        await workspace.reloadWorkspace();
      }

      const checkoutUrl = await createCheckoutSessionForRestaurant({
        restaurant: {
          ...workspace.restaurant,
          billingEmail: billingEmail || getInitialBillingEmail(workspace.restaurant),
          currentUserRole: workspace.role
        }
      });

      window.location.assign(checkoutUrl);
    } catch (error) {
      setMessage(error.message || "Could not start Stripe Checkout.");
      setIsWorking(false);
    }
  }

  async function openBillingPortal() {
    setIsWorking(true);
    setMessage("");

    try {
      const portalUrl = await createBillingPortalSessionForRestaurant({
        restaurantId: workspace.restaurant.id,
        currentRole: workspace.role
      });
      window.location.assign(portalUrl);
    } catch (error) {
      setMessage(error.message || "Could not open Stripe Billing Portal.");
      setIsWorking(false);
    }
  }

  async function refreshBillingStatus() {
    setIsWorking(true);
    setMessage("");

    try {
      await workspace.reloadWorkspace();
      setMessage("Billing status refreshed.");
    } finally {
      setIsWorking(false);
    }
  }

  if (workspace.status !== "ready") {
    return (
      <section className="page-section narrow-page">
        <div className="empty-panel">Loading billing...</div>
      </section>
    );
  }

  const restaurant = workspace.restaurant;
  const subscriptionStatus = restaurant.subscriptionStatus || "trialing";
  const trialExpired = isTrialExpired(restaurant);
  const shouldShowCheckout = !restaurant.stripeCustomerId || !hasActiveSubscription(restaurant);
  const shouldShowPortal = Boolean(restaurant.stripeCustomerId);
  const trialDaysRemaining = getTrialDaysRemaining(restaurant);
  const preservesTrial = checkoutPreservesTrial(restaurant);

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Billing</p>
          <h1>Billing</h1>
          <p>Review the Line Up trial, plan, and payment details for {restaurant.name}.</p>
        </div>
        <Link className="secondary-button" to="/manager">
          Dashboard
        </Link>
      </div>

      {trialExpired ? (
        <div className="warning-banner">
          The 30-day trial has ended. Set up billing to restore content, quiz, invite, and staff access.
        </div>
      ) : subscriptionStatus === "trialing" ? (
        <div className="info-banner">
          {trialDaysRemaining} day{trialDaysRemaining === 1 ? "" : "s"} remain in the free trial. Add a payment method now to avoid an interruption.
        </div>
      ) : null}

      {message ? <p className="form-message page-message">{message}</p> : null}

      <div className="dashboard-grid">
        <article className="stat-card">
          <span>Restaurant</span>
          <h2>{restaurant.name}</h2>
          <p>{restaurant.city || restaurant.address || "Restaurant account"}</p>
        </article>

        <article className="stat-card">
          <span>Plan</span>
          <h2>{restaurant.plan === "trial" ? "Monthly" : restaurant.plan || "Monthly"}</h2>
          <p>Monthly platform fee after trial.</p>
        </article>

        <article className="stat-card">
          <span>Status</span>
          <h2>{formatBillingStatus(restaurant)}</h2>
          <p>{getBillingMessage(restaurant)}</p>
        </article>
      </div>

      <div className="content-manager-grid">
        <form className="form-card" onSubmit={saveBillingEmail}>
          <h2>Billing Details</h2>

          <dl className="record-list">
            <div>
              <dt>Subscription status</dt>
              <dd>{subscriptionStatus}</dd>
            </div>
            <div>
              <dt>Trial end date</dt>
              <dd>{formatDate(restaurant.trialEndsAt)}</dd>
            </div>
            <div>
              <dt>Current period end</dt>
              <dd>{formatDate(restaurant.currentPeriodEnd)}</dd>
            </div>
          </dl>

          <label>
            Billing email
            <input type="email" value={billingEmail} onChange={(event) => setBillingEmail(event.target.value)} required />
          </label>

          <button className="secondary-button full-width" type="submit" disabled={isWorking}>
            Save Billing Email
          </button>
        </form>

        <section className="form-card">
          <h2>Secure Payment Setup</h2>
          <p>
            Line Up does not collect or store card details. Stripe Checkout handles payment information securely.
          </p>

          {shouldShowCheckout ? (
            <div className="billing-timing-note">
              <strong>{preservesTrial ? "No charge today" : "Billing starts when checkout completes"}</strong>
              <p>
                {preservesTrial
                  ? `Your free trial remains active through ${formatDate(restaurant.trialEndsAt)}.`
                  : "Stripe requires at least 48 hours to preserve a trial end date, so payment begins immediately this close to or after expiration."}
              </p>
            </div>
          ) : null}

          <div className="billing-action-stack">
            {shouldShowCheckout ? (
              <button className="primary-button full-width" type="button" onClick={startCheckout} disabled={isWorking}>
                {isWorking ? "Opening Stripe..." : preservesTrial ? "Add Payment Method" : "Start Subscription"}
              </button>
            ) : null}
            {shouldShowPortal ? (
              <button className="secondary-button full-width" type="button" onClick={openBillingPortal} disabled={isWorking}>
                {isWorking ? "Opening Stripe..." : "Manage Billing"}
              </button>
            ) : null}
            <button className="secondary-button full-width" type="button" onClick={refreshBillingStatus} disabled={isWorking}>
              Refresh Billing Status
            </button>
          </div>

          <p className="helper-text">
            Card details are entered only on Stripe's secure checkout or customer portal.
          </p>
        </section>
      </div>
    </section>
  );
}
