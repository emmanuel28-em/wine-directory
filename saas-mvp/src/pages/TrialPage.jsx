import { confirmSignUp, getCurrentUser, signIn, signUp } from "aws-amplify/auth";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthSession } from "../auth/AuthSessionProvider.jsx";
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
      navigate("/manager", { replace: true });
    } catch (error) {
      setMessage(error.message || "Could not create the trial workspace.");
    } finally {
      setIsWorking(false);
    }
  }

  async function signInAndCreateWorkspace() {
    const signInResult = await signIn({
      username: form.email,
      password: form.password
    });

    if (!signInResult.isSignedIn) {
      throw new Error("Sign in needs another step before the workspace can be created.");
    }

    const user = await getCurrentUser();

    await createTrialWorkspace({
      user,
      restaurantName: form.restaurantName,
      managerName: getAccountOwnerName(form),
      email: form.email,
      ownerTitle: form.ownerTitle,
      restaurantAddress: form.restaurantAddress,
      restaurantWebsite: form.restaurantWebsite
    });

    await authSession.refreshSession();
    navigate("/manager", { replace: true });
  }

  async function startTrial(event) {
    event.preventDefault();
    setIsWorking(true);
    setMessage("");

    try {
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

      await signInAndCreateWorkspace();
    } catch (error) {
      setMessage(error.message || "Could not start the trial.");
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

      await signInAndCreateWorkspace();
    } catch (error) {
      setMessage(error.message || "Could not confirm the account.");
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
          <p className="eyebrow">Free trial</p>
          <h1>Create a restaurant workspace</h1>
          <p>
            You are already signed in. Create the restaurant workspace for this account,
            or log out first if you want to use a different email.
          </p>
        </div>

        <form className="form-card" onSubmit={createWorkspaceForSignedInUser}>
          <h2>Account Owner Info</h2>

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

          <h2>Restaurant Info</h2>

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
            <p>Payment will be handled securely through Stripe later. Line Up does not store credit card information.</p>
          </div>

          <button className="primary-button full-width" type="submit" disabled={isWorking}>
            {isWorking ? "Creating workspace..." : "Create Workspace"}
          </button>

          {message ? <p className="form-message">{message}</p> : null}
        </form>
      </section>
    );
  }

  return (
    <section className="page-section narrow-page">
      <div className="section-heading">
        <p className="eyebrow">Free trial</p>
        <h1>Start your restaurant training workspace</h1>
        <p>
          Start with a 30-day free trial. Create your account owner login and restaurant workspace.
        </p>
      </div>

      {phase === "signup" ? (
        <form className="form-card" onSubmit={startTrial}>
          <h2>Account Owner Info</h2>

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
          </label>

          <h2>Restaurant Info</h2>

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
            <p>Payment will be handled securely through Stripe later. Line Up does not store credit card information.</p>
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
            creating the trial workspace.
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
