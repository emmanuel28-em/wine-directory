import {
  confirmResetPassword,
  confirmSignIn,
  fetchAuthSession,
  resetPassword,
  signIn
} from "aws-amplify/auth";
import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAmplifySetup } from "../amplify/AmplifySetupProvider.jsx";
import { useAuthSession } from "../auth/AuthSessionProvider.jsx";
import { getPasswordPolicyError, passwordRuleText } from "../lib/passwordPolicy.js";

const emptyForm = {
  email: "",
  password: "",
  newPassword: "",
  resetCode: ""
};

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function getFriendlyAuthError(error, fallback) {
  const name = error?.name || "";

  if (name === "NotAuthorizedException") {
    return "That email and password did not match. Check the password or reset it below.";
  }

  if (name === "UserNotFoundException") {
    return "No Line Up account was found for that email. If you were invited, use the same email from your invite.";
  }

  if (name === "UserNotConfirmedException") {
    return "This account still needs email confirmation before signing in.";
  }

  if (name === "InvalidPasswordException") {
    return "Use at least 8 characters with an uppercase letter, lowercase letter, number, and symbol.";
  }

  if (name === "CodeMismatchException") {
    return "That reset code is not correct. Check the latest email and try again.";
  }

  if (name === "ExpiredCodeException") {
    return "That reset code has expired. Request a new password reset email.";
  }

  return error?.message || fallback;
}

function getSignedInDestination(authSession, returnTo) {
  if (authSession.platformRole) return "/platform";
  return returnTo || "/manager";
}

async function getFreshSignInDestination(returnTo) {
  const session = await fetchAuthSession({ forceRefresh: true });
  const groups = session.tokens?.accessToken?.payload?.["cognito:groups"] || [];

  if (Array.isArray(groups) && groups.some((group) => group === "lineup-platform-owners" || group === "lineup-platform-developers")) {
    return "/platform";
  }

  return returnTo || "/manager";
}

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const amplifySetup = useAmplifySetup();
  const authSession = useAuthSession();
  const returnTo = location.state?.from || "/manager";
  const [form, setForm] = useState(emptyForm);
  const [phase, setPhase] = useState("signIn");
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (authSession.status === "authenticated") {
      navigate(getSignedInDestination(authSession, returnTo), { replace: true });
    }
  }, [authSession.status, authSession.platformRole, returnTo]);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  }

  async function finishSuccessfulSignIn() {
    await authSession.refreshSession();
    navigate(await getFreshSignInDestination(returnTo), { replace: true });
  }

  async function submitSignIn(event) {
    event.preventDefault();
    setIsWorking(true);
    setMessage("");

    try {
      const result = await signIn({
        username: normalizeEmail(form.email),
        password: form.password
      });

      if (result.isSignedIn) {
        await finishSuccessfulSignIn();
        return;
      }

      if (result.nextStep?.signInStep === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED") {
        setPhase("newPassword");
        setMessage("Create a permanent password to finish setting up this account.");
        return;
      }

      setMessage("This sign-in needs another step. Try resetting your password or contact Line Up support.");
    } catch (error) {
      setMessage(getFriendlyAuthError(error, "Could not sign in."));
    } finally {
      setIsWorking(false);
    }
  }

  async function submitNewPassword(event) {
    event.preventDefault();
    setIsWorking(true);
    setMessage("");

    try {
      const passwordError = getPasswordPolicyError(form.newPassword);
      if (passwordError) {
        setMessage(passwordError);
        return;
      }

      const result = await confirmSignIn({
        challengeResponse: form.newPassword
      });

      if (!result.isSignedIn) {
        setMessage("Your password was accepted, but sign-in still needs another step. Contact Line Up support.");
        return;
      }

      await finishSuccessfulSignIn();
    } catch (error) {
      setMessage(getFriendlyAuthError(error, "Could not set the new password."));
    } finally {
      setIsWorking(false);
    }
  }

  async function submitResetRequest(event) {
    event.preventDefault();
    setIsWorking(true);
    setMessage("");

    try {
      await resetPassword({
        username: normalizeEmail(form.email)
      });

      setPhase("confirmReset");
      setMessage("Check your email for the password reset code.");
    } catch (error) {
      setMessage(getFriendlyAuthError(error, "Could not send a password reset email."));
    } finally {
      setIsWorking(false);
    }
  }

  async function submitResetConfirmation(event) {
    event.preventDefault();
    setIsWorking(true);
    setMessage("");

    try {
      const passwordError = getPasswordPolicyError(form.newPassword);
      if (passwordError) {
        setMessage(passwordError);
        return;
      }

      await confirmResetPassword({
        username: normalizeEmail(form.email),
        confirmationCode: form.resetCode.trim(),
        newPassword: form.newPassword
      });

      setPhase("signIn");
      setForm((currentForm) => ({
        ...currentForm,
        password: "",
        newPassword: "",
        resetCode: ""
      }));
      setMessage("Password updated. Sign in with your new password.");
    } catch (error) {
      setMessage(getFriendlyAuthError(error, "Could not update the password."));
    } finally {
      setIsWorking(false);
    }
  }

  function startReset() {
    setPhase("reset");
    setMessage("");
  }

  function backToSignIn() {
    setPhase("signIn");
    setMessage("");
  }

  if (amplifySetup.status === "loading" || authSession.status === "checking") {
    return (
      <section className="page-section narrow-page">
        <div className="empty-panel">Checking your secure login...</div>
      </section>
    );
  }

  if (authSession.status === "authenticated") {
    return <Navigate to={getSignedInDestination(authSession, returnTo)} replace />;
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
          <p>Please try again shortly. If the problem continues, contact Line Up support.</p>
        </div>
      ) : null}

      {message ? <p className="form-message page-message">{message}</p> : null}

      {amplifySetup.status !== "missing" && phase === "signIn" ? (
        <form className="form-card" onSubmit={submitSignIn}>
          <h2>Welcome back</h2>
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={updateForm} required />
          </label>
          <label>
            Password
            <input name="password" type="password" value={form.password} onChange={updateForm} required />
          </label>
          <button className="primary-button full-width" type="submit" disabled={isWorking}>
            {isWorking ? "Signing in..." : "Sign In"}
          </button>
          <button className="secondary-button full-width" type="button" onClick={startReset}>
            Forgot password?
          </button>
          <p className="helper-text">
            New to Line Up? Use your invite link, or <Link to="/trial">start a restaurant workspace</Link>.
          </p>
        </form>
      ) : null}

      {phase === "newPassword" ? (
        <form className="form-card" onSubmit={submitNewPassword}>
          <h2>Create your permanent password</h2>
          <p className="helper-text">
            This happens when you sign in with a temporary password for the first time.
          </p>
          <label>
            New password
            <input name="newPassword" type="password" value={form.newPassword} onChange={updateForm} required />
            <span className="helper-text">{passwordRuleText}</span>
          </label>
          <button className="primary-button full-width" type="submit" disabled={isWorking}>
            {isWorking ? "Saving..." : "Save Password and Continue"}
          </button>
          <button className="secondary-button full-width" type="button" onClick={backToSignIn}>
            Back to sign in
          </button>
        </form>
      ) : null}

      {phase === "reset" ? (
        <form className="form-card" onSubmit={submitResetRequest}>
          <h2>Reset your password</h2>
          <p className="helper-text">Enter your account email and we will send a reset code.</p>
          <label>
            Email
            <input name="email" type="email" value={form.email} onChange={updateForm} required />
          </label>
          <button className="primary-button full-width" type="submit" disabled={isWorking}>
            {isWorking ? "Sending..." : "Send Reset Code"}
          </button>
          <button className="secondary-button full-width" type="button" onClick={backToSignIn}>
            Back to sign in
          </button>
        </form>
      ) : null}

      {phase === "confirmReset" ? (
        <form className="form-card" onSubmit={submitResetConfirmation}>
          <h2>Enter reset code</h2>
          <p className="helper-text">Use the code sent to {form.email}, then choose a new password.</p>
          <label>
            Reset code
            <input name="resetCode" value={form.resetCode} onChange={updateForm} required />
          </label>
          <label>
            New password
            <input name="newPassword" type="password" value={form.newPassword} onChange={updateForm} required />
            <span className="helper-text">{passwordRuleText}</span>
          </label>
          <button className="primary-button full-width" type="submit" disabled={isWorking}>
            {isWorking ? "Updating..." : "Update Password"}
          </button>
          <button className="secondary-button full-width" type="button" onClick={backToSignIn}>
            Back to sign in
          </button>
        </form>
      ) : null}
    </section>
  );
}
