import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthSession } from "../auth/AuthSessionProvider.jsx";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { getDataClient } from "../lib/dataClient.js";

const emptyForm = {
  category: "access",
  title: "",
  description: "",
  expectedBehavior: "",
  actualBehavior: ""
};

const categoryLabels = {
  upload: "File upload",
  access: "Staff cannot access something",
  content: "Training content",
  invite: "Team invitation",
  quiz: "Quiz or progress",
  billing: "Billing",
  login: "Login",
  feature_request: "Feature request",
  other: "Something else"
};

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "";
}

export default function ReportIssuePage() {
  const location = useLocation();
  const authSession = useAuthSession();
  const workspace = useCurrentWorkspace();
  const [form, setForm] = useState(emptyForm);
  const [tickets, setTickets] = useState([]);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const originRoute = location.state?.from || "/training-library";

  async function loadMyTickets() {
    if (!authSession.user?.userId) return;
    try {
      const response = await getDataClient().models.SupportTicket.list({
        filter: { reportedByCognitoUserId: { eq: authSession.user.userId } },
        limit: 50
      });
      if (!response.errors?.length) {
        setTickets((response.data || []).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)));
      }
    } catch {
      // Ticket history is helpful but should never block someone from reporting a new issue.
    }
  }

  useEffect(() => {
    loadMyTickets();
  }, [authSession.user?.userId]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitIssue(event) {
    event.preventDefault();
    setMessage("");
    setResult(null);
    setIsSubmitting(true);

    try {
      const browserInfo = JSON.stringify({
        userAgent: navigator.userAgent,
        language: navigator.language,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        capturedAt: new Date().toISOString()
      });
      const response = await getDataClient().mutations.submitSupportTicket({
        restaurantId: workspace.restaurant.id,
        ...form,
        route: originRoute,
        browserInfo
      });
      if (response.errors?.length) throw new Error(response.errors.map((error) => error.message).join(" "));
      if (!response.data?.success) throw new Error(response.data?.error || "Your report could not be sent.");

      setResult(response.data);
      setForm(emptyForm);
      setMessage(`Your report was received. Reference: ${response.data.reference}`);
      await loadMyTickets();
    } catch (error) {
      setMessage(error.message || "Your report could not be sent.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="page-section narrow-page">
      <div className="section-heading">
        <p className="eyebrow">Support</p>
        <h1>Report a problem or request</h1>
        <p>Tell us what happened. Line Up automatically includes safe workspace and browser details to help diagnose it.</p>
      </div>

      {message ? <p className="form-message page-message">{message}</p> : null}
      {result ? (
        <div className="support-result-card">
          <strong>{result.reference}</strong>
          <span className={`severity-badge severity-${result.severity}`}>{result.severity}</span>
          <p>{result.triageSummary}</p>
          <small>{result.alertStatus === "sent" ? "Line Up support was alerted." : "The ticket is saved in Platform Support."}</small>
        </div>
      ) : null}

      <form className="form-card" onSubmit={submitIssue}>
        <label>
          What do you need help with?
          <select value={form.category} onChange={(event) => updateField("category", event.target.value)}>
            {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          Short title
          <input value={form.title} onChange={(event) => updateField("title", event.target.value)} required maxLength={160} placeholder="Staff cannot see the new dinner menu" />
        </label>
        <label>
          What happened?
          <textarea className="large-textarea" value={form.description} onChange={(event) => updateField("description", event.target.value)} required placeholder="Include the steps you took and who is affected." />
        </label>
        <div className="field-pair">
          <label>
            What did you expect?
            <textarea value={form.expectedBehavior} onChange={(event) => updateField("expectedBehavior", event.target.value)} />
          </label>
          <label>
            What happened instead?
            <textarea value={form.actualBehavior} onChange={(event) => updateField("actualBehavior", event.target.value)} />
          </label>
        </div>
        <p className="helper-text">Page being reported: <strong>{originRoute}</strong>. Never include passwords, payment details, or private access codes.</p>
        <div className="form-button-row">
          <button className="primary-button" type="submit" disabled={isSubmitting}>{isSubmitting ? "Sending..." : "Send Report"}</button>
          <Link className="secondary-button" to={originRoute}>Cancel</Link>
        </div>
      </form>

      <section className="setup-steps">
        <div className="section-heading compact-heading">
          <p className="eyebrow">Your Reports</p>
          <h2>Recent support requests</h2>
        </div>
        {tickets.length === 0 ? <div className="empty-panel">You have not submitted any reports yet.</div> : (
          <div className="operator-list">
            {tickets.map((ticket) => (
              <article className="operator-list-card" key={ticket.id}>
                <div>
                  <h4>{ticket.title}</h4>
                  <p>{ticket.reference} · {categoryLabels[ticket.category] || ticket.category} · {formatDate(ticket.createdAt)}</p>
                </div>
                <span className={`severity-badge severity-${ticket.severity}`}>{ticket.status}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
