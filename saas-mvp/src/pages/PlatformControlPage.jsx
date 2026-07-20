import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthSession } from "../auth/AuthSessionProvider.jsx";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { getDataClient } from "../lib/dataClient.js";

function parseUsers(value) {
  try {
    return JSON.parse(value || "[]");
  } catch {
    return [];
  }
}

function roleLabel(role) {
  return role === "platform_owner" ? "Platform Owner" : "Platform Developer";
}

function restaurantRoleLabel(role) {
  const labels = {
    owner: "Account Owner",
    admin: "Admin",
    manager: "Manager",
    staff: "Staff"
  };
  return labels[role] || "Team Member";
}

function formatDate(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function isActiveStatus(status) {
  return status === "active";
}

async function listAllRecords(model, options = {}) {
  const records = [];
  let nextToken;

  do {
    const result = await model.list({ ...options, limit: 1000, nextToken });
    if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join(" "));
    records.push(...(result.data || []));
    nextToken = result.nextToken;
  } while (nextToken);

  return records;
}

function buildWorkspaceSummary({ restaurant, memberships, profilesById }) {
  const workspaceMemberships = memberships.filter((membership) => membership.restaurantId === restaurant.id);
  const activeMemberships = workspaceMemberships.filter((membership) => isActiveStatus(membership.status));
  const ownerMembership =
    activeMemberships.find((membership) => membership.role === "owner") ||
    workspaceMemberships.find((membership) => membership.role === "owner");
  const ownerProfile = ownerMembership ? profilesById.get(ownerMembership.userProfileId) : null;
  const roleCounts = activeMemberships.reduce(
    (counts, membership) => ({ ...counts, [membership.role]: (counts[membership.role] || 0) + 1 }),
    { owner: 0, admin: 0, manager: 0, staff: 0 }
  );

  return {
    restaurant,
    accountHolderName: restaurant.primaryContactName || ownerProfile?.name || "No account holder set",
    accountHolderEmail: restaurant.primaryContactEmail || restaurant.billingEmail || ownerProfile?.email || "No account email",
    billingEmail: restaurant.billingEmail || restaurant.primaryContactEmail || ownerProfile?.email || "No billing email",
    activeMemberCount: activeMemberships.length,
    disabledMemberCount: workspaceMemberships.filter((membership) => membership.status === "disabled").length,
    pendingMemberCount: workspaceMemberships.filter((membership) => membership.status === "invited").length,
    roleCounts
  };
}

export default function PlatformControlPage() {
  const authSession = useAuthSession();
  const workspace = useCurrentWorkspace();
  const [restaurants, setRestaurants] = useState([]);
  const [workspaceSummaries, setWorkspaceSummaries] = useState([]);
  const [platformUsers, setPlatformUsers] = useState([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("platform_developer");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const isPlatformOwner = authSession.platformRole === "platform_owner";

  async function loadPlatformData() {
    setIsLoading(true);
    setMessage("");
    try {
      const client = getDataClient();
      const accessResult = await client.queries.getPlatformAccess();
      if (accessResult.errors?.length) throw new Error(accessResult.errors.map((error) => error.message).join(" "));
      if (!accessResult.data?.success) throw new Error(accessResult.data?.error || "Platform access could not be loaded.");
      setPlatformUsers(parseUsers(accessResult.data.usersJson));

      if (isPlatformOwner) {
        const [restaurantRecords, membershipRecords, profileRecords] = await Promise.all([
          listAllRecords(client.models.Restaurant),
          listAllRecords(client.models.Membership),
          listAllRecords(client.models.UserProfile)
        ]);
        const sortedRestaurants = restaurantRecords.sort((left, right) => left.name.localeCompare(right.name));
        const profilesById = new Map(profileRecords.map((profile) => [profile.id, profile]));

        setRestaurants(sortedRestaurants);
        setWorkspaceSummaries(
          sortedRestaurants.map((restaurant) =>
            buildWorkspaceSummary({ restaurant, memberships: membershipRecords, profilesById })
          )
        );
      }
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
      setPlatformUsers(parseUsers(result.data.usersJson));
      setEmail("");
      setMessage(action === "grant" ? "Platform access updated. The person should sign out and back in." : "Platform access removed.");
    } catch (error) {
      setMessage(error.message || "Platform access could not be updated.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Line Up Operations</p>
          <h1>Platform Control</h1>
          <p>Manage company access and review workspace health without mixing company roles with restaurant roles.</p>
        </div>
        {workspace.isActiveMember ? <Link className="secondary-button" to="/manager">Restaurant Dashboard</Link> : null}
        {isPlatformOwner ? <Link className="primary-button" to="/platform/support">Open Support Inbox</Link> : null}
      </div>

      {message ? <p className="form-message page-message">{message}</p> : null}
      {isLoading ? <div className="empty-panel">Loading Platform Control...</div> : null}

      {!isLoading ? (
        <div className="dashboard-grid">
          <article className="stat-card">
            <span>Your company role</span>
            <h2>{roleLabel(authSession.platformRole)}</h2>
            <p>This role is separate from any role you hold inside a restaurant workspace.</p>
          </article>
          <article className="stat-card">
            <span>Customer workspaces</span>
            <h2>{isPlatformOwner ? restaurants.length : "Private"}</h2>
            <p>{isPlatformOwner ? "Workspace metadata visible to Platform Owners." : "Developers do not receive customer access by default."}</p>
          </article>
          <article className="stat-card">
            <span>Active members</span>
            <h2>{isPlatformOwner ? workspaceSummaries.reduce((total, summary) => total + summary.activeMemberCount, 0) : "Private"}</h2>
            <p>{isPlatformOwner ? "Total active seats across all restaurant accounts." : "Only Platform Owners can review customer seat counts."}</p>
          </article>
          <article className="stat-card">
            <span>Recommended testing</span>
            <h2>Dedicated Test Workspace</h2>
            <p>Invite developers into a non-customer restaurant workspace when they need to test staff or manager flows.</p>
          </article>
          {isPlatformOwner ? (
            <article className="stat-card platform-reminder-card">
              <span>Owner Reminder</span>
              <h2>Stripe cleanup</h2>
              <p>Live payments are connected. Rotate the Stripe secret key after today's payment test, then finish the Stripe webhook secret so subscription status updates automatically.</p>
            </article>
          ) : null}
        </div>
      ) : null}

      {isPlatformOwner && !isLoading ? (
        <>
          <section className="setup-steps">
            <div className="section-heading compact-heading">
              <p className="eyebrow">Company Access</p>
              <h2>Platform owners and developers</h2>
              <p>The person must first create a Line Up login. Never share your password or AWS root login.</p>
            </div>

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
                {isSaving ? "Updating..." : "Grant Platform Access"}
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
          </section>

          <section className="setup-steps">
            <div className="section-heading compact-heading">
              <p className="eyebrow">Workspace Overview</p>
              <h2>Restaurant accounts</h2>
              <p>Review account holders, billing status, and active seats. Training libraries remain tenant-protected.</p>
            </div>
            <div className="platform-account-grid">
              {workspaceSummaries.map((summary) => (
                <article className="platform-account-card" key={summary.restaurant.id}>
                  <div className="platform-account-heading">
                    <div>
                      <h4>{summary.restaurant.name}</h4>
                      <p>{summary.restaurant.website || summary.restaurant.city || "No website or city set"}</p>
                    </div>
                    <div className="platform-workspace-status">
                      <strong>{summary.restaurant.subscriptionStatus || summary.restaurant.status || "trial"}</strong>
                      <span>{summary.restaurant.plan || "No plan selected"}</span>
                    </div>
                  </div>

                  <div className="platform-account-owner">
                    <span>Account holder</span>
                    <strong>{summary.accountHolderName}</strong>
                    <small>{summary.accountHolderEmail}</small>
                  </div>

                  <div className="platform-account-meta">
                    <span>Billing email: {summary.billingEmail}</span>
                    <span>Trial ends: {formatDate(summary.restaurant.trialEndsAt)}</span>
                  </div>

                  <div className="platform-account-stats">
                    <span><strong>{summary.activeMemberCount}</strong> active</span>
                    <span><strong>{summary.roleCounts.owner}</strong> {restaurantRoleLabel("owner")}</span>
                    <span><strong>{summary.roleCounts.admin + summary.roleCounts.manager}</strong> leaders</span>
                    <span><strong>{summary.roleCounts.staff}</strong> staff</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="setup-steps">
            <div className="section-heading compact-heading">
              <p className="eyebrow">Future AI Operations</p>
              <h2>Business helper map</h2>
              <p>These are not connected yet. This is the control-room layout for later AI agents that help you run Line Up.</p>
            </div>
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
          </section>
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
