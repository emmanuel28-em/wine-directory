import { useEffect, useState } from "react";
import LeaderboardTable from "../components/leaderboard/LeaderboardTable.jsx";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import {
  listLeaderboardForRestaurant,
  refreshRestaurantLeaderboard,
  syncMyLeaderboardEntry
} from "../lib/leaderboard.js";

export default function LeaderboardPage() {
  const workspace = useCurrentWorkspace();
  const [entries, setEntries] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  async function loadLeaderboard() {
    if (workspace.status !== "ready") return;
    setIsLoading(true);
    setMessage("");

    try {
      if (workspace.isManager) {
        await refreshRestaurantLeaderboard(workspace.restaurant.id);
      } else {
        await syncMyLeaderboardEntry({
          restaurantId: workspace.restaurant.id,
          userProfile: workspace.userProfile,
          membership: workspace.membership
        });
      }
      setEntries(await listLeaderboardForRestaurant(workspace.restaurant.id));
    } catch (error) {
      setMessage(error.message || "Could not load the leaderboard.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLeaderboard();
  }, [workspace.status, workspace.restaurant?.id]);

  return (
    <section className="page-section leaderboard-page">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Team leaderboard</p>
          <h1>Keep the team learning</h1>
          <p>See pages studied, quiz facts mastered, and active study streaks across your restaurant.</p>
        </div>
        <button className="secondary-button" type="button" onClick={loadLeaderboard}>Refresh</button>
      </div>

      {message ? <p className="form-message page-message">{message}</p> : null}
      {isLoading ? <div className="empty-panel">Updating the leaderboard...</div> : null}
      {!isLoading ? <LeaderboardTable entries={entries} currentUserProfileId={workspace.userProfile?.id} /> : null}
    </section>
  );
}
