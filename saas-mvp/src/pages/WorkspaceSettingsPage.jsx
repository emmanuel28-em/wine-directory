import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatRole, useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { listInvitesForRestaurant, makeInviteLink } from "../lib/invites.js";
import { canInviteRole, isAdminOrManager, isOwner } from "../lib/permissions.js";
import {
  canChangeMemberRole,
  canDisableMember,
  disableMember,
  getRestaurantLogoUrl,
  listTeamMembersForRestaurant,
  revokeInvite,
  updateCurrentUserName,
  updateMemberRole,
  updateRestaurantProfile,
  uploadRestaurantLogo
} from "../lib/settings.js";

const roleOptions = ["admin", "manager", "staff"];

const emptyRestaurantForm = {
  name: "",
  address: "",
  city: "",
  website: "",
  primaryContactName: "",
  primaryContactEmail: ""
};

function formatDate(value) {
  if (!value) {
    return "Not set";
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function getUserEmail(user, profile) {
  return profile?.email || user?.signInDetails?.loginId || user?.username || "Not available";
}

export default function WorkspaceSettingsPage() {
  const workspace = useCurrentWorkspace();
  const [restaurantForm, setRestaurantForm] = useState(emptyRestaurantForm);
  const [teamMembers, setTeamMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [logoFile, setLogoFile] = useState(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");

  const canEditRestaurant = isOwner(workspace.role) || workspace.role === "admin";
  const pendingInvites = invites.filter((invite) => invite.status === "pending");

  function fillRestaurantForm(restaurant) {
    setRestaurantForm({
      name: restaurant?.name || "",
      address: restaurant?.address || "",
      city: restaurant?.city || "",
      website: restaurant?.website || "",
      primaryContactName: restaurant?.primaryContactName || "",
      primaryContactEmail: restaurant?.primaryContactEmail || ""
    });
  }

  async function loadSettings() {
    if (workspace.status !== "ready") {
      return;
    }

    setMessage("");

    try {
      fillRestaurantForm(workspace.restaurant);
      setDisplayName(workspace.userProfile?.name || "");

      const [members, restaurantInvites, nextLogoUrl] = await Promise.all([
        listTeamMembersForRestaurant(workspace.restaurant.id),
        listInvitesForRestaurant(workspace.restaurant.id),
        getRestaurantLogoUrl(workspace.restaurant)
      ]);

      setTeamMembers(members);
      setInvites(restaurantInvites);
      setLogoUrl(nextLogoUrl);
    } catch (error) {
      setMessage(error.message || "Could not load workspace settings.");
    }
  }

  useEffect(() => {
    loadSettings();
  }, [workspace.status, workspace.restaurant?.id, workspace.restaurant?.logoStorageKey]);

  function updateRestaurantForm(event) {
    const { name, value } = event.target;
    setRestaurantForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  }

  async function saveRestaurantProfile(event) {
    event.preventDefault();

    if (!canEditRestaurant) {
      setMessage("Only Account Owners and Admins can edit the restaurant profile.");
      return;
    }

    setIsWorking(true);
    setMessage("");

    try {
      await updateRestaurantProfile({
        restaurantId: workspace.restaurant.id,
        form: restaurantForm
      });
      await workspace.reloadWorkspace();
      setMessage("Restaurant profile updated.");
    } catch (error) {
      setMessage(error.message || "Could not update restaurant profile.");
    } finally {
      setIsWorking(false);
    }
  }

  async function saveLogo(event) {
    event.preventDefault();

    if (!canEditRestaurant) {
      setMessage("Only Account Owners and Admins can upload a logo.");
      return;
    }

    setIsWorking(true);
    setMessage("");

    try {
      const restaurant = await uploadRestaurantLogo({
        restaurantId: workspace.restaurant.id,
        file: logoFile
      });
      setLogoFile(null);
      setLogoUrl(await getRestaurantLogoUrl(restaurant));
      await workspace.reloadWorkspace();
      setMessage("Restaurant logo uploaded.");
    } catch (error) {
      setMessage(error.message || "Could not upload logo.");
    } finally {
      setIsWorking(false);
    }
  }

  async function changeRole(member, nextRole) {
    setIsWorking(true);
    setMessage("");

    try {
      await updateMemberRole({
        restaurantId: workspace.restaurant.id,
        currentRole: workspace.role,
        membershipId: member.membership.id,
        nextRole
      });
      await loadSettings();
      setMessage("Team member role updated.");
    } catch (error) {
      setMessage(error.message || "Could not update member role.");
    } finally {
      setIsWorking(false);
    }
  }

  async function disableTeamMember(member) {
    const shouldDisable = window.confirm(`Disable access for ${member.profile?.name || member.profile?.email || "this member"}?`);

    if (!shouldDisable) {
      return;
    }

    setIsWorking(true);
    setMessage("");

    try {
      await disableMember({
        restaurantId: workspace.restaurant.id,
        currentRole: workspace.role,
        currentMembershipId: workspace.membership.id,
        membershipId: member.membership.id
      });
      await loadSettings();
      setMessage("Team member access disabled.");
    } catch (error) {
      setMessage(error.message || "Could not disable this member.");
    } finally {
      setIsWorking(false);
    }
  }

  async function copyInviteLink(invite) {
    await navigator.clipboard.writeText(makeInviteLink(invite.inviteToken));
    setMessage("Invite link copied.");
  }

  async function revokePendingInvite(invite) {
    setIsWorking(true);
    setMessage("");

    try {
      await revokeInvite({
        restaurantId: workspace.restaurant.id,
        invite
      });
      await loadSettings();
      setMessage("Invite revoked.");
    } catch (error) {
      setMessage(error.message || "Could not revoke invite.");
    } finally {
      setIsWorking(false);
    }
  }

  async function saveDisplayName(event) {
    event.preventDefault();
    setIsWorking(true);
    setMessage("");

    try {
      await updateCurrentUserName({
        userProfileId: workspace.userProfile.id,
        name: displayName
      });
      await workspace.reloadWorkspace();
      setMessage("Display name updated.");
    } catch (error) {
      setMessage(error.message || "Could not update display name.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Workspace Settings</h1>
          <p>Manage restaurant details, team access, pending invites, and your account profile.</p>
        </div>
        <Link className="secondary-button" to="/manager/invite-team">
          Invite Team
        </Link>
      </div>

      {message ? <p className="form-message page-message">{message}</p> : null}
      {workspace.isLoading || isWorking ? <div className="empty-panel">Working...</div> : null}

      {workspace.status === "ready" ? (
        <>
          <section className="operator-section">
            <div className="operator-section-heading">
              <div>
                <p className="eyebrow">Restaurant Profile</p>
                <h2>{workspace.restaurant.name}</h2>
                <p>Status: {workspace.restaurant.status || "trial"} · Plan: {workspace.restaurant.plan || "trial"} · Trial ends: {formatDate(workspace.restaurant.trialEndsAt)}</p>
              </div>
            </div>

            <div className="content-manager-grid">
              <form className="form-card" onSubmit={saveRestaurantProfile}>
                <h3>Restaurant Details</h3>

                <label>
                  Restaurant name
                  <input name="name" value={restaurantForm.name} onChange={updateRestaurantForm} disabled={!canEditRestaurant} required />
                </label>

                <label>
                  Restaurant address / city
                  <input name="address" value={restaurantForm.address} onChange={updateRestaurantForm} disabled={!canEditRestaurant} />
                </label>

                <label>
                  City
                  <input name="city" value={restaurantForm.city} onChange={updateRestaurantForm} disabled={!canEditRestaurant} />
                </label>

                <label>
                  Website
                  <input name="website" value={restaurantForm.website} onChange={updateRestaurantForm} disabled={!canEditRestaurant} />
                </label>

                <label>
                  Primary contact name
                  <input name="primaryContactName" value={restaurantForm.primaryContactName} onChange={updateRestaurantForm} disabled={!canEditRestaurant} />
                </label>

                <label>
                  Primary contact email
                  <input name="primaryContactEmail" type="email" value={restaurantForm.primaryContactEmail} onChange={updateRestaurantForm} disabled={!canEditRestaurant} />
                </label>

                {canEditRestaurant ? (
                  <button className="primary-button full-width" type="submit" disabled={isWorking}>
                    Save Restaurant Profile
                  </button>
                ) : (
                  <p className="helper-text">Managers can view profile details. Account Owners and Admins can edit them.</p>
                )}
              </form>

              <form className="form-card" onSubmit={saveLogo}>
                <h3>Restaurant Logo</h3>

                {logoUrl ? (
                  <img className="workspace-logo-preview" src={logoUrl} alt={`${workspace.restaurant.name} logo`} />
                ) : (
                  <p className="empty-panel">Upload a logo to personalize this workspace.</p>
                )}

                {canEditRestaurant ? (
                  <>
                    <label>
                      Upload logo
                      <input type="file" accept="image/*" onChange={(event) => setLogoFile(event.target.files?.[0] || null)} />
                    </label>
                    <button className="secondary-button full-width" type="submit" disabled={isWorking || !logoFile}>
                      Upload Logo
                    </button>
                  </>
                ) : (
                  <p className="helper-text">Only Account Owners and Admins can upload a logo.</p>
                )}
              </form>
            </div>
          </section>

          <section className="operator-section">
            <div className="operator-section-heading">
              <div>
                <p className="eyebrow">Team Management</p>
                <h2>Team Members</h2>
                <p>Manage active access for this restaurant workspace.</p>
              </div>
            </div>

            {teamMembers.length === 0 ? (
              <p className="empty-panel">This workspace has no team members yet.</p>
            ) : (
              <div className="operator-table">
                {teamMembers.map((member) => {
                  const canEditRole = canChangeMemberRole({
                    currentRole: workspace.role,
                    targetMembership: member.membership,
                    nextRole: "staff"
                  });
                  const canDisable = canDisableMember({
                    currentRole: workspace.role,
                    currentMembershipId: workspace.membership.id,
                    targetMembership: member.membership
                  });

                  return (
                    <article className="operator-table-row progress-row" key={member.membership.id}>
                      <div>
                        <h4>{member.profile?.name || "Team Member"}</h4>
                        <p>{member.profile?.email || "No email found"}</p>
                      </div>
                      <div>
                        <h4>{formatRole(member.membership.role)}</h4>
                        <p>Status: {member.membership.status || "active"}</p>
                      </div>
                      <div>
                        <h4>Date joined</h4>
                        <p>{formatDate(member.membership.createdAt)}</p>
                      </div>
                      <div className="card-actions">
                        {canEditRole ? (
                          <select value={member.membership.role} onChange={(event) => changeRole(member, event.target.value)} disabled={isWorking}>
                            {roleOptions.map((role) => (
                              <option key={role} value={role}>
                                {formatRole(role)}
                              </option>
                            ))}
                          </select>
                        ) : null}
                        {canDisable && member.membership.status !== "disabled" ? (
                          <button className="quiet-danger-button" type="button" onClick={() => disableTeamMember(member)}>
                            Disable
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="operator-section">
            <div className="operator-section-heading">
              <div>
                <p className="eyebrow">Pending Invites</p>
                <h2>Invites</h2>
                <p>Manual invite links remain active until accepted, expired, or revoked.</p>
              </div>
              {isAdminOrManager(workspace.role) ? (
                <Link className="secondary-button" to="/manager/invite-team">
                  Create Invite
                </Link>
              ) : null}
            </div>

            {pendingInvites.length === 0 ? (
              <p className="empty-panel">No pending invites.</p>
            ) : (
              <div className="operator-card-list">
                {pendingInvites.map((invite) => (
                  <article className="operator-list-card" key={invite.id}>
                    <div>
                      <span className="type-pill">{formatRole(invite.role)}</span>
                      <h4>{invite.email}</h4>
                      <p>Status: {invite.status} · Expires: {formatDate(invite.expiresAt)}</p>
                    </div>
                    <div className="card-actions">
                      <button className="secondary-button" type="button" onClick={() => copyInviteLink(invite)}>
                        Copy Link
                      </button>
                      {canInviteRole(workspace.role, invite.role) ? (
                        <button className="quiet-danger-button" type="button" onClick={() => revokePendingInvite(invite)}>
                          Revoke
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="operator-section">
            <div className="operator-section-heading">
              <div>
                <p className="eyebrow">Current User Account</p>
                <h2>{workspace.userProfile?.name || "Your Account"}</h2>
                <p>{getUserEmail(workspace.user, workspace.userProfile)} · {formatRole(workspace.role)} · {workspace.restaurant.name}</p>
              </div>
            </div>

            <form className="form-card" onSubmit={saveDisplayName}>
              <label>
                Display name
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
              </label>
              <button className="secondary-button" type="submit" disabled={isWorking}>
                Save Display Name
              </button>
            </form>
          </section>
        </>
      ) : null}
    </section>
  );
}
