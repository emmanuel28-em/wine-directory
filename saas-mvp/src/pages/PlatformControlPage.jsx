import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthSession } from "../auth/AuthSessionProvider.jsx";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { getDataClient } from "../lib/dataClient.js";
import {
  formatPlatformDate,
  formatRelativeActivity,
  loadPlatformOperations,
  parsePlatformUsers,
  signalTone,
  subscriptionLabel
} from "../lib/platformOperations.js";

function roleLabel(role) {
  return role === "platform_owner" ? "Platform Owner" : "Platform Developer";
}

function summaryNumber(value) {
  return Number(value || 0).toLocaleString();
}

function attentionCopy(workspace) {
  if (!workspace.attention?.length) return "No open signals";
  return workspace.attention.map((signal) => signal.label).join(" · ");
}

export default function PlatformControlPage() {
  const authSession = useAuthSession();
  const workspace = useCurrentWorkspace();
  const [platformUsers, setPlatformUsers] = useState([]);
  const [operations, setOperations] = useState({ totals: {}, workspaces: [] });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("platform_developer");
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const isPlatformOwner = authSession.platformRole === "platform_owner";

  async function loadPlatformData() {
    setIsLoading(true);
    setMessage("");
    try {
      const result = await loadPlatformOperations();
      setPlatformUsers(result.users);
      setOperations(result.operations);
    } catch (error) {
      setMessage(error.message || "Platform Control could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadPlatformData();
  }, [authSession.platformRole]);

  async function updateAccess(action, selectedEmail = email, selectedRole = role) {
    setIsSaving(true);
    setMessage("");
    try {
      const result = await getDataClient().mutations.managePlatformAccess({
        email: selectedEmail.trim().toLowerCase(),
        role: selectedRole,
        action
      });
      if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join(" "));
      if (!result.data?.success) throw new Error(result.data?.error || "Platform access could not be updated.");
      setPlatformUsers(parsePlatformUsers(result.data.usersJson));
      setEmail("");
      setMessage(action === "grant" ? "Platform access updated. The person should sign out and back in." : "Platform access removed.");
    } catch (error) {
      setMessage(error.message || "Platform access could not be updated.");
    } finally {
      setIsSaving(false);
    }
  }

  const filteredWorkspaces = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return operations.workspaces;
    return operations.workspaces.filter((item) =>
      [item.name, item.city, item.website, item.accountHolder?.name, item.accountHolder?.email, item.billingEmail]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [operations.workspaces, searchTerm]);

  const needsAttention = filteredWorkspaces.filter((item) => item.attention?.length);
  const activeCustomers = filteredWorkspaces.filter((item) => item.activeRecently);
  const totals = operations.totals || {};

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Line Up Operations</p>
          <h1>Platform Control</h1>
          <p>See which restaurant accounts need attention, then open each account health page for the full timeline.</p>
        </div>
        <div className="form-button-row">
          {workspace.isActiveMember ? <Link className="secondary-button" to="/manager">Restaurant Dashboard</Link> : null}
          {isPlatformOwner ? <Link className="primary-button" to="/platform/support">Support Inbox</Link> : null}
        </div>
      </div>

      {message ? <p className="form-message page-message">{message}</p> : null}
      {isLoading ? <div className="empty-panel">Loading Platform Control...</div> : null}

      {!isLoading ? (
        <div className="dashboard-grid platform-overview-grid">
          <article className="stat-card">
            <span>Your company role</span>
            <h2>{roleLabel(authSession.platformRole)}</h2>
            <p>This role is separate from restaurant owner, admin, manager, or staff access.</p>
          </article>
          <article className="stat-card platform-attention-stat">
            <span>Need attention</span>
            <h2>{isPlatformOwner ? summaryNumber(totals.needsAttention) : "Private"}</h2>
            <p>Accounts with support, billing, import, trial, onboarding, or publishing signals.</p>
          </article>
          <article className="stat-card">
            <span>Active customers</span>
            <h2>{isPlatformOwner ? summaryNumber(totals.activeCustomers) : "Private"}</h2>
            <p>Restaurants with recorded product activity in the last 14 days.</p>
          </article>
          <article className="stat-card">
            <span>Total workspaces</span>
            <h2>{isPlatformOwner ? summaryNumber(totals.restaurants) : "Private"}</h2>
            <p>Customer accounts visible only to Platform Owners.</p>
          </article>
        </div>
      ) : null}

      {isPlatformOwner && !isLoading ? (
        <>
          <section className="platform-signal-strip" aria-label="Operational signals">
            <article>
              <span>Stuck onboarding</span>
              <strong>{summaryNumber(totals.stuckOnboarding)}</strong>
            </article>
            <article>
              <span>Failed imports</span>
              <strong>{summaryNumber(totals.failedImports)}</strong>
            </article>
            <article>
              <span>Trials ending</span>
              <strong>{summaryNumber(totals.trialsEnding)}</strong>
            </article>
            <article>
              <span>Payment problems</span>
              <strong>{summaryNumber(totals.paymentProblems)}</strong>
            </article>
            <article>
              <span>Stale publishing</span>
              <strong>{summaryNumber(totals.stalePublishing)}</strong>
            </article>
            <article>
              <span>Urgent support</span>
              <strong>{summaryNumber(totals.urgentSupport)}</strong>
            </article>
          </section>

          <section className="platform-ops-layout">
            <div className="platform-ops-main">
              <div className="section-heading compact-heading">
                <p className="eyebrow">Exception Queue</p>
                <h2>Restaurants needing your attention</h2>
                <p>Start here when you only have a few minutes to manage Line Up.</p>
              </div>

              {needsAttention.length === 0 ? (
                <div className="empty-panel">No restaurant accounts need attention right now.</div>
              ) : (
                <div className="platform-attention-list">
                  {needsAttention.map((account) => (
                    <Link className="platform-attention-card" to={`/platform/restaurants/${account.id}`} key={account.id}>
                      <div>
                        <h3>{account.name}</h3>
                        <p>{attentionCopy(account)}</p>
                      </div>
                      <div className="platform-attention-pills">
                        {account.attention.slice(0, 3).map((signal) => (
                          <span className={`platform-signal-pill signal-${signalTone(signal.code)}`} key={`${account.id}-${signal.code}`}>
                            {signal.label}
                          </span>
                        ))}
                      </div>
                      <span className="platform-row-arrow">Open account</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <aside className="platform-ops-side">
              <div className="section-heading compact-heading">
                <p className="eyebrow">Active This Month</p>
                <h2>Customer pulse</h2>
              </div>
              <div className="platform-pulse-list">
                {activeCustomers.slice(0, 6).map((account) => (
                  <Link to={`/platform/restaurants/${account.id}`} key={account.id}>
                    <strong>{account.name}</strong>
                    <span>{formatRelativeActivity(account.lastActivityAt)}</span>
                  </Link>
                ))}
                {activeCustomers.length === 0 ? <p>No recent customer activity recorded yet.</p> : null}
              </div>
            </aside>
          </section>

          <section className="setup-steps platform-accounts-section">
            <div className="platform-section-toolbar">
              <div className="section-heading compact-heading">
                <p className="eyebrow">Accounts</p>
                <h2>Restaurant health overview</h2>
                <p>Training content stays tenant-protected. This view shows account metadata, usage signals, and support health.</p>
              </div>
              <label className="compact-search">
                <span>Search accounts</span>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Restaurant, owner, email..."
                />
              </label>
            </div>

            <div className="platform-account-table">
              {filteredWorkspaces.map((account) => (
                <Link className="platform-account-row" to={`/platform/restaurants/${account.id}`} key={account.id}>
                  <div>
                    <h4>{account.name}</h4>
                    <p>{account.accountHolder?.name || "No owner set"} · {account.accountHolder?.email || "No email set"}</p>
                  </div>
                  <span>{subscriptionLabel(account.subscriptionStatus)}</span>
                  <span>{account.activeMembers} active users</span>
                  <span>{account.publishedPages} published pages</span>
                  <span>{account.staffCompletionRate}% staff completion</span>
                  <span>{formatRelativeActivity(account.lastActivityAt)}</span>
                </Link>
              ))}
            </div>
          </section>

          <details className="setup-steps platform-control-details">
            <summary>Platform access management</summary>
            <p>The person must first create a Line Up login. Never share your password or AWS root login.</p>
            <form
              className="form-card platform-access-form"
              onSubmit={(event) => {
                event.preventDefault();
                updateAccess("grant");
              }}
            >
              <label>
                Existing Line Up login email
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </label>
              <label>
                Platform role
                <select value={role} onChange={(event) => setRole(event.target.value)}>
                  <option value="platform_developer">Platform Developer</option>
                  <option value="platform_owner">Platform Owner</option>
                </select>
              </label>
              <button className="primary-button" type="submit" disabled={isSaving}>
                {isSaving ? "Updating..." : "Grant Access"}
              </button>
            </form>

            <div className="operator-list">
              {platformUsers.map((user) => (
                <article className="operator-list-card" key={`${user.username}-${user.role}`}>
                  <div>
                    <h4>{user.email || user.username}</h4>
                    <p>{roleLabel(user.role)} · {user.enabled ? "Active login" : "Disabled login"}</p>
                  </div>
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={isSaving}
                    onClick={() => updateAccess("revoke", user.email, user.role)}
                  >
                    Remove Access
                  </button>
                </article>
              ))}
            </div>
          </details>

          <details className="setup-steps platform-control-details">
            <summary>Future AI operations map</summary>
            <p>These are not connected yet. This is the control-room layout for later AI agents that help you run Line Up.</p>
            <div className="platform-ai-grid">
              <article className="platform-ai-card">
                <h4>Customer Support AI</h4>
                <p>Summarize support tickets, suggest fixes, and spot repeated onboarding problems.</p>
              </article>
              <article className="platform-ai-card">
                <h4>Billing Support AI</h4>
                <p>Explain plan status, trial timing, failed payments, and renewal questions.</p>
              </article>
              <article className="platform-ai-card">
                <h4>Import Assistant AI</h4>
                <p>Turn menus, tech sheets, and SOPs into clean draft training pages for manager review.</p>
              </article>
              <article className="platform-ai-card">
                <h4>Product Insights AI</h4>
                <p>Surface which restaurants are active, stuck, growing, or likely to need your help.</p>
              </article>
            </div>
          </details>

          <p className="platform-generated-note">Updated {formatPlatformDate(operations.generatedAt, "just now")}. Login activity is currently estimated from product actions until auth event tracking is added.</p>
        </>
      ) : null}

      {!isPlatformOwner && !isLoading ? (
        <div className="form-card">
          <h2>Developer access is intentionally limited</h2>
          <p>Use a dedicated test restaurant for product testing. Ask a Platform Owner when a customer-specific support case requires reviewed access.</p>
        </div>
      ) : null}
    </section>
  );
}
