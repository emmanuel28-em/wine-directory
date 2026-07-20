import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthSession } from "../auth/AuthSessionProvider.jsx";
import { formatRole, useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { formatBillingStatus } from "../lib/billing.js";
import { isOwnerOrAdmin } from "../lib/permissions.js";
import AmplifySetupNotice from "./AmplifySetupNotice.jsx";

function AccountMenu({ authSession, currentWorkspace, hasPlatformAccess, isSigningOut, onLogout }) {
  const userName = currentWorkspace.userProfile?.name || "My account";
  const restaurantName = currentWorkspace.restaurant?.name;

  return (
    <details className="account-menu">
      <summary>
        <span className="account-avatar" aria-hidden="true">
          {userName.charAt(0).toUpperCase()}
        </span>
        <span className="account-menu-label">
          <strong>{userName}</strong>
          <small>{restaurantName || formatRole(currentWorkspace.role)}</small>
        </span>
      </summary>

      <div className="account-menu-panel">
        <div className="account-menu-heading">
          <strong>{userName}</strong>
          <span>{formatRole(currentWorkspace.role)}</span>
        </div>

        {currentWorkspace.isActiveMember && currentWorkspace.role !== "staff" ? (
          <>
            <NavLink to="/training-library">View staff library</NavLink>
            <NavLink to="/manager/import">Import training material</NavLink>
            <NavLink to="/manager/onboarding">Getting started</NavLink>
            <NavLink to="/manager/settings">Restaurant settings</NavLink>
            {isOwnerOrAdmin(currentWorkspace.role) ? <NavLink to="/manager/billing">Plan & billing</NavLink> : null}
          </>
        ) : null}

        <NavLink to="/report-issue">Help & support</NavLink>

        {hasPlatformAccess ? <NavLink to="/platform">Line Up administration</NavLink> : null}
        {authSession.platformRole === "platform_owner" ? <NavLink to="/platform/support">Customer support inbox</NavLink> : null}

        <button type="button" onClick={onLogout} disabled={isSigningOut}>
          {isSigningOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </details>
  );
}

function NavigationLinks({ authSession, currentWorkspace, hasPlatformAccess, location }) {
  if (authSession.status !== "authenticated") {
    return (
      <>
        <NavLink to="/">Home</NavLink>
        <Link to="/#how-it-works">How it works</Link>
        <NavLink to="/managed-setup">Setup help</NavLink>
        <NavLink to="/login" state={{ from: location.pathname }}>Sign in</NavLink>
        <NavLink className="nav-primary-link" to="/trial">Start free trial</NavLink>
      </>
    );
  }

  if (currentWorkspace.isLoading) return null;

  if (currentWorkspace.role === "staff") {
    return (
      <>
        <NavLink to="/training-library">Library</NavLink>
        <NavLink to="/quizzes">Quizzes</NavLink>
        <NavLink to="/certifications">Certifications</NavLink>
        <NavLink to="/my-progress">My progress</NavLink>
      </>
    );
  }

  if (currentWorkspace.isActiveMember) {
    return (
      <>
        <NavLink end to="/manager">Home</NavLink>
        <NavLink to="/manager/content">Training</NavLink>
        <NavLink to="/manager/invite-team">Team</NavLink>
        <NavLink to="/manager/quizzes">Quizzes</NavLink>
        <NavLink to="/manager/certifications">Certifications</NavLink>
        <NavLink to="/manager/assignments">Assignments</NavLink>
        <NavLink to="/manager/staff-progress">Results</NavLink>
      </>
    );
  }

  return hasPlatformAccess ? <NavLink to="/platform">Administration</NavLink> : null;
}

function MobileBottomNav({ authSession, currentWorkspace, location }) {
  if (authSession.status !== "authenticated" || currentWorkspace.isLoading || !currentWorkspace.isActiveMember) {
    return null;
  }

  if (location.pathname === "/training-library") {
    return null;
  }

  if (currentWorkspace.role === "staff") {
    return (
      <nav className="bottom-nav" aria-label="Staff quick navigation">
        <NavLink to="/training-library">Library</NavLink>
        <NavLink to="/quizzes">Assigned</NavLink>
        <NavLink to="/certifications">Certs</NavLink>
        <NavLink to="/my-progress">Progress</NavLink>
      </nav>
    );
  }

  return (
    <nav className="bottom-nav" aria-label="Manager quick navigation">
      <NavLink end to="/manager">Home</NavLink>
      <NavLink to="/manager/content">Training</NavLink>
      <NavLink to="/manager/assignments">Assign</NavLink>
      <NavLink to="/manager/staff-progress">Results</NavLink>
    </nav>
  );
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const authSession = useAuthSession();
  const currentWorkspace = useCurrentWorkspace();
  const hasPlatformAccess = ["platform_owner", "platform_developer"].includes(authSession.platformRole);

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
        <NavLink className="brand" to={authSession.status === "authenticated" ? "/manager" : "/"}>
          <span className="brand-mark" aria-hidden="true">
            <span className="brand-l">L</span>
            <span className="brand-u">U</span>
          </span>
          <span>
            <strong>Line Up</strong>
            <small>{currentWorkspace.restaurant?.name || "Restaurant Training"}</small>
          </span>
        </NavLink>

        <nav className="main-nav" aria-label="Main navigation">
          <NavigationLinks
            authSession={authSession}
            currentWorkspace={currentWorkspace}
            hasPlatformAccess={hasPlatformAccess}
            location={location}
          />
        </nav>

        <details className="mobile-nav-menu">
          <summary>Menu</summary>
          <nav className="mobile-nav-links" aria-label="Mobile navigation">
            <NavigationLinks
              authSession={authSession}
              currentWorkspace={currentWorkspace}
              hasPlatformAccess={hasPlatformAccess}
              location={location}
            />
          </nav>
        </details>

        {authSession.status === "authenticated" && !currentWorkspace.isLoading ? (
          <AccountMenu
            authSession={authSession}
            currentWorkspace={currentWorkspace}
            hasPlatformAccess={hasPlatformAccess}
            isSigningOut={isSigningOut}
            onLogout={handleLogout}
          />
        ) : null}
      </header>

      {authSession.status === "authenticated" && currentWorkspace.isBillingPaused ? (
        <div className="warning-banner app-warning-banner">
          <span>{formatBillingStatus(currentWorkspace.restaurant)}. Update billing to keep your restaurant active.</span>
          {isOwnerOrAdmin(currentWorkspace.role) ? <Link to="/manager/billing">Review billing</Link> : null}
        </div>
      ) : null}

      <AmplifySetupNotice />

      <main>
        <Outlet />
      </main>

      <MobileBottomNav authSession={authSession} currentWorkspace={currentWorkspace} location={location} />
    </div>
  );
}
