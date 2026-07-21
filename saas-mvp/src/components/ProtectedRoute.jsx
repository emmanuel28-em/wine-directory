import { Link, Navigate, useLocation } from "react-router-dom";
import { useAmplifySetup } from "../amplify/AmplifySetupProvider.jsx";
import { useAuthSession } from "../auth/AuthSessionProvider.jsx";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";

const billingAllowedPaths = new Set(["/manager", "/manager/billing", "/manager/settings"]);

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const location = useLocation();
  const amplifySetup = useAmplifySetup();
  const authSession = useAuthSession();
  const currentWorkspace = useCurrentWorkspace();

  if (amplifySetup.status === "loading" || authSession.status === "checking" || currentWorkspace.isLoading) {
    return (
      <section className="page-section narrow-page">
        <div className="empty-panel">Checking login setup...</div>
      </section>
    );
  }

  // If the user is not logged in, remember where they were trying to go.
  // After login, the Login page sends them back to this route.
  if (authSession.status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!currentWorkspace.isActiveMember) {
    return (
      <section className="page-section narrow-page">
        <div className="form-card">
          <h1>{currentWorkspace.status === "disabled" ? "Workspace access disabled" : "No restaurant workspace found for this account."}</h1>
          <p>
            {currentWorkspace.status === "disabled"
              ? "Your access to this workspace has been disabled."
              : "Ask your manager for an invite, or start a new restaurant workspace if you are the account owner."}
          </p>
        </div>
      </section>
    );
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentWorkspace.role)) {
    // Staff who sign in through the shared login should land on their own Home
    // instead of seeing a manager-permission error first.
    if (currentWorkspace.role === "staff") {
      return <Navigate to="/staff" replace />;
    }

    return (
      <section className="page-section narrow-page">
        <div className="form-card">
          <h1>You do not have permission to access this page.</h1>
          <p>
            This area is only available to account owners, admins, or managers for this restaurant workspace.
          </p>
        </div>
      </section>
    );
  }

  if (currentWorkspace.isBillingPaused && !billingAllowedPaths.has(location.pathname)) {
    return (
      <section className="page-section narrow-page">
        <div className="form-card">
          <h1>This workspace needs an active subscription.</h1>
          <p>
            Please contact your manager or Account Owner to update billing before adding training material, taking quizzes, uploading files, or inviting new team members.
          </p>
          {currentWorkspace.role === "owner" || currentWorkspace.role === "admin" ? (
            <Link className="primary-button" to="/manager/billing">
              Restore Workspace Access
            </Link>
          ) : null}
        </div>
      </section>
    );
  }

  return children;
}
