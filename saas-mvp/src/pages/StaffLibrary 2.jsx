export default function StaffLibrary() {
  return (
    <section className="page-section">
      <div className="section-heading">
        <p className="eyebrow">Staff library</p>
        <h1>Training content will live here</h1>
        <p>
          Staff will eventually see only their restaurant's published docs, study cards,
          and quizzes. For Checkpoint 1, this page is a placeholder for that experience.
        </p>
      </div>

      <div className="library-preview">
        <article className="training-card">
          <span className="type-pill">Wine</span>
          <h2>BTG Wine Example</h2>
          <p>Region, grape, farming, one-liner, and study notes will appear here.</p>
        </article>

        <article className="training-card">
          <span className="type-pill">Food</span>
          <h2>Dinner Menu Example</h2>
          <p>Ingredients, allergies, mise, and guest-facing language will appear here.</p>
        </article>

        <article className="training-card">
          <span className="type-pill">SOP</span>
          <h2>Opening SOP Example</h2>
          <p>Steps of service and operational standards will appear here.</p>
        </article>
      </div>
    </section>
  );
}
