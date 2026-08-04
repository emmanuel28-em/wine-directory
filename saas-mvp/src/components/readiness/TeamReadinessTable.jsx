function formatLastActive(value) {
  if (!value) return "No activity yet";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export default function TeamReadinessTable({ rows }) {
  if (!rows.length) {
    return <div className="empty-panel">No team members match this filter.</div>;
  }

  return (
    <div className="team-readiness-grid">
      {rows.map((row) => (
        <article className="team-readiness-card" key={row.member.membership.id}>
          <div className="team-readiness-person">
            <span className="leaderboard-avatar" aria-hidden="true">
              {(row.member.profile?.name || "T").charAt(0).toUpperCase()}
            </span>
            <div>
              <h2>{row.member.profile?.name || "Team Member"}</h2>
              <p>{row.groupNames.length ? row.groupNames.join(" · ") : "No team group"}</p>
            </div>
            <span className={row.isUpToDate ? "readiness-status is-ready" : "readiness-status is-review"}>
              {row.isUpToDate ? "Up to Date" : "Needs Review"}
            </span>
          </div>

          <div className="readiness-progress-heading">
            <strong>{row.completionPercent}% complete</strong>
            <span>{row.reviewedCards}/{row.totalCards} pages</span>
          </div>
          <div className="readiness-progress-track" aria-label={`${row.completionPercent}% complete`}>
            <span style={{ width: `${row.completionPercent}%` }} />
          </div>

          <dl className="team-readiness-details">
            <div>
              <dt>Last active</dt>
              <dd>{formatLastActive(row.lastActiveAt)}</dd>
            </div>
            <div>
              <dt>Recent updates</dt>
              <dd>{row.recentMissingCount ? `${row.recentMissingCount} to review` : "Caught up"}</dd>
            </div>
            <div>
              <dt>In progress</dt>
              <dd>{row.inProgressCards || 0} pages</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}
