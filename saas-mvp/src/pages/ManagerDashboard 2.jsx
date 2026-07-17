import { Link } from "react-router-dom";

function getTrialRestaurant() {
  try {
    return JSON.parse(localStorage.getItem("trialRestaurant"));
  } catch {
    return null;
  }
}

export default function ManagerDashboard() {
  const trialRestaurant = getTrialRestaurant();
  const restaurantName = trialRestaurant?.restaurantName || "Your Restaurant";

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Manager dashboard</p>
          <h1>{restaurantName}</h1>
          <p>
            This is the future home for content management, staff invites, quiz results,
            and restaurant setup.
          </p>
        </div>
        <Link className="secondary-button" to="/staff">
          View Staff Library
        </Link>
      </div>

      <div className="dashboard-grid">
        <article className="stat-card">
          <span>Step 1</span>
          <h2>Add content</h2>
          <p>Wines, cocktails, food items, SOPs, menus, and training docs will be created here.</p>
        </article>

        <article className="stat-card">
          <span>Step 2</span>
          <h2>Invite staff</h2>
          <p>Managers will invite team members and assign them to the correct restaurant.</p>
        </article>

        <article className="stat-card">
          <span>Step 3</span>
          <h2>Track results</h2>
          <p>Quiz scores, completion, and mastery progress will show which staff are up to date.</p>
        </article>
      </div>
    </section>
  );
}
