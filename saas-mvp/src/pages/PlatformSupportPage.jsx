import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getDataClient } from "../lib/dataClient.js";

const severityOrder = { critical: 0, high: 1, normal: 2, low: 3 };

function parseChecks(value) {
  try {
    return JSON.parse(value || "[]");
  } catch {
    return [];
  }
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : "Unknown date";
}

export default function PlatformSupportPage() {
  const [tickets, setTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState("active");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notes, setNotes] = useState({});

  async function loadTickets() {
    setIsLoading(true);
    setMessage("");
    try {
      const response = await getDataClient().models.SupportTicket.list({ limit: 1000 });
      if (response.errors?.length) throw new Error(response.errors.map((error) => error.message).join(" "));
      setTickets((response.data || []).sort((left, right) => {
        const severityDifference = (severityOrder[left.severity] ?? 9) - (severityOrder[right.severity] ?? 9);
        return severityDifference || new Date(right.createdAt) - new Date(left.createdAt);
      }));
    } catch (error) {
      setMessage(error.message || "Support tickets could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  const visibleTickets = useMemo(() => tickets.filter((ticket) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "active") return !["resolved", "closed"].includes(ticket.status);
    return ticket.status === statusFilter;
  }), [tickets, statusFilter]);

  async function updateTicket(ticket, status) {
    setIsSaving(true);
    setMessage("");
    try {
      const response = await getDataClient().models.SupportTicket.update({
        id: ticket.id,
        status,
        resolutionNotes: notes[ticket.id] ?? ticket.resolutionNotes ?? ""
      });
      if (response.errors?.length) throw new Error(response.errors.map((error) => error.message).join(" "));
      setMessage(`${ticket.reference} updated to ${status}.`);
      await loadTickets();
    } catch (error) {
      setMessage(error.message || "The support ticket could not be updated.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Line Up Operations</p>
          <h1>Platform Support</h1>
          <p>Review restaurant problems, diagnostic context, suggested checks, and feature requests.</p>
        </div>
        <Link className="secondary-button" to="/platform">Platform Control</Link>
      </div>

      <div className="dashboard-grid">
        <article className="stat-card"><span>Open</span><h2>{tickets.filter((ticket) => ticket.status === "open").length}</h2><p>New reports waiting for review.</p></article>
        <article className="stat-card"><span>Critical or High</span><h2>{tickets.filter((ticket) => ["critical", "high"].includes(ticket.severity) && !["resolved", "closed"].includes(ticket.status)).length}</h2><p>Prioritize service-blocking problems.</p></article>
        <article className="stat-card"><span>Feature Requests</span><h2>{tickets.filter((ticket) => ticket.category === "feature_request").length}</h2><p>Product feedback captured separately.</p></article>
      </div>

      <div className="content-filter-bar support-filter-bar">
        <label>
          Show tickets
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="active">Active</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="waiting">Waiting</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="all">All</option>
          </select>
        </label>
        <button className="secondary-button" type="button" onClick={loadTickets} disabled={isLoading}>Refresh</button>
      </div>

      {message ? <p className="form-message page-message">{message}</p> : null}
      {isLoading ? <div className="empty-panel">Loading support tickets...</div> : null}
      {!isLoading && visibleTickets.length === 0 ? <div className="empty-panel">No support tickets match this view.</div> : null}

      <div className="support-ticket-list">
        {visibleTickets.map((ticket) => (
          <article className="support-ticket-card" key={ticket.id}>
            <div className="support-ticket-heading">
              <div>
                <div className="support-ticket-meta">
                  <span className={`severity-badge severity-${ticket.severity}`}>{ticket.severity}</span>
                  <span>{ticket.status}</span>
                  <span>{ticket.category?.replace("_", " ")}</span>
                </div>
                <h2>{ticket.title}</h2>
                <p>{ticket.reference} · {ticket.restaurantName} · {formatDate(ticket.createdAt)}</p>
              </div>
              <div className="support-reporter">
                <strong>{ticket.reporterName || ticket.reporterEmail}</strong>
                <span>{ticket.reporterEmail}</span>
                <span>{ticket.reporterRole}</span>
              </div>
            </div>

            <div className="support-ticket-grid">
              <div>
                <h3>What happened</h3>
                <p className="preserve-lines">{ticket.description}</p>
                {ticket.expectedBehavior ? <><h3>Expected</h3><p>{ticket.expectedBehavior}</p></> : null}
                {ticket.actualBehavior ? <><h3>Instead</h3><p>{ticket.actualBehavior}</p></> : null}
              </div>
              <div className="support-triage-panel">
                <h3>Automatic triage</h3>
                <p>{ticket.triageSummary}</p>
                <ul>{parseChecks(ticket.suggestedChecksJson).map((check) => <li key={check}>{check}</li>)}</ul>
                <small>Reported from: {ticket.route || "Unknown page"}</small>
              </div>
            </div>

            <div className="support-resolution-row">
              <label>
                Internal resolution notes
                <textarea value={notes[ticket.id] ?? ticket.resolutionNotes ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [ticket.id]: event.target.value }))} />
              </label>
              <div className="form-button-row">
                <button className="secondary-button" type="button" disabled={isSaving} onClick={() => updateTicket(ticket, "investigating")}>Investigating</button>
                <button className="secondary-button" type="button" disabled={isSaving} onClick={() => updateTicket(ticket, "waiting")}>Waiting</button>
                <button className="primary-button" type="button" disabled={isSaving} onClick={() => updateTicket(ticket, "resolved")}>Resolve</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
