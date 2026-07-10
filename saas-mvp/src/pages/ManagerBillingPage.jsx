import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import {
  createBillingPortalSessionForRestaurant,
  createCheckoutSessionForRestaurant,
  formatBillingStatus,
  getBillingMessage,
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
      setMessage("Checkout completed. Your subscription status will update shortly.");
    }

    if (searchParams.get("checkout") === "cancelled") {
      setMessage("Stripe Checkout was cancelled. You can set up billing whenever you are ready.");
    }
  }, [searchParams]);

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

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Billing</p>
          <h1>Billing</h1>
          <p>Manage the Line Up trial and Stripe billing setup for {restaurant.name}.</p>
        </div>
        <Link className="secondary-button" to="/manager">
          Dashboard
        </Link>
      </div>

      {trialExpired ? (
        <div className="warning-banner">
          Your 30-day trial has ended. The workspace remains available for now, but billing should be set up soon.
        </div>
      ) : null}

      {message ? <p className="form-message page-message">{message}</p> : null}

      <div className="dashboard-grid">
        <article className="stat-card">
          <span>Restaurant</span>
          <h2>{restaurant.name}</h2>
          <p>{restaurant.city || restaurant.address || "Restaurant workspace"}</p>
        </article>

        <article className="stat-card">
          <span>Plan</span>
          <h2>{restaurant.plan || "trial"}</h2>
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
          <h2>Stripe Checkout</h2>
          <p>
            Line Up does not collect or store card details. Stripe Checkout handles payment information securely.
          </p>

          <div className="billing-action-stack">
            {shouldShowCheckout ? (
              <button className="primary-button full-width" type="button" onClick={startCheckout} disabled={isWorking}>
                {isWorking ? "Opening Stripe..." : "Set Up Billing"}
              </button>
            ) : null}
            {shouldShowPortal ? (
              <button className="secondary-button full-width" type="button" onClick={openBillingPortal} disabled={isWorking}>
                {isWorking ? "Opening Stripe..." : "Manage Billing"}
              </button>
            ) : null}
          </div>

          <p className="helper-text">
            If Stripe is not configured yet, these buttons will show a setup message instead of opening Stripe.
          </p>
        </section>
      </div>
    </section>
  );
}
