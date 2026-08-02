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
        title: "Build your training library",
        description: "Send Line Up your menus, tech sheets, and SOPs, or use the library tools to add a page yourself.",
        complete: overview.pages > 0,
        to: "/managed-setup",
        action: "Send your material"
      },
      {
        title: "Invite your team",
        description: "Invite staff when the first training sections are ready to study.",
        complete: overview.members > 1,
        to: "/manager/invite-team",
        action: "Invite someone"
      },
      {
        title: "Check staff readiness",
        description: "See which pages each staff member completed and which sections still need attention.",
        complete: overview.members > 1 && overview.publishedPages > 0,
        to: "/manager/staff-progress",
        action: "View readiness"
      }
    ],
    [overview]
  );

  const completedSteps = gettingStartedSteps.filter((step) => step.complete).length;
  const nextStep = gettingStartedSteps.find((step) => !step.complete);
  const restaurantName = workspace.restaurant?.name || "Your restaurant";
  const firstName = workspace.userProfile?.name?.split(" ")?.[0] || "there";
  const isWorkspaceAdmin = isOwnerOrAdmin(workspace.role);

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
              <span className="type-pill">{workspace.role === "owner" ? "Account Owner" : workspace.role === "admin" ? "Admin" : "Manager"}</span>
              <span>Plan</span>
              <strong>{formatBillingStatus(workspace.restaurant)}</strong>
              <small>{workspace.restaurant?.trialEndsAt ? `Trial ends ${formatDate(workspace.restaurant.trialEndsAt)}` : ""}</small>
            </div>
            <div className="home-account-actions">
              <Link to="/managed-setup">Have Line Up build it</Link>
              {isWorkspaceAdmin ? <Link to="/manager/settings">Restaurant settings</Link> : null}
              {isOwnerOrAdmin(workspace.role) ? <Link to="/manager/billing">Plan & billing</Link> : null}
            </div>
          </section>

          <section className="daily-training-flow" aria-labelledby="daily-flow-title">
            <div className="daily-flow-heading">
              <div>
                <p className="eyebrow">Need new training added?</p>
                <h2 id="daily-flow-title">Send the material. Line Up builds the library.</h2>
                <p>Menus, tech sheets, SOPs, wine lists, and photos can all become organized staff training.</p>
              </div>
              <Link className="primary-button" to="/managed-setup">Send material to Line Up</Link>
            </div>
            <div className="daily-flow-steps">
              <Link to="/managed-setup"><strong>1</strong><span>Send material</span></Link>
              <Link to="/manager/content"><strong>2</strong><span>Review library</span></Link>
              <Link to="/manager/assignments"><strong>3</strong><span>Assign team</span></Link>
              <Link to="/manager/staff-progress"><strong>4</strong><span>Track readiness</span></Link>
            </div>
          </section>

          <section className="home-overview" aria-label="Restaurant overview">
            <Link to="/manager/content">
              <strong>{isLoadingOverview ? "..." : overview.publishedPages}</strong>
              <span>Published pages</span>
              <small>{overview.pages - overview.publishedPages} drafts</small>
            </Link>
            <Link to={isWorkspaceAdmin ? "/manager/settings#team" : "/manager/invite-team"}>
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
              <Link className="home-action home-action-primary" to="/manager/content">
                <span>Library</span>
                <h3>Review the training library</h3>
                <p>See published pages, drafts, images, and the sections available to staff.</p>
              </Link>
              <Link className="home-action" to="/manager/assignments">
                <span>Team</span>
                <h3>Manage team</h3>
                <p>See employees, organize groups, invite people, and assign training.</p>
              </Link>
              <Link className="home-action" to="/manager/staff-progress">
                <span>Results</span>
                <h3>Check staff readiness</h3>
                <p>Review quiz scores and see where the team may need more training.</p>
              </Link>
              <Link className="home-action" to="/managed-setup">
                <span>Done for you</span>
                <h3>Let Line Up build your library</h3>
                <p>Send us your menus, tech sheets, SOPs, and team details. We organize and build everything for you.</p>
              </Link>
            </div>
          </section>

        </>
      ) : null}
    </section>
  );
}
