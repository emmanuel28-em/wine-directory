import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthSession } from "../auth/AuthSessionProvider.jsx";
import { useAmplifySetup } from "../amplify/AmplifySetupProvider.jsx";
import { loadUserWorkspace } from "../lib/workspace.js";
import AmplifySetupNotice from "./AmplifySetupNotice.jsx";

export default function AppLayout() {
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [workspaceRole, setWorkspaceRole] = useState("");
  const authSession = useAuthSession();
  const amplifySetup = useAmplifySetup();

  useEffect(() => {
    let isMounted = true;

    async function loadRole() {
      if (amplifySetup.status !== "ready" || authSession.status !== "authenticated") {
        setWorkspaceRole("");
        return;
      }

      try {
        const workspace = await loadUserWorkspace(authSession.user);
        if (isMounted) {
          setWorkspaceRole(workspace.membership?.role || "");
        }
      } catch {
        if (isMounted) {
          setWorkspaceRole("");
        }
      }
    }

    loadRole();

    return () => {
      isMounted = false;
    };
  }, [amplifySetup.status, authSession.status, authSession.user?.userId]);

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
            workspaceRole === "staff" ? (
              <>
                <NavLink to="/staff">Training Library</NavLink>
                <Link to="/staff#quizzes">Quizzes</Link>
                <Link to="/staff#progress">My Progress</Link>
                <Link to="/staff#report-issue">Report Issue</Link>
              </>
            ) : (
              <>
                <NavLink to="/manager">Dashboard</NavLink>
                <NavLink to="/staff">Training Library</NavLink>
                <NavLink to="/manager/content">Add Content</NavLink>
                <Link to="/manager#quizzes">Quizzes</Link>
                <Link to="/manager#staff-progress">Staff Progress</Link>
                <Link to="/manager#invite-team">Invite Team</Link>
                <Link to="/manager#settings">Settings</Link>
              </>
            )
          ) : (
            <>
              <NavLink to="/">Home</NavLink>
              <Link to="/#how-it-works">How It Works</Link>
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
          Signed in as <strong>{authSession.user?.signInDetails?.loginId || authSession.user?.username}</strong>
        </div>
      ) : null}

      <AmplifySetupNotice />

      <main>
        <Outlet />
      </main>
    </div>
  );
}
