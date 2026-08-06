import { confirmSignUp, getCurrentUser, resendSignUpCode, signIn, signUp } from "aws-amplify/auth";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuthSession } from "../auth/AuthSessionProvider.jsx";
import { acceptInviteForUser, getPendingInviteByToken } from "../lib/invites.js";
import { getPasswordPolicyError, passwordRuleText } from "../lib/passwordPolicy.js";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmationCode: ""
};

const roleLabels = {
  admin: "Manager",
  manager: "Manager",
  staff: "Staff"
};

function getSignedInEmail(user) {
  return user?.signInDetails?.loginId || user?.username || "";
}

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const authSession = useAuthSession();
  const token = searchParams.get("token") || "";
  const [form, setForm] = useState(emptyForm);
  const [authMode, setAuthMode] = useState("signup");
  const [phase, setPhase] = useState("entry");
  const [inviteState, setInviteState] = useState({
    status: "idle",
    invite: null,
    restaurant: null,
    message: ""
  });
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");
  const hasStartedAutoAccept = useRef(false);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  }

  async function loadInvite() {
    if (!token || authSession.status !== "authenticated") {
      return;
    }

    setIsWorking(true);
    setMessage("");

    try {
      setInviteState(await getPendingInviteByToken(token));
    } catch (error) {
      setInviteState({
        status: "error",
        invite: null,
        restaurant: null,
        message: error.message || "Could not load this invite."
      });
    } finally {
      setIsWorking(false);
    }
  }

  useEffect(() => {
    loadInvite();
  }, [token, authSession.status, authSession.user?.userId]);

  useEffect(() => {
    hasStartedAutoAccept.current = false;
  }, [token, authSession.user?.userId]);

  async function signInAndRefresh() {
    const result = await signIn({
      username: form.email,
      password: form.password
    });

    if (!result.isSignedIn) {
      throw new Error("Sign in needs another step before the invite can be accepted.");
    }

    await authSession.refreshSession();
  }

  async function createAccount(event) {
    event.preventDefault();
    setIsWorking(true);
    setMessage("");

    try {
      const passwordError = getPasswordPolicyError(form.password);
      if (passwordError) {
        setMessage(passwordError);
        return;
      }

      const result = await signUp({
        username: form.email,
        password: form.password,
        options: {
          userAttributes: {
            email: form.email
          }
        }
      });

      if (result.nextStep.signUpStep === "CONFIRM_SIGN_UP") {
        setPhase("confirm");
        setMessage("Check your email for the confirmation code, then enter it here.");
        return;
      }

      await signInAndRefresh();
    } catch (error) {
      if (error?.name === "UsernameExistsException") {
        setAuthMode("signin");
        setPhase("entry");
        setMessage("An account already exists for this email. Sign in below, or reset your password if you do not remember it.");
        return;
      }

      setMessage(error.message || "Could not create account.");
    } finally {
      setIsWorking(false);
    }
  }

  async function confirmAccount(event) {
    event.preventDefault();
    setIsWorking(true);
    setMessage("");

    try {
      await confirmSignUp({
        username: form.email,
        confirmationCode: form.confirmationCode
      });

      await signInAndRefresh();
    } catch (error) {
      setMessage(error.message || "Could not confirm account.");
    } finally {
      setIsWorking(false);
    }
  }

  async function signInExistingUser(event) {
    event.preventDefault();
    setIsWorking(true);
    setMessage("");

    try {
      await signInAndRefresh();
    } catch (error) {
      if (error?.name === "UserNotConfirmedException") {
        await resendSignUpCode({ username: form.email.trim().toLowerCase() });
        setPhase("confirm");
        setMessage("Your account already exists but still needs confirmation. We sent you a new confirmation code.");
        return;
      }

      setMessage(error.message || "Could not sign in.");
    } finally {
      setIsWorking(false);
    }
  }

  async function acceptInvite() {
    setIsWorking(true);
    setMessage("");

    try {
      const user = await getCurrentUser();
      const result = await acceptInviteForUser({
        invite: inviteState.invite,
        user,
        firstName: form.firstName,
        lastName: form.lastName
      });

      await authSession.refreshSession();

      navigate("/home", { replace: true });
    } catch (error) {
      setMessage(error.message || "Could not accept invite.");
    } finally {
      setIsWorking(false);
    }
  }

  // Joining should feel like one flow. Once a signed-in user has a valid
  // invite, connect the workspace automatically instead of asking them to
  // click a second "accept" button.
  useEffect(() => {
    if (authSession.status !== "authenticated" || inviteState.status !== "ready" || hasStartedAutoAccept.current) {
      return;
    }

    const currentEmail = getSignedInEmail(authSession.user).toLowerCase();
    const requiredEmail = String(inviteState.invite?.email || "").toLowerCase();
    const hasEmailMismatch = !inviteState.invite?.isOpenInvite && requiredEmail && currentEmail !== requiredEmail;

    if (hasEmailMismatch) return;

    hasStartedAutoAccept.current = true;
    acceptInvite();
  }, [authSession.status, authSession.user, inviteState.status, inviteState.invite]);

  if (!token) {
    return (
      <section className="page-section narrow-page">
        <div className="form-card">
          <h1>Invite link is missing.</h1>
          <p>Ask your manager to send you a new invite link.</p>
        </div>
      </section>
    );
  }

  const signedInEmail = getSignedInEmail(authSession.user);
  const inviteEmail = inviteState.invite?.email || form.email;
  const emailMismatch =
    authSession.status === "authenticated" &&
    !inviteState.invite?.isOpenInvite &&
    inviteState.invite?.email &&
    signedInEmail.toLowerCase() !== inviteState.invite.email.toLowerCase();

  return (
    <section className="page-section narrow-page">
      <div className="section-heading">
          <p className="eyebrow">Accept Invite</p>
          <h1>Join your restaurant on Line Up</h1>
          <p>
          Sign in or create an account. Line Up will connect you to the correct restaurant.
          </p>
      </div>

      {message ? <p className="form-message page-message">{message}</p> : null}

      {authSession.status !== "authenticated" ? (
        <form className="form-card" onSubmit={authMode === "signup" ? createAccount : signInExistingUser}>
          <div className="form-button-row">
            <button className={authMode === "signup" ? "primary-button" : "secondary-button"} type="button" onClick={() => setAuthMode("signup")}>
              Create Account
            </button>
            <button className={authMode === "signin" ? "primary-button" : "secondary-button"} type="button" onClick={() => setAuthMode("signin")}>
              Sign In
            </button>
          </div>

          {authMode === "signup" && phase === "entry" ? (
            <>
              <div className="field-pair">
                <label>
                  First name
                  <input name="firstName" value={form.firstName} onChange={updateForm} required />
                </label>

                <label>
                  Last name
                  <input name="lastName" value={form.lastName} onChange={updateForm} required />
                </label>
              </div>
            </>
          ) : null}

          {phase === "confirm" ? (
            <>
              <h2>Confirm Email</h2>
              <p>Enter the confirmation code sent to {form.email}.</p>
              <label>
                Confirmation code
                <input name="confirmationCode" value={form.confirmationCode} onChange={updateForm} required />
              </label>
              <button className="primary-button full-width" type="button" onClick={confirmAccount} disabled={isWorking}>
                {isWorking ? "Confirming..." : "Confirm Account"}
              </button>
            </>
          ) : (
            <>
              <label>
                Email
                <input name="email" type="email" value={form.email} onChange={updateForm} required />
              </label>
              <label>
                Password
                <input name="password" type="password" value={form.password} onChange={updateForm} required />
                {authMode === "signup" ? <span className="helper-text">{passwordRuleText}</span> : null}
              </label>
              <button className="primary-button full-width" type="submit" disabled={isWorking}>
                {isWorking ? "Working..." : authMode === "signup" ? "Create Account" : "Sign In"}
              </button>
              {authMode === "signin" ? (
                <p className="helper-text">
                  Forgot your password? <Link to="/login" state={{ from: `/accept-invite?token=${token}` }}>Reset it here</Link>, then return to this invite.
                </p>
              ) : null}
            </>
          )}
        </form>
      ) : null}

      {authSession.status === "authenticated" ? (
        <div className="form-card">
          {isWorking && inviteState.status === "idle" ? <p>Checking invite...</p> : null}

          {inviteState.status === "ready" ? (
            <>
              <h2>{inviteState.restaurant?.name}</h2>
              <p>
                You were invited as <strong>{roleLabels[inviteState.invite.role]}</strong>.
              </p>
              <p>
                {inviteState.invite.isOpenInvite ? "Signed in as: " : "Invite email: "}
                <strong>{inviteEmail}</strong>
              </p>

              {emailMismatch ? (
                <p className="form-message">
                  You are signed in as {signedInEmail}. Sign out and use {inviteState.invite.email} to accept this invite.
                </p>
              ) : (
                <p className="form-message">Connecting you to the training library...</p>
              )}
            </>
          ) : null}

          {inviteState.status !== "ready" && inviteState.status !== "idle" ? (
            <>
              <h2>Invite unavailable</h2>
              <p>{inviteState.message}</p>
              <Link className="secondary-button full-width" to="/">
                Go Home
              </Link>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
