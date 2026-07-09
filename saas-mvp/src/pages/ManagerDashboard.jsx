import { Link } from "react-router-dom";
import { useAuthSession } from "../auth/AuthSessionProvider.jsx";
import { formatRole, useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";

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

export default function ManagerDashboard() {
  const authSession = useAuthSession();
  const workspace = useCurrentWorkspace();

  const restaurantName = workspace.restaurant?.name || "Your Restaurant";

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
          <div className="dashboard-grid">
            <article className="stat-card">
              <span>Restaurant</span>
              <h2>{workspace.restaurant.name}</h2>
              <p>Status: {workspace.restaurant.status || "trial"}</p>
            </article>

            <article className="stat-card">
              <span>Trial Ends</span>
              <h2>{formatDate(workspace.restaurant.trialEndsAt)}</h2>
              <p>30-day trial workspace</p>
            </article>

            <article className="stat-card">
              <span>Role</span>
              <h2>{formatRole(workspace.membership?.role)}</h2>
              <p>{workspace.userProfile?.email || getUserEmail(authSession.user)}</p>
            </article>
          </div>

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
                <span>Categories</span>
                <h2>Create Training Category</h2>
                <p>Organize pages into areas like Dinner Menu, BTG Wines, Opening SOPs, or Onboarding.</p>
                <Link className="secondary-button card-action" to="/manager/content">
                  Manage Categories
                </Link>
              </article>

              <article className="stat-card" id="invite-team">
                <span>Invite Team</span>
                <h2>Invite Staff</h2>
                <p>Invite Staff and Invite Admin links are coming next. Invites will set each person's allowed role.</p>
                <div className="card-actions">
                  <button className="secondary-button" type="button" disabled>
                    Invite Staff
                  </button>
                  <button className="secondary-button" type="button" disabled>
                    Invite Admin
                  </button>
                </div>
              </article>

              <article className="stat-card" id="staff-progress">
                <span>Staff Progress</span>
                <h2>View Staff Progress</h2>
                <p>Progress tracking will show quiz results, completion, and who is ready for service.</p>
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
                <h2>Quiz builder coming next</h2>
                <p>Quizzes will pull from Testable Staff Knowledge in each Training Page.</p>
              </article>

              <article className="stat-card" id="settings">
                <span>Settings</span>
                <h2>Workspace settings coming next</h2>
                <p>Settings will let Account Owners manage restaurant details and admin access.</p>
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
