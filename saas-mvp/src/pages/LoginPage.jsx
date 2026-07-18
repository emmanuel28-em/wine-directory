import { Authenticator } from "@aws-amplify/ui-react";
import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAmplifySetup } from "../amplify/AmplifySetupProvider.jsx";
import { useAuthSession } from "../auth/AuthSessionProvider.jsx";

function SignedInRedirect({ to }) {
  const authSession = useAuthSession();

  useEffect(() => {
    authSession.refreshSession();
  }, []);

  return <Navigate to={to} replace />;
}

export default function LoginPage() {
  const location = useLocation();
  const amplifySetup = useAmplifySetup();
  const authSession = useAuthSession();
  const returnTo = location.state?.from || "/manager";

  if (amplifySetup.status === "loading" || authSession.status === "checking") {
    return (
      <section className="page-section narrow-page">
        <div className="empty-panel">Checking your secure login...</div>
      </section>
    );
  }

  // If someone already has a valid session, do not show the signup form again.
  // This avoids Amplify's "There is already a signed in user" message.
  if (authSession.status === "authenticated") {
    return <Navigate to={authSession.platformRole ? "/platform" : "/manager"} replace />;
  }

  return (
    <section className="page-section narrow-page">
      <div className="section-heading">
        <p className="eyebrow">Secure login</p>
        <h1>Sign in to Line Up</h1>
        <p>
          Access your restaurant's training. Joining from an invite? Use the email address your manager invited.
        </p>
      </div>

      {amplifySetup.status === "missing" ? (
        <div className="form-card">
          <h2>Sign in is temporarily unavailable</h2>
          <p>
            Please try again shortly. If the problem continues, contact Line Up support.
          </p>
        </div>
      ) : (
        <div className="auth-card">
          <Authenticator initialState="signIn" signUpAttributes={["email"]}>
            {() => <SignedInRedirect to={returnTo} />}
          </Authenticator>
        </div>
      )}
    </section>
  );
}
