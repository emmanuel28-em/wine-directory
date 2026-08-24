import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuthSession } from "../auth/AuthSessionProvider.jsx";
import { formatRole, useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import AmplifySetupNotice from "./AmplifySetupNotice.jsx";

function AccountMenu({ currentWorkspace, hasPlatformAccess }) {
  const userName = "Public access";
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
            <NavLink to="/manager/settings">Restaurant settings</NavLink>
          </>
        ) : null}

        <NavLink to="/report-issue">Help & support</NavLink>

        {hasPlatformAccess ? <NavLink to="/platform">Line Up administration</NavLink> : null}
      </div>
    </details>
  );
}

function NavigationLinks({ authSession, currentWorkspace, hasPlatformAccess, location }) {
  if (authSession.status !== "authenticated") {
    return (
      <>
        <NavLink className="nav-primary-link" to="/manager">Open Line Up</NavLink>
      </>
    );
  }

  if (currentWorkspace.isLoading) return null;

  if (currentWorkspace.role === "staff") {
    return (
      <>
        <NavLink to="/staff">Home</NavLink>
        <NavLink to="/training-library">Library</NavLink>
        <NavLink to="/my-progress">Progress</NavLink>
        <NavLink to="/report-issue">Help</NavLink>
      </>
    );
  }

  if (currentWorkspace.isActiveMember) {
    return (
      <>
        <NavLink end to="/manager">Home</NavLink>
        <NavLink to="/training-library">Library</NavLink>
        <NavLink to="/manager/invite-team">Team</NavLink>
        <NavLink to="/manager/staff-progress">Results</NavLink>
        <NavLink to="/report-issue">Help</NavLink>
      </>
    );
  }

  return hasPlatformAccess ? <NavLink to="/platform">Administration</NavLink> : null;
}

function MobileBottomNav({ authSession, currentWorkspace }) {
  if (authSession.status !== "authenticated" || currentWorkspace.isLoading || !currentWorkspace.isActiveMember) {
    return null;
  }

  if (currentWorkspace.role === "staff") {
    return (
      <nav className="bottom-nav" aria-label="Staff quick navigation">
        <NavLink to="/staff">Home</NavLink>
        <NavLink to="/training-library">Library</NavLink>
        <NavLink to="/my-progress">Progress</NavLink>
        <NavLink to="/report-issue">Help</NavLink>
      </nav>
    );
  }

  return (
      <nav className="bottom-nav" aria-label="Manager quick navigation">
        <NavLink end to="/manager">Home</NavLink>
        <NavLink to="/training-library">Library</NavLink>
        <NavLink to="/manager/invite-team">Team</NavLink>
        <NavLink to="/manager/staff-progress">Results</NavLink>
      </nav>
  );
}

export default function AppLayout() {
  const location = useLocation();
  const authSession = useAuthSession();
  const currentWorkspace = useCurrentWorkspace();
  const hasPlatformAccess = ["platform_owner", "platform_developer"].includes(authSession.platformRole);
  const authenticatedHome = currentWorkspace.role === "staff" ? "/staff" : "/manager";

  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink className="brand" to={authSession.status === "authenticated" ? authenticatedHome : "/"}>
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
            currentWorkspace={currentWorkspace}
            hasPlatformAccess={hasPlatformAccess}
          />
        ) : null}
      </header>

      <AmplifySetupNotice />

      <main>
        <Outlet />
      </main>

      <MobileBottomNav authSession={authSession} currentWorkspace={currentWorkspace} />
    </div>
  );
}
