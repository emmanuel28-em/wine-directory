import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { listCollectionsForRestaurant, saveCollection } from "../lib/collections.js";
import { listQuizzesForRestaurant } from "../lib/quizzes.js";
import { listTeamMembersForRestaurant } from "../lib/settings.js";
import { listTrainingDocsForRestaurant } from "../lib/trainingDocs.js";

const starterCategories = [
  { name: "Current Menu", description: "Current dishes and menu descriptions.", categoryType: "foodMenu" },
  { name: "Wine", description: "BTG, pairing, and bottle training.", categoryType: "wine" },
  { name: "Cocktails", description: "Current cocktail specs and talking points.", categoryType: "cocktail" },
  { name: "Service Standards", description: "Steps of service and hospitality expectations.", categoryType: "service" },
  { name: "Opening & Closing", description: "Opening, closing, and sidework procedures.", categoryType: "sop" },
  { name: "New Hire Onboarding", description: "The first material every new team member studies.", categoryType: "onboarding" }
];

export default function ManagerOnboardingPage() {
  const workspace = useCurrentWorkspace();
  const [collections, setCollections] = useState([]);
  const [docs, setDocs] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState(starterCategories.map((category) => category.name));
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");

  async function loadProgress() {
    if (workspace.status !== "ready") {
      return;
    }

    const restaurantId = workspace.restaurant.id;
    const [nextCollections, nextDocs, nextMembers, nextQuizzes] = await Promise.all([
      listCollectionsForRestaurant(restaurantId),
      listTrainingDocsForRestaurant(restaurantId),
      listTeamMembersForRestaurant(restaurantId),
      listQuizzesForRestaurant(restaurantId)
    ]);

    setCollections(nextCollections);
    setDocs(nextDocs);
    setTeamMembers(nextMembers);
    setQuizzes(nextQuizzes);
  }

  useEffect(() => {
    if (workspace.status === "ready") {
      loadProgress().catch((error) => setMessage(error.message || "Could not load setup progress."));
    }
  }, [workspace.status, workspace.restaurant?.id]);

  const steps = useMemo(
    () => [
      {
        title: "Organize the library",
        detail: collections.length > 0 ? `${collections.length} Training Categories created.` : "Choose the sections this restaurant needs.",
        complete: collections.length > 0,
        to: "#starter-categories",
        action: "Choose Categories"
      },
      {
        title: "Add real training material",
        detail: docs.length > 0 ? `${docs.length} Training Pages added.` : "Paste menu notes or create the first page.",
        complete: docs.length > 0,
        to: "/manager/import",
        action: "Import Material"
      },
      {
        title: "Invite the team",
        detail: teamMembers.length > 1 ? `${teamMembers.length} active team members.` : "Invite one manager or staff member to test access.",
        complete: teamMembers.length > 1,
        to: "/manager/invite-team",
        action: "Invite Team"
      },
      {
        title: "Check readiness",
        detail: quizzes.some((quiz) => quiz.isPublished) ? "A staff quiz is published." : "Create and publish one short quiz.",
        complete: quizzes.some((quiz) => quiz.isPublished),
        to: "/manager/quizzes",
        action: "Create Quiz"
      }
    ],
    [collections, docs, teamMembers, quizzes]
  );
  const completedCount = steps.filter((step) => step.complete).length;

  function toggleCategory(name) {
    setSelectedCategories((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name]
    );
  }

  async function createStarterCategories() {
    if (workspace.status !== "ready") {
      return;
    }

    const existingNames = new Set(collections.map((collection) => collection.name.trim().toLowerCase()));
    const toCreate = starterCategories.filter(
      (category) => selectedCategories.includes(category.name) && !existingNames.has(category.name.toLowerCase())
    );

    if (toCreate.length === 0) {
      setMessage("Those Training Categories already exist, or none are selected.");
      return;
    }

    setIsWorking(true);
    setMessage("");

    try {
      for (const [index, category] of toCreate.entries()) {
        await saveCollection({
          collection: {
            ...category,
            status: "active",
            sortOrder: String(collections.length + index)
          },
          restaurantId: workspace.restaurant.id,
          userProfileId: workspace.userProfile.id,
          editingCollectionId: null
        });
      }

      await loadProgress();
      setMessage(`${toCreate.length} Training Categor${toCreate.length === 1 ? "y was" : "ies were"} created.`);
    } catch (error) {
      setMessage(error.message || "Could not create the starter categories.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Workspace setup</p>
          <h1>Set up {workspace.restaurant?.name || "your restaurant"}</h1>
          <p>Start small: organize the library, add real material, invite one person, and test one quiz.</p>
        </div>
        <Link className="secondary-button" to="/manager">
          Dashboard
        </Link>
      </div>

      {message ? <p className="form-message page-message">{message}</p> : null}

      <section className="onboarding-progress-card">
        <div>
          <p className="eyebrow">Setup progress</p>
          <h2>{completedCount} of {steps.length} steps complete</h2>
        </div>
        <div className="progress-track" aria-label={`${completedCount} of ${steps.length} setup steps complete`}>
          <span style={{ width: `${(completedCount / steps.length) * 100}%` }} />
        </div>
      </section>

      <div className="onboarding-step-list">
        {steps.map((step, index) => (
          <article className={`onboarding-step-card ${step.complete ? "is-complete" : ""}`} key={step.title}>
            <span className="onboarding-step-number">{step.complete ? "Done" : index + 1}</span>
            <div>
              <h2>{step.title}</h2>
              <p>{step.detail}</p>
            </div>
            <Link className="secondary-button" to={step.to}>
              {step.complete ? "Review" : step.action}
            </Link>
          </article>
        ))}
      </div>

      <section className="operator-section" id="starter-categories">
        <div className="operator-section-heading">
          <div>
            <p className="eyebrow">Step 1</p>
            <h2>Choose starter Training Categories</h2>
            <p>Use the restaurant's own language. You can rename, archive, or add categories later.</p>
          </div>
        </div>

        <div className="starter-category-grid">
          {starterCategories.map((category) => {
            const exists = collections.some((collection) => collection.name.toLowerCase() === category.name.toLowerCase());
            const selected = selectedCategories.includes(category.name);

            return (
              <label className={`starter-category-option ${selected || exists ? "is-selected" : ""}`} key={category.name}>
                <input
                  type="checkbox"
                  checked={selected || exists}
                  disabled={exists}
                  onChange={() => toggleCategory(category.name)}
                />
                <span>
                  <strong>{category.name}</strong>
                  <small>{exists ? "Already created" : category.description}</small>
                </span>
              </label>
            );
          })}
        </div>

        <button className="primary-button" type="button" onClick={createStarterCategories} disabled={isWorking}>
          {isWorking ? "Creating..." : "Create Selected Categories"}
        </button>
      </section>

      {completedCount === steps.length ? (
        <section className="success-panel">
          <p className="eyebrow">Ready for a staff test</p>
          <h2>The core workspace is set up.</h2>
          <p>Review the staff Training Library, then invite a small pilot group before opening access to the full team.</p>
          <Link className="primary-button" to="/training-library">
            Preview Training Library
          </Link>
        </section>
      ) : null}
    </section>
  );
}

