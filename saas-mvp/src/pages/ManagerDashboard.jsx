import { Link } from "react-router-dom";
import { useAuthSession } from "../auth/AuthSessionProvider.jsx";
import { formatRole, useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { formatBillingStatus, isTrialExpired } from "../lib/billing.js";
import { isOwnerOrAdmin } from "../lib/permissions.js";

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

function getUserEmail(user) {
  return user?.signInDetails?.loginId || user?.username || "Not available";
}

function getDashboardBillingLine(restaurant) {
  const status = restaurant?.subscriptionStatus || "trialing";

  if (status === "trialing") {
    return `Free trial active until ${formatDate(restaurant.trialEndsAt)}`;
  }

  if (status === "active") return "Subscription active";
  if (status === "past_due") return "Payment past due";
  if (status === "canceled") return "Subscription canceled";
  if (status === "unpaid") return "Payment required";
  if (status === "incomplete") return "Billing setup incomplete";

  return "Billing not set up";
}

export default function ManagerDashboard() {
  const authSession = useAuthSession();
  const workspace = useCurrentWorkspace();

  const restaurantName = workspace.restaurant?.name || "Your Restaurant";
  const canManageBilling = isOwnerOrAdmin(workspace.role);
  const setupChecklist = [
    {
      label: "Create training categories",
      detail: "Match how this restaurant already talks about training.",
      to: "/manager/content"
    },
    {
      label: "Add the first training page",
      detail: "Start with one dish, wine, cocktail, or SOP.",
      to: "/manager/content"
    },
    {
      label: "Invite one staff member",
      detail: "Send a real invite and confirm the staff view feels clear.",
      to: "/manager/invite-team"
    },
    {
      label: "Create one quiz",
      detail: "Use Testable Staff Knowledge from a training page.",
      to: "/manager/quizzes"
    },
    {
      label: "Review staff progress",
      detail: "Confirm managers can see scores after a quiz is submitted.",
      to: "/manager/staff-progress"
    }
  ];

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Workspace Dashboard</p>
          <h1>{restaurantName}</h1>
          <p>
            Organize training categories, publish staff-facing pages, invite the team, and track readiness.
          </p>
        </div>
        <Link className="secondary-button" to="/staff">
          Training Library
        </Link>
        <Link className="secondary-button" to="/manager/onboarding">
          Continue Setup
        </Link>
        <Link className="primary-button" to="/manager/content">
          Add Training Page
        </Link>
      </div>

      {workspace.isLoading ? (
        <div className="empty-panel">Loading your restaurant workspace...</div>
      ) : null}

      {workspace.status === "empty" || workspace.status === "error" ? (
        <div className="form-card">
          <h2>Workspace setup needed</h2>
          <p>{workspace.message}</p>
          <Link className="primary-button full-width" to="/trial">
            Create Trial Workspace
          </Link>
        </div>
      ) : null}

      {workspace.status === "ready" ? (
        <>
          {isTrialExpired(workspace.restaurant) ? (
            <div className="warning-banner">
              This workspace's 30-day free trial has ended. Set up billing to restore full access.
            </div>
          ) : null}

          <div className="dashboard-grid">
            <article className="stat-card">
              <span>Restaurant</span>
              <h2>{workspace.restaurant.name}</h2>
              <p>Status: {workspace.restaurant.status === "trial" || !workspace.restaurant.status ? "free trial" : workspace.restaurant.status}</p>
            </article>

            <article className="stat-card">
              <span>Trial End Date</span>
              <h2>{formatDate(workspace.restaurant.trialEndsAt)}</h2>
              <p>{formatBillingStatus(workspace.restaurant)}</p>
            </article>

            <article className="stat-card">
              <span>Role</span>
              <h2>{formatRole(workspace.membership?.role)}</h2>
              <p>{workspace.userProfile?.email || getUserEmail(authSession.user)}</p>
            </article>
          </div>

          <section className="pilot-checklist-section">
            <div className="section-heading compact-heading">
              <p className="eyebrow">Launch readiness</p>
              <h2>Get this restaurant ready for its first staff test</h2>
              <p>Follow these in order. Each step opens the exact place you need next.</p>
            </div>

            <Link className="primary-button checklist-main-action" to="/manager/onboarding">
              Open Guided Setup
            </Link>

            <div className="pilot-checklist">
              {setupChecklist.map((item, index) => (
                <Link className="pilot-checklist-item" key={item.label} to={item.to}>
                  <span>{index + 1}</span>
                  <div>
                    <h3>{item.label}</h3>
                    <p>{item.detail}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="setup-steps">
            <div className="section-heading">
              <p className="eyebrow">Quick actions</p>
              <h2>Keep the team lined up.</h2>
            </div>

            <div className="dashboard-grid">
              <article className="stat-card">
                <span>Content</span>
                <h2>Add Training Page</h2>
                <p>Create the page staff studies: a dish, SOP, wine note, cocktail spec, or service standard.</p>
                <Link className="secondary-button card-action" to="/manager/content">
                  Add Content
                </Link>
              </article>

              <article className="stat-card">
                <span>Import</span>
                <h2>Import Existing Material</h2>
                <p>Paste menu notes or tech sheets, review the fields Line Up finds, and save them safely as drafts.</p>
                <Link className="secondary-button card-action" to="/manager/import">
                  Import Material
                </Link>
              </article>

              <article className="stat-card">
                <span>Categories</span>
                <h2>Create Training Category</h2>
                <p>Organize pages into areas like Dinner Menu, BTG Wines, Opening SOPs, or Onboarding.</p>
                <Link className="secondary-button card-action" to="/manager/content">
                  Manage Categories
                </Link>
              </article>

              <article className="stat-card" id="invite-team">
                <span>Invite Team</span>
                <h2>Invite your team</h2>
                <p>Send invite emails to staff, managers, chefs, bartenders, cooks, and anyone who needs access.</p>
                <Link className="secondary-button card-action" to="/manager/invite-team">
                  Invite Team
                </Link>
              </article>

              <article className="stat-card" id="staff-progress">
                <span>Staff Progress</span>
                <h2>View Staff Progress</h2>
                <p>See quiz results, completion dates, and who is ready for service.</p>
                <Link className="secondary-button card-action" to="/manager/staff-progress">
                  View Results
                </Link>
              </article>

              <article className="stat-card managed-setup-card">
                <span>Managed Setup</span>
                <h2>Request Managed Setup</h2>
                <p>
                  Send us your Google Docs, PDFs, menus, wine lists, and SOPs. We can organize them into Line Up for you.
                </p>
                <Link className="primary-button card-action" to="/managed-setup">
                  Request Managed Setup
                </Link>
              </article>

              <article className="stat-card">
                <span>Plan & Billing</span>
                <h2>{formatBillingStatus(workspace.restaurant)}</h2>
                <p>{getDashboardBillingLine(workspace.restaurant)}</p>
                {canManageBilling ? (
                  <Link className="secondary-button card-action" to="/manager/billing">
                    View Plan
                  </Link>
                ) : (
                  <p className="helper-text">Ask an Account Owner or Admin to manage billing.</p>
                )}
              </article>
            </div>
          </section>

          <section className="setup-steps">
            <div className="section-heading">
              <p className="eyebrow">Setup path</p>
              <h2>Build the training system</h2>
            </div>

            <div className="step-grid">
              <article className="step-card">
                <span>1</span>
                <h3>Organize your training categories</h3>
              </article>

              <article className="step-card">
                <span>2</span>
                <h3>Add training pages</h3>
              </article>

              <article className="step-card">
                <span>3</span>
                <h3>Invite your team</h3>
              </article>

              <article className="step-card">
                <span>4</span>
                <h3>Track quizzes and progress</h3>
              </article>
            </div>
          </section>

          <section className="setup-steps" id="quizzes">
            <div className="dashboard-grid">
              <article className="stat-card">
                <span>Quizzes</span>
                <h2>Create Staff Quizzes</h2>
                <p>Build quizzes from training pages and Testable Staff Knowledge.</p>
                <Link className="secondary-button card-action" to="/manager/quizzes">
                  Manage Quizzes
                </Link>
              </article>

              <article className="stat-card" id="settings">
                <span>Settings</span>
                <h2>Workspace Settings</h2>
                <p>Manage restaurant details, team access, pending invites, and profile settings.</p>
                <Link className="secondary-button card-action" to="/manager/settings">
                  Open Settings
                </Link>
              </article>

              <article className="stat-card">
                <span>Account Owner</span>
              <h2>{workspace.userProfile?.name || "Manager"}</h2>
                <p>{workspace.userProfile?.email || getUserEmail(authSession.user)}</p>
              </article>
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}
