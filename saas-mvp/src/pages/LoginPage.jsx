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
          Access your restaurant workspace. Joining from an invite? Use the email address your manager invited.
        </p>
      </div>

      {amplifySetup.status === "missing" ? (
        <div className="form-card">
          <h2>Secure login is not connected yet</h2>
          <p>
            Line Up needs its cloud connection before real signup can work on this computer.
          </p>
          <ol className="setup-list">
            <li>Start the local cloud sandbox from the project folder.</li>
            <li>Wait for the connection file to be created.</li>
            <li>Restart the local website if the login form does not appear.</li>
          </ol>
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
