function formatLastStudy(value) {
  if (!value) return "No study activity yet";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function LeaderboardTable({ entries, currentUserProfileId }) {
  if (!entries.length) {
    return <div className="empty-panel">Complete a training page or quiz to start the leaderboard.</div>;
  }

  return (
    <div className="leaderboard-list" role="list" aria-label="Restaurant learning leaderboard">
      {entries.map((entry, index) => (
        <article
          className={entry.userProfileId === currentUserProfileId ? "leaderboard-row is-current-user" : "leaderboard-row"}
          key={entry.id}
          role="listitem"
        >
          <span className="leaderboard-rank" aria-label={`Rank ${index + 1}`}>{index + 1}</span>
          <div className="leaderboard-person">
            <span className="leaderboard-avatar" aria-hidden="true">{(entry.displayName || "T").charAt(0).toUpperCase()}</span>
            <div>
              <h2>{entry.displayName || "Team Member"}</h2>
              <p>{formatLastStudy(entry.lastStudyAt)}{entry.userProfileId === currentUserProfileId ? " · You" : ""}</p>
            </div>
          </div>
          <div className="leaderboard-stat">
            <strong>{entry.quizFactsMastered || 0}</strong>
            <span>facts mastered</span>
          </div>
          <div className="leaderboard-stat">
            <strong>{entry.reviewedPages || 0}</strong>
            <span>pages studied</span>
          </div>
          <div className="leaderboard-stat">
            <strong>{entry.currentStreak || 0}</strong>
            <span>day streak</span>
          </div>
        </article>
      ))}
    </div>
  );
}
