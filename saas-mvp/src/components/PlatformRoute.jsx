import { Navigate, useLocation } from "react-router-dom";
import { useAmplifySetup } from "../amplify/AmplifySetupProvider.jsx";
import { useAuthSession } from "../auth/AuthSessionProvider.jsx";

export default function PlatformRoute({ children, ownerOnly = false }) {
  const location = useLocation();
  const amplifySetup = useAmplifySetup();
  const authSession = useAuthSession();

  if (amplifySetup.status === "loading" || authSession.status === "checking") {
    return (
      <section className="page-section narrow-page">
        <div className="empty-panel">Checking platform access...</div>
      </section>
    );
  }

  if (authSession.status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const allowed = ownerOnly
    ? authSession.platformRole === "platform_owner"
    : ["platform_owner", "platform_developer"].includes(authSession.platformRole);

  if (!allowed) {
    return (
      <section className="page-section narrow-page">
        <div className="form-card">
          <h1>Platform access required</h1>
          <p>This area is for approved Line Up company operators and developers.</p>
        </div>
      </section>
    );
  }

  return children;
}
