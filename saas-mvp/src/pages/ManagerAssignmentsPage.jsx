import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import {
  archiveStaffGroup,
  archiveTrainingAssignment,
  createStaffGroup,
  createTrainingAssignment,
  listStaffGroupMembersForRestaurant,
  listStaffGroupsForRestaurant,
  listTrainingAssignmentsForRestaurant,
  updateStaffGroupMembers
} from "../lib/assignments.js";
import { listCertificationsForRestaurant } from "../lib/certifications.js";
import { listQuizzesForRestaurant } from "../lib/quizzes.js";
import { listTeamMembersForRestaurant } from "../lib/settings.js";

const emptyGroupForm = {
  name: "",
  description: "",
  memberIds: []
};

const emptyAssignmentForm = {
  itemType: "quiz",
  itemId: "",
  targetType: "group",
  targetId: "",
  dueDate: "",
  note: ""
};

function memberLabel(member) {
  return member.profile?.name || member.profile?.email || "Team member";
}

function assignmentTargetLabel({ assignment, groups, members }) {
  if (assignment.targetType === "group") {
    return groups.find((group) => group.id === assignment.targetId)?.name || "Group";
  }

  const member = members.find((item) => item.profile?.id === assignment.targetId);
  return member ? memberLabel(member) : "Team member";
}

function assignmentItemLabel({ assignment, quizzes, certifications }) {
  if (assignment.itemType === "quiz") {
    return quizzes.find((quiz) => quiz.id === assignment.itemId)?.title || "Quiz";
  }

  return certifications.find((certification) => certification.id === assignment.itemId)?.name || "Certification";
}

export default function ManagerAssignmentsPage() {
  const workspace = useCurrentWorkspace();
  const [groups, setGroups] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [members, setMembers] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [groupForm, setGroupForm] = useState(emptyGroupForm);
  const [assignmentForm, setAssignmentForm] = useState(emptyAssignmentForm);
  const [editingGroupId, setEditingGroupId] = useState("");
  const [message, setMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const activeStaffMembers = useMemo(
    () => members.filter((member) => member.membership?.status === "active" && member.membership?.role === "staff"),
    [members]
  );
  const activeGroups = useMemo(() => groups.filter((group) => group.status !== "archived"), [groups]);
  const assignableItems = assignmentForm.itemType === "quiz"
    ? quizzes.filter((quiz) => quiz.isPublished)
    : certifications.filter((certification) => certification.status === "published");
  const assignableTargets = assignmentForm.targetType === "group" ? activeGroups : activeStaffMembers;

  async function loadAssignmentsPage() {
    if (workspace.status !== "ready") return;

    setMessage("");

    try {
      const [nextGroups, nextGroupMembers, nextMembers, nextQuizzes, nextCertifications, nextAssignments] = await Promise.all([
        listStaffGroupsForRestaurant(workspace.restaurant.id),
        listStaffGroupMembersForRestaurant(workspace.restaurant.id),
        listTeamMembersForRestaurant(workspace.restaurant.id),
        listQuizzesForRestaurant(workspace.restaurant.id),
        listCertificationsForRestaurant(workspace.restaurant.id),
        listTrainingAssignmentsForRestaurant(workspace.restaurant.id)
      ]);

      setGroups(nextGroups);
      setGroupMembers(nextGroupMembers);
      setMembers(nextMembers);
      setQuizzes(nextQuizzes);
      setCertifications(nextCertifications);
      setAssignments(nextAssignments);
    } catch (error) {
      setMessage(error.message || "Could not load assignments.");
    }
  }

  useEffect(() => {
    loadAssignmentsPage();
  }, [workspace.status, workspace.restaurant?.id]);

  function updateGroupForm(event) {
    const { name, value } = event.target;
    setGroupForm((currentForm) => ({ ...currentForm, [name]: value }));
  }

  function updateAssignmentForm(event) {
    const { name, value } = event.target;
    setAssignmentForm((currentForm) => {
      const resetItem = name === "itemType" ? { itemId: "" } : {};
      const resetTarget = name === "targetType" ? { targetId: "" } : {};
      return { ...currentForm, [name]: value, ...resetItem, ...resetTarget };
    });
  }

  function toggleGroupMember(userProfileId) {
    setGroupForm((currentForm) => ({
      ...currentForm,
      memberIds: currentForm.memberIds.includes(userProfileId)
        ? currentForm.memberIds.filter((id) => id !== userProfileId)
        : [...currentForm.memberIds, userProfileId]
    }));
  }

  function startEditingGroup(group) {
    const memberIds = groupMembers
      .filter((member) => member.staffGroupId === group.id && member.status === "active")
      .map((member) => member.userProfileId);

    setEditingGroupId(group.id);
    setGroupForm({
      name: group.name || "",
      description: group.description || "",
      memberIds
    });
    setMessage(`Editing ${group.name}.`);
  }

  function resetGroupForm() {
    setEditingGroupId("");
    setGroupForm(emptyGroupForm);
  }

  async function submitGroup(event) {
    event.preventDefault();
    setIsWorking(true);
    setMessage("");

    try {
      const selectedMembers = activeStaffMembers
        .filter((member) => groupForm.memberIds.includes(member.profile?.id))
        .map((member) => ({
          userProfileId: member.profile.id,
          membershipId: member.membership.id
        }));

      if (editingGroupId) {
        const group = groups.find((item) => item.id === editingGroupId);
        await updateStaffGroupMembers({
          restaurantId: workspace.restaurant.id,
          group,
          members: selectedMembers
        });
        setMessage("Group members updated.");
      } else {
        await createStaffGroup({
          restaurantId: workspace.restaurant.id,
          userProfileId: workspace.userProfile.id,
          form: {
            ...groupForm,
            members: selectedMembers
          }
        });
        setMessage("Group created.");
      }

      resetGroupForm();
      await loadAssignmentsPage();
    } catch (error) {
      setMessage(error.message || "Could not save group.");
    } finally {
      setIsWorking(false);
    }
  }

  async function submitAssignment(event) {
    event.preventDefault();
    setIsWorking(true);
    setMessage("");

    try {
      await createTrainingAssignment({
        restaurantId: workspace.restaurant.id,
        userProfileId: workspace.userProfile.id,
        form: assignmentForm
      });
      setAssignmentForm(emptyAssignmentForm);
      await loadAssignmentsPage();
      setMessage("Assignment created.");
    } catch (error) {
      setMessage(error.message || "Could not create assignment.");
    } finally {
      setIsWorking(false);
    }
  }

  async function archiveGroup(group) {
    setIsWorking(true);
    setMessage("");

    try {
      await archiveStaffGroup({ restaurantId: workspace.restaurant.id, group });
      await loadAssignmentsPage();
      setMessage("Group archived.");
    } catch (error) {
      setMessage(error.message || "Could not archive group.");
    } finally {
      setIsWorking(false);
    }
  }

  async function archiveAssignment(assignment) {
    setIsWorking(true);
    setMessage("");

    try {
      await archiveTrainingAssignment({ restaurantId: workspace.restaurant.id, assignment });
      await loadAssignmentsPage();
      setMessage("Assignment archived.");
    } catch (error) {
      setMessage(error.message || "Could not archive assignment.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Assignments</p>
          <h1>Assign Training to the Right People</h1>
          <p>Create groups like Server, Captain, Bar Team, or New Hires, then assign quizzes and certifications.</p>
        </div>
        <Link className="secondary-button" to="/manager/staff-progress">
          View Results
        </Link>
      </div>

      {message ? <p className="form-message page-message">{message}</p> : null}

      {workspace.status === "loading" ? <div className="empty-panel">Loading assignments...</div> : null}

      {workspace.status === "empty" || workspace.status === "error" ? (
        <div className="form-card">
          <h2>Restaurant access needed</h2>
          <p>{workspace.message}</p>
        </div>
      ) : null}

      {workspace.status === "ready" ? (
        <>
          <div className="content-manager-grid">
            <form className="form-card" onSubmit={submitGroup}>
              <h2>{editingGroupId ? "Edit Group Members" : "Create Staff Group"}</h2>

              <label>
                Group name
                <input name="name" value={groupForm.name} onChange={updateGroupForm} placeholder="Server, Captain, Bar Team" required disabled={Boolean(editingGroupId)} />
              </label>

              <label>
                Description
                <textarea name="description" value={groupForm.description} onChange={updateGroupForm} placeholder="Who belongs in this group?" disabled={Boolean(editingGroupId)} />
              </label>

              <fieldset className="checkbox-card-group">
                <legend>Group members</legend>
                {activeStaffMembers.length === 0 ? (
                  <p className="helper-text">Invite staff before creating groups.</p>
                ) : (
                  activeStaffMembers.map((member) => (
                    <label className="checkbox-card" key={member.membership.id}>
                      <input
                        type="checkbox"
                        checked={groupForm.memberIds.includes(member.profile?.id)}
                        onChange={() => toggleGroupMember(member.profile?.id)}
                      />
                      <span>
                        <strong>{memberLabel(member)}</strong>
                        <small>{member.profile?.email || "No email found"}</small>
                      </span>
                    </label>
                  ))
                )}
              </fieldset>

              <div className="form-button-row">
                <button className="primary-button" type="submit" disabled={isWorking || activeStaffMembers.length === 0}>
                  {isWorking ? "Saving..." : editingGroupId ? "Save Members" : "Create Group"}
                </button>
                {editingGroupId ? <button className="secondary-button" type="button" onClick={resetGroupForm}>Cancel</button> : null}
              </div>
            </form>

            <section className="data-list-panel">
              <div className="data-list-heading">
                <h2>Staff Groups</h2>
                <button className="secondary-button" type="button" onClick={loadAssignmentsPage}>Refresh</button>
              </div>

              {activeGroups.length === 0 ? (
                <p className="empty-panel">No groups yet. Create groups such as Server, Captain, Bartender, or New Hire.</p>
              ) : (
                <div className="operator-card-list">
                  {activeGroups.map((group) => {
                    const groupMemberCount = groupMembers.filter((member) => member.staffGroupId === group.id && member.status === "active").length;
                    return (
                      <article className="operator-list-card" key={group.id}>
                        <div>
                          <span className="type-pill">Group</span>
                          <h4>{group.name}</h4>
                          <p>{group.description || "No description yet."} · {groupMemberCount} members</p>
                        </div>
                        <div className="card-actions">
                          <button className="secondary-button" type="button" onClick={() => startEditingGroup(group)}>Edit Members</button>
                          <button className="quiet-danger-button" type="button" onClick={() => archiveGroup(group)}>Archive</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <section className="operator-section">
            <div className="operator-section-heading">
              <div>
                <p className="eyebrow">Assign</p>
                <h2>Send training to a group or person</h2>
                <p>Assignments help staff know what matters now for their role, station, or current menu change.</p>
              </div>
            </div>

            <form className="form-card wide-form" onSubmit={submitAssignment}>
              <div className="field-pair">
                <label>
                  Assign
                  <select name="itemType" value={assignmentForm.itemType} onChange={updateAssignmentForm}>
                    <option value="quiz">Quiz</option>
                    <option value="certification">Certification</option>
                  </select>
                </label>

                <label>
                  Training item
                  <select name="itemId" value={assignmentForm.itemId} onChange={updateAssignmentForm} required>
                    <option value="">Choose item</option>
                    {assignableItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {assignmentForm.itemType === "quiz" ? item.title : item.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="field-pair">
                <label>
                  Assign to
                  <select name="targetType" value={assignmentForm.targetType} onChange={updateAssignmentForm}>
                    <option value="group">Group</option>
                    <option value="member">Individual staff member</option>
                  </select>
                </label>

                <label>
                  Target
                  <select name="targetId" value={assignmentForm.targetId} onChange={updateAssignmentForm} required>
                    <option value="">Choose target</option>
                    {assignableTargets.map((target) => (
                      <option key={assignmentForm.targetType === "group" ? target.id : target.profile?.id} value={assignmentForm.targetType === "group" ? target.id : target.profile?.id}>
                        {assignmentForm.targetType === "group" ? target.name : memberLabel(target)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="field-pair">
                <label>
                  Due date optional
                  <input name="dueDate" type="date" value={assignmentForm.dueDate} onChange={updateAssignmentForm} />
                </label>

                <label>
                  Note optional
                  <input name="note" value={assignmentForm.note} onChange={updateAssignmentForm} placeholder="Example: Required before the new menu launches." />
                </label>
              </div>

              <button className="primary-button full-width" type="submit" disabled={isWorking || assignableItems.length === 0 || assignableTargets.length === 0}>
                {isWorking ? "Assigning..." : "Create Assignment"}
              </button>
            </form>
          </section>

          <section className="operator-section">
            <div className="operator-section-heading">
              <div>
                <p className="eyebrow">Active assignments</p>
                <h2>What staff are responsible for</h2>
              </div>
            </div>

            {assignments.filter((assignment) => assignment.status === "active").length === 0 ? (
              <p className="empty-panel">No active assignments yet.</p>
            ) : (
              <div className="operator-card-list">
                {assignments
                  .filter((assignment) => assignment.status === "active")
                  .map((assignment) => (
                    <article className="operator-list-card" key={assignment.id}>
                      <div>
                        <span className="type-pill">{assignment.itemType === "quiz" ? "Quiz" : "Certification"}</span>
                        <h4>{assignmentItemLabel({ assignment, quizzes, certifications })}</h4>
                        <p>
                          Assigned to {assignmentTargetLabel({ assignment, groups, members })}
                          {assignment.dueDate ? ` · Due ${new Date(`${assignment.dueDate}T00:00:00`).toLocaleDateString()}` : ""}
                        </p>
                        {assignment.note ? <p>{assignment.note}</p> : null}
                      </div>
                      <button className="quiet-danger-button" type="button" onClick={() => archiveAssignment(assignment)}>
                        Archive
                      </button>
                    </article>
                  ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}
