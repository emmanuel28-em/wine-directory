import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  formatPlatformDate,
  formatPlatformDateTime,
  formatRelativeActivity,
  loadPlatformOperations,
  signalTone,
  subscriptionLabel
} from "../lib/platformOperations.js";

function money(cents, currency = "usd") {
  if (!cents) return "";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "usd" }).format(cents / 100);
}

function roleCount(account, role) {
  return account.roleCounts?.[role] || 0;
}

export default function PlatformRestaurantHealthPage() {
  const { restaurantId } = useParams();
  const [operations, setOperations] = useState({ workspaces: [] });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadAccountHealth() {
    setIsLoading(true);
    setMessage("");
    try {
      const result = await loadPlatformOperations();
      setOperations(result.operations);
    } catch (error) {
      setMessage(error.message || "Could not load account health.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAccountHealth();
  }, [restaurantId]);

  const account = useMemo(
    () => operations.workspaces.find((workspace) => workspace.id === restaurantId),
    [operations.workspaces, restaurantId]
  );

  if (isLoading) {
    return (
      <section className="page-section">
        <div className="empty-panel">Loading account health...</div>
      </section>
    );
  }

  if (message || !account) {
    return (
      <section className="page-section narrow-page">
        <div className="form-card">
          <h1>Account health unavailable</h1>
          <p>{message || "This restaurant account could not be found."}</p>
          <Link className="primary-button full-width" to="/platform">Back to Platform Control</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Account Health</p>
          <h1>{account.name}</h1>
          <p>{account.city || account.website || "Restaurant workspace"} · Last activity {formatRelativeActivity(account.lastActivityAt)}</p>
        </div>
        <div className="form-button-row">
          <Link className="secondary-button" to="/platform">Back to Platform Control</Link>
          <Link className="primary-button" to="/platform/support">Support Inbox</Link>
        </div>
      </div>

      {account.attention?.length ? (
        <section className="platform-account-alerts">
          {account.attention.map((signal) => (
            <article className={`platform-alert-card signal-${signalTone(signal.code)}`} key={signal.code}>
              <strong>{signal.label}</strong>
              <span>{signal.detail}</span>
            </article>
          ))}
        </section>
      ) : (
        <div className="empty-panel platform-healthy-panel">No current attention signals for this account.</div>
      )}

      <div className="dashboard-grid platform-health-stats">
        <article className="stat-card">
          <span>Status</span>
          <h2>{subscriptionLabel(account.subscriptionStatus)}</h2>
          <p>Plan: {account.plan || "No plan selected"}</p>
        </article>
        <article className="stat-card">
          <span>Active users</span>
          <h2>{account.activeMembers}</h2>
          <p>{roleCount(account, "owner")} owner · {roleCount(account, "admin")} admin · {roleCount(account, "manager")} manager · {roleCount(account, "staff")} staff</p>
        </article>
        <article className="stat-card">
          <span>Published pages</span>
          <h2>{account.publishedPages}</h2>
          <p>{account.draftPages} drafts · {account.totalPages} active pages total</p>
        </article>
        <article className="stat-card">
          <span>Staff completion</span>
          <h2>{account.staffCompletionRate}%</h2>
          <p>{account.quizAttempts} quiz attempts · {account.passedQuizAttempts} passed</p>
        </article>
      </div>

      <section className="platform-health-grid">
        <article className="form-card platform-health-card">
          <p className="eyebrow">Account Holder</p>
          <h2>{account.accountHolder?.name || "Not set"}</h2>
          <p>{account.accountHolder?.email || "No account holder email"}</p>
          <p>Billing email: {account.billingEmail || "Not set"}</p>
          <p>Website: {account.website || "Not set"}</p>
        </article>

        <article className="form-card platform-health-card">
          <p className="eyebrow">Trial And Billing</p>
          <h2>{subscriptionLabel(account.subscriptionStatus)}</h2>
          <p>Trial ends: {formatPlatformDate(account.trialEndsAt)}</p>
          <p>Current period ends: {formatPlatformDate(account.currentPeriodEnd)}</p>
          <p>Billing event history starts after this deployment receives Stripe webhooks.</p>
        </article>
      </section>

      <section className="platform-health-grid">
        <article className="form-card platform-health-card">
          <p className="eyebrow">Import History</p>
          <h2>Library Builder</h2>
          {account.importHistory?.length ? (
            <div className="platform-compact-list">
              {account.importHistory.map((item) => (
                <div key={item.id}>
                  <strong>{item.sourceName || "Training material import"}</strong>
                  <span>{item.status} · {item.createdCount} created · {item.skippedCount} skipped · {formatPlatformDateTime(item.startedAt)}</span>
                  {item.errorMessage ? <p>{item.errorMessage}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p>No imports recorded yet. Import history starts with new imports after this update.</p>
          )}
        </article>

        <article className="form-card platform-health-card">
          <p className="eyebrow">Support Cases</p>
          <h2>{account.openSupportCount} open</h2>
          {account.supportCases?.length ? (
            <div className="platform-compact-list">
              {account.supportCases.map((item) => (
                <div key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{item.severity || "normal"} · {item.status || "open"} · {formatPlatformDateTime(item.createdAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>No support cases for this restaurant.</p>
          )}
        </article>
      </section>

      <section className="platform-health-grid">
        <article className="form-card platform-health-card">
          <p className="eyebrow">Billing Events</p>
          <h2>Stripe Activity</h2>
          {account.billingEvents?.length ? (
            <div className="platform-compact-list">
              {account.billingEvents.map((item) => (
                <div key={item.id}>
                  <strong>{item.eventType}</strong>
                  <span>{item.status || "received"} {money(item.amount, item.currency)} · {formatPlatformDateTime(item.occurredAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>No billing events recorded yet.</p>
          )}
        </article>

        <article className="form-card platform-health-card">
          <p className="eyebrow">Team Shape</p>
          <h2>{account.activeMembers} active members</h2>
          <p>{account.disabledMembers} disabled users</p>
          <p>{account.pendingInvites} pending invites</p>
          <p>Onboarding stage: {account.onboardingStage}</p>
        </article>
      </section>

      <section className="setup-steps">
        <div className="section-heading compact-heading">
          <p className="eyebrow">Timeline</p>
          <h2>Account activity</h2>
          <p>A chronological view of imports, billing, support, publishing, and training activity.</p>
        </div>
        {account.timeline?.length ? (
          <div className="platform-timeline">
            {account.timeline.map((item, index) => (
              <article className={`platform-timeline-item timeline-${item.tone || "neutral"}`} key={`${item.type}-${item.occurredAt}-${index}`}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
                <span>{formatPlatformDateTime(item.occurredAt)}</span>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-panel">No account timeline activity recorded yet.</div>
        )}
      </section>
    </section>
  );
}
