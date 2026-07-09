import { useEffect, useMemo, useState } from "react";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { createInvite, listInvitesForRestaurant, makeInviteLink } from "../lib/invites.js";
import { canInviteRole } from "../lib/permissions.js";

const emptyInvite = {
  firstName: "",
  lastName: "",
  email: "",
  role: "staff",
  note: ""
};

const roleLabels = {
  admin: "Admin",
  manager: "Manager",
  staff: "Staff"
};

function getAllowedRoles(currentRole) {
  return ["admin", "manager", "staff"].filter((role) => canInviteRole(currentRole, role));
}

export default function InviteTeamPage() {
  const workspace = useCurrentWorkspace();
  const [invite, setInvite] = useState(emptyInvite);
  const [invites, setInvites] = useState([]);
  const [createdInvite, setCreatedInvite] = useState(null);
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");
  const allowedRoles = useMemo(() => getAllowedRoles(workspace.role), [workspace.role]);

  async function loadInvites() {
    if (workspace.status !== "ready") {
      return;
    }

    try {
      setInvites(await listInvitesForRestaurant(workspace.restaurant.id));
    } catch (error) {
      setMessage(error.message || "Could not load invites.");
    }
  }

  useEffect(() => {
    loadInvites();
  }, [workspace.status, workspace.restaurant?.id]);

  function updateInvite(event) {
    const { name, value } = event.target;
    setInvite((currentInvite) => ({
      ...currentInvite,
      [name]: value
    }));
  }

  async function submitInvite(event) {
    event.preventDefault();

    if (!allowedRoles.includes(invite.role)) {
      setMessage("You do not have permission to invite that role.");
      return;
    }

    setIsWorking(true);
    setMessage("");
    setCreatedInvite(null);

    try {
      const nextInvite = await createInvite({
        restaurantId: workspace.restaurant.id,
        invite,
        invitedBy: workspace.userProfile.id,
        currentRole: workspace.role
      });

      setCreatedInvite(nextInvite);
      setInvite({
        ...emptyInvite,
        role: allowedRoles[0] || "staff"
      });
      await loadInvites();
      setMessage("Invite created. Copy the invite link and send it manually.");
    } catch (error) {
      setMessage(error.message || "Could not create invite.");
    } finally {
      setIsWorking(false);
    }
  }

  async function copyInviteLink(inviteRecord) {
    const link = makeInviteLink(inviteRecord.inviteToken);
    await navigator.clipboard.writeText(link);
    setMessage("Invite link copied.");
  }

  useEffect(() => {
    if (allowedRoles.length && !allowedRoles.includes(invite.role)) {
      setInvite((currentInvite) => ({
        ...currentInvite,
        role: allowedRoles[0]
      }));
    }
  }, [allowedRoles, invite.role]);

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Invite Team</p>
          <h1>Invite your team</h1>
          <p>
            Invite managers, chefs, servers, bartenders, backservers, cooks, or anyone who needs access to this restaurant’s training workspace.
          </p>
        </div>
      </div>

      {message ? <p className="form-message page-message">{message}</p> : null}

      <div className="content-manager-grid">
        <form className="form-card" onSubmit={submitInvite}>
          <h2>Create Invite</h2>

          <div className="field-pair">
            <label>
              First name
              <input name="firstName" value={invite.firstName} onChange={updateInvite} required />
            </label>

            <label>
              Last name
              <input name="lastName" value={invite.lastName} onChange={updateInvite} required />
            </label>
          </div>

          <label>
            Email
            <input name="email" type="email" value={invite.email} onChange={updateInvite} required />
          </label>

          <label>
            Role
            <select name="role" value={invite.role} onChange={updateInvite} required>
              {allowedRoles.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </label>

          <div className="role-explainer">
            <article>
              <h3>Admin / Manager</h3>
              <p>Can help manage training material and view staff readiness.</p>
            </article>
            <article>
              <h3>Staff</h3>
              <p>Can study training material, take quizzes, and track their own progress.</p>
            </article>
          </div>

          {workspace.role !== "owner" ? (
            <p className="helper-text">Only Account Owners can invite another Admin or Manager. Admins and Managers can invite Staff.</p>
          ) : null}

          <label>
            Optional note
            <textarea name="note" value={invite.note} onChange={updateInvite} />
          </label>

          <button className="primary-button full-width" type="submit" disabled={isWorking || allowedRoles.length === 0}>
            {isWorking ? "Creating invite..." : "Create Invite Link"}
          </button>
        </form>

        <section className="data-list-panel">
          <div className="form-card invite-link-panel">
            <h2>Invite Link</h2>
            <p>Email sending is coming soon. For now, copy this invite link and send it manually.</p>

            {createdInvite ? (
              <>
                <code className="invite-link">{makeInviteLink(createdInvite.inviteToken)}</code>
                <button className="secondary-button full-width" type="button" onClick={() => copyInviteLink(createdInvite)}>
                  Copy Invite Link
                </button>
              </>
            ) : (
              <p className="helper-text">Create an invite to generate a link.</p>
            )}
          </div>

          <div className="data-list-panel">
            <div className="data-list-heading">
              <h2>Recent Invites</h2>
              <button className="secondary-button" type="button" onClick={loadInvites} disabled={isWorking}>
                Refresh
              </button>
            </div>

            {invites.length === 0 ? (
              <p className="empty-panel">No invites yet.</p>
            ) : (
              <div className="operator-card-list">
                {invites.map((item) => (
                  <article className="operator-list-card" key={item.id}>
                    <div>
                      <span className="type-pill">{roleLabels[item.role] || item.role}</span>
                      <span className={`status-badge status-${item.status || "pending"}`}>{item.status || "pending"}</span>
                      <h4>{`${item.firstName || ""} ${item.lastName || ""}`.trim() || item.email}</h4>
                      <p>{item.email}</p>
                      <p>Expires: {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : "Not set"}</p>
                    </div>
                    <div className="card-actions">
                      {item.status === "pending" ? (
                        <button className="secondary-button" type="button" onClick={() => copyInviteLink(item)}>
                          Copy Link
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
