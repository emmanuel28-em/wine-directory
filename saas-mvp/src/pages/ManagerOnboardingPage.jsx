import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [collections, setCollections] = useState([]);
  const [docs, setDocs] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedCategoryName, setSelectedCategoryName] = useState(starterCategories[0].name);
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
        detail: collections.length > 0 ? `${collections.length} library sections created.` : "Choose the sections this restaurant needs.",
        complete: collections.length > 0,
        to: "#starter-categories",
        action: "Choose sections"
      },
      {
        title: "Add real training material",
        detail: docs.length > 0 ? `${docs.length} training pages added.` : "Paste menu notes or create the first page.",
        complete: docs.length > 0,
        to: "/manager/import",
        action: "Add training"
      },
      {
        title: "Invite the team",
        detail: teamMembers.length > 1 ? `${teamMembers.length} active team members.` : "Invite one manager or staff member.",
        complete: teamMembers.length > 1,
        to: "/manager/invite-team",
        action: "Invite Team"
      },
      {
        title: "Check readiness",
        detail: quizzes.some((quiz) => quiz.isPublished) ? "A staff quiz is published." : "Create and publish one short knowledge check.",
        complete: quizzes.some((quiz) => quiz.isPublished),
        to: "/manager/quizzes",
        action: "Create Quiz"
      }
    ],
    [collections, docs, teamMembers, quizzes]
  );
  const completedCount = steps.filter((step) => step.complete).length;

  async function createFirstCategoryAndContinue() {
    if (workspace.status !== "ready") {
      return;
    }

    const category = starterCategories.find((item) => item.name === selectedCategoryName);
    if (!category) return;

    setIsWorking(true);
    setMessage("");

    try {
      const existing = collections.find(
        (collection) => collection.name.trim().toLowerCase() === category.name.toLowerCase()
      );
      const savedCategory = existing ||
        (await saveCollection({
          collection: {
            ...category,
            status: "active",
            sortOrder: String(collections.length)
          },
          restaurantId: workspace.restaurant.id,
          userProfileId: workspace.userProfile.id,
          editingCollectionId: null
        }));

      navigate(
        `/manager/import?collection=${encodeURIComponent(savedCategory.id)}&focus=${encodeURIComponent(category.categoryType)}`
      );
    } catch (error) {
      setMessage(error.message || "Could not create the first training area.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Getting started</p>
          <h1>Let’s build your first training area</h1>
          <p>Choose one place to begin. You will paste the material you already use on the next screen.</p>
        </div>
        <Link className="secondary-button" to="/manager">
          Back home
        </Link>
      </div>

      {message ? <p className="form-message page-message">{message}</p> : null}

      <section className="onboarding-progress-card">
        <div>
          <p className="eyebrow">Your progress</p>
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
            <p className="eyebrow">Library sections</p>
            <h2>What do you want to train first?</h2>
            <p>Pick the material that changes most often or matters most before service. You can add every other area later.</p>
          </div>
        </div>

        <div className="starter-category-grid">
          {starterCategories.map((category) => {
            const exists = collections.some((collection) => collection.name.toLowerCase() === category.name.toLowerCase());
            const selected = selectedCategoryName === category.name;

            return (
              <label className={`starter-category-option ${selected || exists ? "is-selected" : ""}`} key={category.name}>
                <input type="radio" name="first-training-area" checked={selected} onChange={() => setSelectedCategoryName(category.name)} />
                <span>
                  <strong>{category.name}</strong>
                  <small>{exists ? `${category.description} This section already exists.` : category.description}</small>
                </span>
              </label>
            );
          })}
        </div>

        <button className="primary-button" type="button" onClick={createFirstCategoryAndContinue} disabled={isWorking}>
          {isWorking ? "Preparing..." : "Continue to import material"}
        </button>
      </section>

      {completedCount === steps.length ? (
        <section className="success-panel">
          <p className="eyebrow">Ready for your team</p>
          <h2>Your training library is ready to use.</h2>
          <p>Preview what staff will see, then invite the people who need access.</p>
          <Link className="primary-button" to="/training-library">
            Preview Training Library
          </Link>
        </section>
      ) : null}
    </section>
  );
}
