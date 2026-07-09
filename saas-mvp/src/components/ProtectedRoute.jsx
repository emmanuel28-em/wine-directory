import { Navigate, useLocation } from "react-router-dom";
import { useAmplifySetup } from "../amplify/AmplifySetupProvider.jsx";
import { useAuthSession } from "../auth/AuthSessionProvider.jsx";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";

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
          <h1>No restaurant workspace found for this account.</h1>
          <p>
            Ask your manager for an invite, or start a new restaurant workspace if you are the account owner.
          </p>
        </div>
      </section>
    );
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentWorkspace.role)) {
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

  return children;
}
