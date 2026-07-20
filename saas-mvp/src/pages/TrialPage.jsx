import { confirmSignUp, getCurrentUser, signIn, signUp } from "aws-amplify/auth";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthSession } from "../auth/AuthSessionProvider.jsx";
import { getPasswordPolicyError, passwordRuleText } from "../lib/passwordPolicy.js";
import { createTrialWorkspace } from "../lib/trialWorkspace.js";

const emptyTrialForm = {
  firstName: "",
  lastName: "",
  ownerTitle: "",
  restaurantName: "",
  restaurantAddress: "",
  restaurantWebsite: "",
  email: "",
  password: "",
  confirmationCode: ""
};

const titleOptions = [
  "Owner",
  "CEO / Founder",
  "General Manager",
  "Director of Operations",
  "Beverage Director",
  "Chef / BOH Leadership",
  "FOH Manager",
  "Other"
];

function getAccountOwnerName(form) {
  return `${form.firstName} ${form.lastName}`.trim();
}

function getNormalizedEmail(value) {
  return value.trim().toLowerCase();
}

function getFriendlySignupError(error, fallbackMessage) {
  const errorName = error?.name || "";

  if (errorName === "UsernameExistsException") {
    return "An account already exists for this email. Sign in to continue.";
  }

  if (errorName === "InvalidPasswordException") {
    return "Use at least 8 characters with an uppercase letter, lowercase letter, number, and symbol.";
  }

  if (errorName === "CodeMismatchException") {
    return "That confirmation code is not correct. Check the latest email and try again.";
  }

  if (errorName === "ExpiredCodeException") {
    return "That confirmation code has expired. Return to signup to request a new code.";
  }

  return error?.message || fallbackMessage;
}

export default function TrialPage() {
  const navigate = useNavigate();
  const authSession = useAuthSession();
  const [form, setForm] = useState(emptyTrialForm);
  const [phase, setPhase] = useState("signup");
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  }

  async function createWorkspaceForSignedInUser(event) {
    event.preventDefault();
    setIsWorking(true);
    setMessage("");

    try {
      await createTrialWorkspace({
        user: authSession.user,
        restaurantName: form.restaurantName,
        managerName: getAccountOwnerName(form) || authSession.user?.signInDetails?.loginId || "Account Owner",
        email: authSession.user?.signInDetails?.loginId || form.email,
        ownerTitle: form.ownerTitle,
        restaurantAddress: form.restaurantAddress,
        restaurantWebsite: form.restaurantWebsite
      });

      await authSession.refreshSession();
      navigate("/manager/onboarding", { replace: true });
    } catch (error) {
      setMessage(error.message || "We could not finish setting up your restaurant.");
    } finally {
      setIsWorking(false);
    }
  }

  async function signInAndCreateWorkspace() {
    const signInResult = await signIn({
      username: getNormalizedEmail(form.email),
      password: form.password
    });

    if (!signInResult.isSignedIn) {
      throw new Error("Your sign-in needs one more step before the restaurant can be created.");
    }

    const user = await getCurrentUser();

    await createTrialWorkspace({
      user,
      restaurantName: form.restaurantName,
      managerName: getAccountOwnerName(form),
      email: getNormalizedEmail(form.email),
      ownerTitle: form.ownerTitle,
      restaurantAddress: form.restaurantAddress,
      restaurantWebsite: form.restaurantWebsite
    });

    await authSession.refreshSession();
    navigate("/manager/onboarding", { replace: true });
  }

  async function startTrial(event) {
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
        username: getNormalizedEmail(form.email),
        password: form.password,
        options: {
          userAttributes: {
            email: getNormalizedEmail(form.email)
          }
        }
      });

      if (result.nextStep.signUpStep === "CONFIRM_SIGN_UP") {
        setPhase("confirm");
        setMessage("Check your email for the confirmation code, then enter it here.");
        return;
      }

      await signInAndCreateWorkspace();
    } catch (error) {
      setMessage(getFriendlySignupError(error, "Could not start the trial."));
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
        username: getNormalizedEmail(form.email),
        confirmationCode: form.confirmationCode
      });

      await signInAndCreateWorkspace();
    } catch (error) {
      setMessage(getFriendlySignupError(error, "Could not confirm the account."));
    } finally {
      setIsWorking(false);
    }
  }

  if (authSession.status === "checking") {
    return (
      <section className="page-section narrow-page">
        <div className="empty-panel">Checking your session...</div>
      </section>
    );
  }

  if (authSession.status === "authenticated") {
    return (
      <section className="page-section narrow-page">
        <div className="section-heading">
          <p className="eyebrow">30-day free trial</p>
          <h1>Finish setting up your restaurant</h1>
          <p>
            You are already signed in. Tell us about the restaurant you want to train.
          </p>
        </div>

        <form className="form-card" onSubmit={createWorkspaceForSignedInUser}>
          <h2>About you</h2>

          <div className="field-pair">
            <label>
              First Name
              <input name="firstName" value={form.firstName} onChange={updateForm} required />
            </label>

            <label>
              Last Name
              <input name="lastName" value={form.lastName} onChange={updateForm} required />
            </label>
          </div>

          <label>
            Your Title
            <select name="ownerTitle" value={form.ownerTitle} onChange={updateForm} required>
              <option value="">Select your title</option>
              {titleOptions.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
          </label>

          <h2>About the restaurant</h2>

          <label>
            Restaurant Name
            <input
              name="restaurantName"
              value={form.restaurantName}
              onChange={updateForm}
              required
            />
          </label>

          <label>
            Restaurant Address / City
            <input name="restaurantAddress" value={form.restaurantAddress} onChange={updateForm} required />
          </label>

          <label>
            Website optional
            <input name="restaurantWebsite" value={form.restaurantWebsite} onChange={updateForm} />
          </label>

          <div className="trial-note">
            <strong>30-day free trial.</strong>
            <p>No card is required today. Add a payment method before the trial ends to avoid an interruption.</p>
          </div>

          <button className="primary-button full-width" type="submit" disabled={isWorking}>
            {isWorking ? "Setting up your restaurant..." : "Start free trial"}
          </button>

          {message ? <p className="form-message">{message}</p> : null}
        </form>
      </section>
    );
  }

  return (
    <section className="page-section narrow-page">
      <div className="section-heading">
        <p className="eyebrow">30-day free trial</p>
        <h1>Set up training for your restaurant</h1>
        <p>
          Create your account and tell us about your restaurant. No card is required today.
        </p>
      </div>

      {phase === "signup" ? (
        <form className="form-card" onSubmit={startTrial}>
          <h2>About you</h2>

          <div className="field-pair">
            <label>
              First Name
              <input name="firstName" value={form.firstName} onChange={updateForm} required />
            </label>

            <label>
              Last Name
              <input name="lastName" value={form.lastName} onChange={updateForm} required />
            </label>
          </div>

          <label>
            Work Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={updateForm}
              required
            />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={updateForm}
              required
            />
            <span className="helper-text">{passwordRuleText}</span>
          </label>

          <h2>About the restaurant</h2>

          <label>
            Restaurant Name
            <input name="restaurantName" value={form.restaurantName} onChange={updateForm} required />
          </label>

          <label>
            Restaurant Address / City
            <input name="restaurantAddress" value={form.restaurantAddress} onChange={updateForm} required />
          </label>

          <label>
            Website optional
            <input name="restaurantWebsite" value={form.restaurantWebsite} onChange={updateForm} />
          </label>

          <label>
            Your Title
            <select name="ownerTitle" value={form.ownerTitle} onChange={updateForm} required>
              <option value="">Select your title</option>
              {titleOptions.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
          </label>

          <div className="trial-note">
            <strong>30-day free trial.</strong>
            <p>No card is required today. Add a payment method before the trial ends to avoid an interruption.</p>
          </div>

          <button className="primary-button full-width" type="submit" disabled={isWorking}>
            {isWorking ? "Creating account..." : "Start Free Trial"}
          </button>

          {message ? <p className="form-message">{message}</p> : null}
        </form>
      ) : (
        <form className="form-card" onSubmit={confirmAccount}>
          <h2>Confirm Email</h2>
          <p>
            We sent a confirmation code to <strong>{form.email}</strong>. Enter it to finish
            setting up your restaurant.
          </p>

          <label>
            Confirmation code
            <input
              name="confirmationCode"
              value={form.confirmationCode}
              onChange={updateForm}
              placeholder="123456"
              required
            />
          </label>

          <button className="primary-button full-width" type="submit" disabled={isWorking}>
            {isWorking ? "Confirming..." : "Confirm and Enter Dashboard"}
          </button>

          {message ? <p className="form-message">{message}</p> : null}
        </form>
      )}
    </section>
  );
}
