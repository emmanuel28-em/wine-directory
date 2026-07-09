import { Navigate, useLocation } from "react-router-dom";
import { useAmplifySetup } from "../amplify/AmplifySetupProvider.jsx";
import { useAuthSession } from "../auth/AuthSessionProvider.jsx";

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const amplifySetup = useAmplifySetup();
  const authSession = useAuthSession();

  if (amplifySetup.status === "loading" || authSession.status === "checking") {
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

  return children;
}
