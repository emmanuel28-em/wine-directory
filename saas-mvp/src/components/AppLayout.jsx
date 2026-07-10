import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthSession } from "../auth/AuthSessionProvider.jsx";
import { formatRole, useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { formatBillingStatus } from "../lib/billing.js";
import { getDataClient } from "../lib/dataClient.js";
import { isOwnerOrAdmin } from "../lib/permissions.js";
import AmplifySetupNotice from "./AmplifySetupNotice.jsx";

function DevelopmentRoleSwitcher({ currentWorkspace }) {
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  if (!import.meta.env.DEV || !currentWorkspace.membership?.id) {
    return null;
  }

  async function updateRole(event) {
    const nextRole = event.target.value;
    setIsUpdatingRole(true);

    try {
      const dataClient = getDataClient();
      const result = await dataClient.models.Membership.update({
        id: currentWorkspace.membership.id,
        role: nextRole
      });

      if (result.errors?.length) {
        throw new Error(result.errors.map((error) => error.message).join(" "));
      }

      await currentWorkspace.reloadWorkspace();
    } finally {
      setIsUpdatingRole(false);
    }
  }

  return (
    <label className="dev-role-switcher">
      Development role testing
      <select value={currentWorkspace.role} onChange={updateRole} disabled={isUpdatingRole}>
        <option value="owner">Account Owner</option>
        <option value="admin">Admin</option>
        <option value="manager">Manager</option>
        <option value="staff">Staff</option>
      </select>
    </label>
  );
}

export default function AppLayout() {
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const authSession = useAuthSession();
  const currentWorkspace = useCurrentWorkspace();

  async function handleLogout() {
    setIsSigningOut(true);

    try {
      await authSession.signOut();
    } finally {
      setIsSigningOut(false);
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink className="brand" to="/">
          <span className="brand-mark" aria-hidden="true">
            <span className="brand-l">L</span>
            <span className="brand-u">U</span>
          </span>
          <span>
            <strong>Line Up</strong>
            <small>Restaurant Training Platform</small>
          </span>
        </NavLink>

        <nav className="main-nav" aria-label="Main navigation">
          {authSession.status === "authenticated" ? (
            currentWorkspace.isLoading ? null : currentWorkspace.role === "staff" ? (
              <>
                <NavLink to="/training-library">Training Library</NavLink>
                <NavLink to="/quizzes">Quizzes</NavLink>
                <NavLink to="/my-progress">My Progress</NavLink>
                <NavLink to="/report-issue">Report Issue</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/manager">Dashboard</NavLink>
                <NavLink to="/training-library">Training Library</NavLink>
                <NavLink to="/manager/content">Add Content</NavLink>
                <NavLink to="/manager/quizzes">Quizzes</NavLink>
                <NavLink to="/manager/staff-progress">Staff Progress</NavLink>
                <NavLink to="/manager/invite-team">Invite Team</NavLink>
                {isOwnerOrAdmin(currentWorkspace.role) ? <NavLink to="/manager/billing">Billing</NavLink> : null}
                <NavLink to="/manager/settings">Settings</NavLink>
              </>
            )
          ) : (
            <>
              <NavLink to="/">Home</NavLink>
              <Link to="/#problem">How It Works</Link>
              <Link to="/#pricing">Pricing</Link>
              <NavLink to="/managed-setup">Managed Setup</NavLink>
              <NavLink to="/login">Sign In</NavLink>
              <NavLink to="/trial">Start Free Trial</NavLink>
            </>
          )}

          {authSession.status === "authenticated" ? (
            <button className="nav-button" type="button" onClick={handleLogout} disabled={isSigningOut}>
              {isSigningOut ? "Logging out..." : "Log Out"}
            </button>
          ) : null}
        </nav>
      </header>

      {authSession.status === "authenticated" ? (
        <div className="user-strip">
          <span>
            Signed in as <strong>{authSession.user?.signInDetails?.loginId || authSession.user?.username}</strong>
            {currentWorkspace.role ? <> · {formatRole(currentWorkspace.role)}</> : null}
          </span>
          <DevelopmentRoleSwitcher currentWorkspace={currentWorkspace} />
        </div>
      ) : null}

      {authSession.status === "authenticated" && currentWorkspace.isBillingPaused ? (
        <div className="warning-banner app-warning-banner">
          {formatBillingStatus(currentWorkspace.restaurant)}. Please update billing to keep this workspace active.
        </div>
      ) : null}

      <AmplifySetupNotice />

      <main>
        <Outlet />
      </main>
    </div>
  );
}
