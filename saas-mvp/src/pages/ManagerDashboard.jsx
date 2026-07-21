import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { listTrainingAssignmentsForRestaurant } from "../lib/assignments.js";
import { formatBillingStatus, isTrialExpired } from "../lib/billing.js";
import { listCertificationsForRestaurant } from "../lib/certifications.js";
import { listCollectionsForRestaurant } from "../lib/collections.js";
import { isOwnerOrAdmin } from "../lib/permissions.js";
import { listQuizzesForRestaurant } from "../lib/quizzes.js";
import { listTeamMembersForRestaurant } from "../lib/settings.js";
import { listTrainingDocsForRestaurant } from "../lib/trainingDocs.js";

function formatDate(value) {
  if (!value) return "Not set";

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

const emptyOverview = {
  collections: 0,
  pages: 0,
  publishedPages: 0,
  members: 0,
  quizzes: 0,
  publishedQuizzes: 0,
  certifications: 0,
  assignments: 0
};

export default function ManagerDashboard() {
  const workspace = useCurrentWorkspace();
  const [overview, setOverview] = useState(emptyOverview);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [overviewMessage, setOverviewMessage] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function loadOverview() {
      if (workspace.status !== "ready") return;

      setIsLoadingOverview(true);
      setOverviewMessage("");

      try {
        const restaurantId = workspace.restaurant.id;
        const [collections, pages, members, quizzes, certifications, assignments] = await Promise.all([
          listCollectionsForRestaurant(restaurantId),
          listTrainingDocsForRestaurant(restaurantId),
          listTeamMembersForRestaurant(restaurantId),
          listQuizzesForRestaurant(restaurantId),
          listCertificationsForRestaurant(restaurantId),
          listTrainingAssignmentsForRestaurant(restaurantId)
        ]);

        if (!isCurrent) return;

        setOverview({
          collections: collections.filter((item) => item.status !== "archived").length,
          pages: pages.filter((item) => item.status !== "archived").length,
          publishedPages: pages.filter((item) => item.status === "published").length,
          members: members.filter((item) => item.membership?.status === "active").length,
          quizzes: quizzes.length,
          publishedQuizzes: quizzes.filter((item) => item.isPublished).length,
          certifications: certifications.filter((item) => item.status === "published").length,
          assignments: assignments.filter((item) => item.status === "active").length
        });
      } catch (error) {
        if (isCurrent) setOverviewMessage(error.message || "Your restaurant summary could not be loaded.");
      } finally {
        if (isCurrent) setIsLoadingOverview(false);
      }
    }

    loadOverview();
    return () => {
      isCurrent = false;
    };
  }, [workspace.status, workspace.restaurant?.id]);

  const gettingStartedSteps = useMemo(
    () => [
      {
        title: "Organize your library",
        description: "Choose simple sections such as Dinner Menu, Wine, Cocktails, or Opening Procedures.",
        complete: overview.collections > 0,
        to: "/manager/onboarding",
        action: "Choose sections"
      },
      {
        title: "Add training material",
        description: "Paste existing notes in bulk or create one training page at a time.",
        complete: overview.pages > 0,
        to: "/manager/import",
        action: "Add training"
      },
      {
        title: "Invite your team",
        description: "Bring in a manager or staff member when the first pages are ready.",
        complete: overview.members > 1,
        to: "/manager/invite-team",
        action: "Invite someone"
      },
      {
        title: "Publish a quiz",
        description: "Turn the facts in your training pages into a short knowledge check.",
        complete: overview.publishedQuizzes > 0,
        to: "/manager/quizzes",
        action: "Create a quiz"
      },
      {
        title: "Create a certification",
        description: "Bundle quizzes into a named staff mastery goal, such as Wine Certified or Service Ready.",
        complete: overview.certifications > 0,
        to: "/manager/certifications",
        action: "Create certification"
      },
      {
        title: "Assign training",
        description: "Send quizzes or certifications to groups such as Servers, Captains, Bar Team, or New Hires.",
        complete: overview.assignments > 0,
        to: "/manager/assignments",
        action: "Assign training"
      }
    ],
    [overview]
  );

  const completedSteps = gettingStartedSteps.filter((step) => step.complete).length;
  const nextStep = gettingStartedSteps.find((step) => !step.complete);
  const restaurantName = workspace.restaurant?.name || "Your restaurant";
  const firstName = workspace.userProfile?.name?.split(" ")?.[0] || "there";

  return (
    <section className="page-section manager-home">
      <div className="dashboard-header manager-home-header">
        <div>
          <p className="eyebrow">{restaurantName}</p>
          <h1>Welcome, {firstName}.</h1>
          <p>Keep training current, help your team study, and see who is ready for service.</p>
        </div>
        <div className="header-actions">
          <Link className="secondary-button" to="/training-library">View as staff</Link>
          <Link className="primary-button" to={nextStep?.to || "/manager/content"}>
            {nextStep?.action || "Manage training"}
          </Link>
        </div>
      </div>

      {workspace.isLoading ? <div className="empty-panel">Opening your restaurant...</div> : null}

      {workspace.status === "empty" || workspace.status === "error" ? (
        <div className="form-card">
          <h2>Finish setting up your restaurant</h2>
          <p>{workspace.message}</p>
          <Link className="primary-button full-width" to="/trial">Continue</Link>
        </div>
      ) : null}

      {workspace.status === "ready" ? (
        <>
          {isTrialExpired(workspace.restaurant) ? (
            <div className="warning-banner">
              Your 30-day free trial has ended. Review billing to keep your restaurant active.
            </div>
          ) : null}

          {overviewMessage ? <p className="form-message page-message">{overviewMessage}</p> : null}

          <section className="home-account-bar">
            <div>
              <span>Plan</span>
              <strong>{formatBillingStatus(workspace.restaurant)}</strong>
              <small>{workspace.restaurant?.trialEndsAt ? `Trial ends ${formatDate(workspace.restaurant.trialEndsAt)}` : ""}</small>
            </div>
            <div className="home-account-actions">
              <Link to="/managed-setup">Get help importing</Link>
              <Link to="/manager/settings">Restaurant settings</Link>
              {isOwnerOrAdmin(workspace.role) ? <Link to="/manager/billing">Plan & billing</Link> : null}
            </div>
          </section>

          <section className="home-overview" aria-label="Restaurant overview">
            <Link to="/manager/content">
              <strong>{isLoadingOverview ? "..." : overview.publishedPages}</strong>
              <span>Published pages</span>
              <small>{overview.pages - overview.publishedPages} drafts</small>
            </Link>
            <Link to="/manager/settings#team">
              <strong>{isLoadingOverview ? "..." : overview.members}</strong>
              <span>Team members</span>
              <small>Active access</small>
            </Link>
            <Link to="/manager/quizzes">
              <strong>{isLoadingOverview ? "..." : overview.publishedQuizzes}</strong>
              <span>Published quizzes</span>
              <small>{overview.quizzes} total</small>
            </Link>
            <Link to="/manager/staff-progress">
              <strong>View</strong>
              <span>Staff readiness</span>
              <small>Scores and completion</small>
            </Link>
          </section>

          {completedSteps < gettingStartedSteps.length ? (
            <section className="getting-started-panel">
              <div className="getting-started-heading">
                <div>
                  <p className="eyebrow">Getting started</p>
                  <h2>Follow the setup checklist</h2>
                  <p>{completedSteps} of {gettingStartedSteps.length} complete</p>
                </div>
                <div className="progress-track" aria-label={`${completedSteps} of ${gettingStartedSteps.length} steps complete`}>
                  <span style={{ width: `${(completedSteps / gettingStartedSteps.length) * 100}%` }} />
                </div>
              </div>

              <div className="home-step-list">
                {gettingStartedSteps.map((step, index) => (
                  <Link className={`home-step ${step.complete ? "is-complete" : ""}`} key={step.title} to={step.to}>
                    <span className="home-step-status" aria-hidden="true">{step.complete ? "✓" : index + 1}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.description}</p>
                    </div>
                    <strong>{step.complete ? "Review" : step.action}</strong>
                  </Link>
                ))}
              </div>
            </section>
          ) : (
            <section className="success-panel home-success-panel">
              <div>
                <p className="eyebrow">Your restaurant is ready</p>
                <h2>Keep the library fresh and the team prepared.</h2>
              </div>
              <Link className="primary-button" to="/manager/content">Manage training</Link>
            </section>
          )}

          <section className="home-action-section">
            <div className="section-heading compact-heading">
              <p className="eyebrow">Common tasks</p>
              <h2>What would you like to do?</h2>
            </div>

            <div className="home-action-grid">
              <Link className="home-action" to="/manager/import">
                <span>Training</span>
                <h3>Let Line Up build your library</h3>
                <p>Paste menus, tech sheets, cocktail specs, or SOPs and review the draft pages Line Up creates.</p>
              </Link>
              <Link className="home-action" to="/manager/content#training-page-form">
                <span>Training</span>
                <h3>Create one page</h3>
                <p>Add or update a dish, wine, cocktail, service standard, or procedure.</p>
              </Link>
              <Link className="home-action" to="/manager/invite-team">
                <span>Team</span>
                <h3>Invite someone</h3>
                <p>Give managers or staff the right access to this restaurant.</p>
              </Link>
              <Link className="home-action" to="/manager/staff-progress">
                <span>Results</span>
                <h3>Check staff readiness</h3>
                <p>Review quiz scores and see where the team may need more training.</p>
              </Link>
              <Link className="home-action" to="/manager/certifications">
                <span>Mastery</span>
                <h3>Create certifications</h3>
                <p>Name the skills staff need to master and choose which quizzes count toward each one.</p>
              </Link>
              <Link className="home-action" to="/manager/assignments">
                <span>Assignments</span>
                <h3>Assign training</h3>
                <p>Create groups like Server or Captain, then assign quizzes and certifications to the right people.</p>
              </Link>
              <Link className="home-action" to="/report-issue">
                <span>Help</span>
                <h3>Report a problem</h3>
                <p>Tell Line Up what failed, looks wrong, or would make training easier for your restaurant.</p>
              </Link>
            </div>
          </section>

        </>
      ) : null}
    </section>
  );
}
