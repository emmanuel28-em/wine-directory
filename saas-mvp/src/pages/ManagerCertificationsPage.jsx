import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import {
  archiveCertification,
  createCertification,
  getCertificationProgress,
  listCertificationsForRestaurant,
  parseRequiredQuizIds,
  updateCertification
} from "../lib/certifications.js";
import { listQuizAttemptsForRestaurant, listQuizzesForRestaurant } from "../lib/quizzes.js";
import { listTeamMembersForRestaurant } from "../lib/settings.js";

const emptyForm = {
  name: "",
  description: "",
  category: "",
  status: "draft",
  requiredQuizIds: []
};

function formatDateTime(value) {
  if (!value) return "Not completed";

  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export default function ManagerCertificationsPage() {
  const workspace = useCurrentWorkspace();
  const [certifications, setCertifications] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingCertificationId, setEditingCertificationId] = useState("");
  const [selectedCertificationId, setSelectedCertificationId] = useState("");
  const [message, setMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const publishedQuizzes = useMemo(() => quizzes.filter((quiz) => quiz.isPublished), [quizzes]);
  const selectedCertification = certifications.find((certification) => certification.id === selectedCertificationId);

  async function loadCertifications() {
    if (workspace.status !== "ready") return;

    setMessage("");

    try {
      const [nextCertifications, nextQuizzes, nextAttempts, nextMembers] = await Promise.all([
        listCertificationsForRestaurant(workspace.restaurant.id),
        listQuizzesForRestaurant(workspace.restaurant.id),
        listQuizAttemptsForRestaurant(workspace.restaurant.id),
        listTeamMembersForRestaurant(workspace.restaurant.id)
      ]);

      setCertifications(nextCertifications.filter((certification) => certification.status !== "archived"));
      setQuizzes(nextQuizzes);
      setAttempts(nextAttempts);
      setMembers(nextMembers.filter((member) => member.membership?.status === "active"));

      if (!selectedCertificationId && nextCertifications.length) {
        setSelectedCertificationId(nextCertifications.find((certification) => certification.status !== "archived")?.id || "");
      }
    } catch (error) {
      setMessage(error.message || "Could not load certifications.");
    }
  }

  useEffect(() => {
    loadCertifications();
  }, [workspace.status, workspace.restaurant?.id]);

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  }

  function toggleRequiredQuiz(quizId) {
    setForm((currentForm) => {
      const hasQuiz = currentForm.requiredQuizIds.includes(quizId);
      return {
        ...currentForm,
        requiredQuizIds: hasQuiz
          ? currentForm.requiredQuizIds.filter((id) => id !== quizId)
          : [...currentForm.requiredQuizIds, quizId]
      };
    });
  }

  function startEditing(certification) {
    setEditingCertificationId(certification.id);
    setSelectedCertificationId(certification.id);
    setForm({
      name: certification.name || "",
      description: certification.description || "",
      category: certification.category || "",
      status: certification.status || "draft",
      requiredQuizIds: parseRequiredQuizIds(certification.requiredQuizIdsJson)
    });
    setMessage("Editing certification.");
  }

  function resetForm() {
    setEditingCertificationId("");
    setForm(emptyForm);
  }

  async function submitCertification(event) {
    event.preventDefault();

    if (form.requiredQuizIds.length === 0) {
      setMessage("Choose at least one published quiz for this certification.");
      return;
    }

    setIsWorking(true);
    setMessage("");

    try {
      if (editingCertificationId) {
        await updateCertification({
          certificationId: editingCertificationId,
          restaurantId: workspace.restaurant.id,
          userProfileId: workspace.userProfile.id,
          form
        });
        setMessage("Certification updated.");
      } else {
        await createCertification({
          restaurantId: workspace.restaurant.id,
          userProfileId: workspace.userProfile.id,
          form
        });
        setMessage("Certification created.");
      }

      resetForm();
      await loadCertifications();
    } catch (error) {
      setMessage(error.message || "Could not save certification.");
    } finally {
      setIsWorking(false);
    }
  }

  async function removeCertification(certification) {
    setIsWorking(true);
    setMessage("");

    try {
      await archiveCertification({
        certification,
        restaurantId: workspace.restaurant.id
      });
      if (selectedCertificationId === certification.id) setSelectedCertificationId("");
      await loadCertifications();
      setMessage("Certification archived.");
    } catch (error) {
      setMessage(error.message || "Could not archive certification.");
    } finally {
      setIsWorking(false);
    }
  }

  const activeStaffMembers = members.filter((member) => member.membership?.role === "staff");

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Certifications</p>
          <h1>Build Staff Mastery Goals</h1>
          <p>Name the skills your team needs to master, then choose the quizzes that prove they are ready.</p>
        </div>
        <Link className="secondary-button" to="/manager/quizzes">
          Manage Quizzes
        </Link>
      </div>

      {message ? <p className="form-message page-message">{message}</p> : null}

      {workspace.status === "loading" ? <div className="empty-panel">Loading certifications...</div> : null}

      {workspace.status === "empty" || workspace.status === "error" ? (
        <div className="form-card">
          <h2>Restaurant access needed</h2>
          <p>{workspace.message}</p>
        </div>
      ) : null}

      {workspace.status === "ready" ? (
        <>
          <div className="content-manager-grid">
            <form className="form-card" onSubmit={submitCertification}>
              <h2>{editingCertificationId ? "Edit Certification" : "Create Certification"}</h2>

              <label>
                Certification name
                <input
                  name="name"
                  value={form.name}
                  onChange={updateForm}
                  placeholder="Example: BTG Wine Certified"
                  required
                />
              </label>

              <label>
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={updateForm}
                  placeholder="What does this prove the staff member understands?"
                />
              </label>

              <label>
                Category
                <input
                  name="category"
                  value={form.category}
                  onChange={updateForm}
                  placeholder="Wine, Cocktails, Dinner Menu, Service"
                />
              </label>

              <label>
                Visibility
                <select name="status" value={form.status} onChange={updateForm}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </label>

              <fieldset className="checkbox-card-group">
                <legend>Required quizzes</legend>
                {publishedQuizzes.length === 0 ? (
                  <p className="helper-text">Publish at least one quiz before creating a certification.</p>
                ) : (
                  publishedQuizzes.map((quiz) => (
                    <label className="checkbox-card" key={quiz.id}>
                      <input
                        type="checkbox"
                        checked={form.requiredQuizIds.includes(quiz.id)}
                        onChange={() => toggleRequiredQuiz(quiz.id)}
                      />
                      <span>
                        <strong>{quiz.title}</strong>
                        <small>{quiz.category || "Training"} · Passing score {quiz.passingScore || 80}%</small>
                      </span>
                    </label>
                  ))
                )}
              </fieldset>

              <div className="form-button-row">
                <button className="primary-button" type="submit" disabled={isWorking || publishedQuizzes.length === 0}>
                  {isWorking ? "Saving..." : editingCertificationId ? "Save Certification" : "Create Certification"}
                </button>
                {editingCertificationId ? (
                  <button className="secondary-button" type="button" onClick={resetForm}>
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>

            <section className="data-list-panel">
              <div className="data-list-heading">
                <h2>Restaurant Certifications</h2>
                <button className="secondary-button" type="button" onClick={loadCertifications}>
                  Refresh
                </button>
              </div>

              {certifications.length === 0 ? (
                <p className="empty-panel">No certifications yet. Create one after publishing a quiz.</p>
              ) : (
                <div className="operator-card-list">
                  {certifications.map((certification) => {
                    const progress = getCertificationProgress({
                      certification,
                      quizzes,
                      attempts: []
                    });

                    return (
                      <article className="operator-list-card" key={certification.id}>
                        <div>
                          <span className={certification.status === "published" ? "status-badge status-published" : "status-badge status-draft"}>
                            {certification.status === "published" ? "Published" : "Draft"}
                          </span>
                          <h4>{certification.name}</h4>
                          <p>{certification.category || "Training"} · {progress.totalCount} required quizzes</p>
                        </div>
                        <div className="card-actions">
                          <button className="secondary-button" type="button" onClick={() => setSelectedCertificationId(certification.id)}>
                            View Progress
                          </button>
                          <button className="secondary-button" type="button" onClick={() => startEditing(certification)}>
                            Edit
                          </button>
                          <button className="quiet-danger-button" type="button" onClick={() => removeCertification(certification)}>
                            Archive
                          </button>
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
                <p className="eyebrow">Team Mastery</p>
                <h2>{selectedCertification?.name || "Select a certification"}</h2>
                <p>See which staff members have passed every quiz required for this certification.</p>
              </div>
            </div>

            {!selectedCertification ? (
              <p className="empty-panel">Choose a certification to view staff progress.</p>
            ) : activeStaffMembers.length === 0 ? (
              <p className="empty-panel">No staff members yet. Invite staff to begin tracking certifications.</p>
            ) : (
              <div className="operator-table">
                {activeStaffMembers.map((member) => {
                  const staffAttempts = attempts.filter((attempt) => attempt.userProfileId === member.profile?.id);
                  const progress = getCertificationProgress({
                    certification: selectedCertification,
                    quizzes,
                    attempts: staffAttempts
                  });

                  return (
                    <article className="operator-table-row progress-row" key={member.membership.id}>
                      <div>
                        <h4>{member.profile?.name || "Staff Member"}</h4>
                        <p>{member.profile?.email || "No email found"}</p>
                      </div>
                      <div>
                        <span className={progress.earned ? "status-badge status-published" : "status-badge status-draft"}>
                          {progress.earned ? "Certified" : "In Progress"}
                        </span>
                        <p>{progress.completedCount} of {progress.totalCount} quizzes passed</p>
                      </div>
                      <div>
                        <h4>Required quizzes</h4>
                        <p>
                          {progress.requirements
                            .map((requirement) => `${requirement.complete ? "Passed" : "Needs"}: ${requirement.quiz?.title || "Quiz"}`)
                            .join(" · ")}
                        </p>
                      </div>
                      <div>
                        <h4>Last passed</h4>
                        <p>{formatDateTime(progress.requirements.find((requirement) => requirement.attempt)?.attempt?.completedAt)}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}
