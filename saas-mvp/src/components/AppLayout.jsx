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
            <NavLink to="/manage">Manage restaurant</NavLink>
            {isOwnerOrAdmin(currentWorkspace.role) ? <NavLink to="/manager/settings">Restaurant settings</NavLink> : null}
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
        <NavLink to="/founding-restaurants">Founding offer</NavLink>
        <NavLink to="/login" state={{ from: location.pathname }}>Sign in</NavLink>
        <NavLink className="nav-primary-link" to="/trial">Start free trial</NavLink>
      </>
    );
  }

  if (currentWorkspace.isLoading) return null;

  if (currentWorkspace.isActiveMember) {
    return (
      <>
        <NavLink end to="/home">Home</NavLink>
        <NavLink to="/library">Library</NavLink>
        {currentWorkspace.role !== "staff" ? <NavLink to="/manage">Manage</NavLink> : null}
      </>
    );
  }

  return hasPlatformAccess ? <NavLink to="/platform">Administration</NavLink> : null;
}

function MobileBottomNav({ authSession, currentWorkspace, location }) {
  if (authSession.status !== "authenticated" || currentWorkspace.isLoading || !currentWorkspace.isActiveMember) {
    return null;
  }

  return (
    <nav className="bottom-nav" aria-label="Quick navigation">
      <NavLink end to="/home">Home</NavLink>
      <NavLink to="/library">Library</NavLink>
      {currentWorkspace.role !== "staff" ? <NavLink to="/manage">Manage</NavLink> : null}
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
  const isAuthenticated = authSession.status === "authenticated";
  const authenticatedHome = currentWorkspace.isActiveMember ? "/home" : hasPlatformAccess ? "/platform" : "/home";

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
      <header className={isAuthenticated ? "site-header is-authenticated" : "site-header"}>
        <NavLink className="brand" to={isAuthenticated ? authenticatedHome : "/"}>
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

        {!isAuthenticated ? (
          <details className="mobile-nav-menu" key={location.pathname}>
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
        ) : null}

        {isAuthenticated && !currentWorkspace.isLoading ? (
          <AccountMenu
            key={location.pathname}
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
