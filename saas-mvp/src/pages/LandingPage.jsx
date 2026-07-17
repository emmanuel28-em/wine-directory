import { Link } from "react-router-dom";

const problemPoints = [
  "Training notes live in scattered docs, chats, and printed binders.",
  "Menu changes move faster than staff can study them.",
  "Managers cannot easily see who is actually ready for service."
];

const solutionCards = [
  {
    title: "Organize",
    text: "Create a clean training library for menus, wine, cocktails, SOPs, and service standards."
  },
  {
    title: "Publish",
    text: "Keep staff-facing pages current so the team studies the same information."
  },
  {
    title: "Measure",
    text: "Turn key knowledge into quizzes and track readiness before the shift starts."
  }
];

export default function LandingPage() {
  return (
    <>
      <section className="minimal-hero">
        <p className="eyebrow">Line Up</p>
        <h1>Restaurant training, organized before service.</h1>
        <p>
          A calm training workspace for menus, tech sheets, SOPs, quizzes, and staff progress.
        </p>
        <Link className="primary-button hero-cta" to="/trial">
          Start Your Free Trial
        </Link>
        <div className="scroll-cue" aria-hidden="true" />
      </section>

      <section className="story-section problem-section" id="problem">
        <div className="story-copy">
          <p className="eyebrow">The problem</p>
          <h2>Restaurant training breaks when information spreads everywhere.</h2>
        </div>

        <div className="problem-list">
          {problemPoints.map((point) => (
            <article className="quiet-card" key={point}>
              <p>{point}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="story-section solution-section" id="solution">
        <div className="story-copy centered-copy">
          <p className="eyebrow">The solution</p>
          <h2>One place to keep the team lined up.</h2>
          <p>
            Line Up helps managers keep training pages organized, published, and ready to become staff quizzes.
          </p>
        </div>

        <div className="solution-showcase">
          <div className="product-panel">
            <div className="product-panel-header">
              <span>Training Library</span>
              <strong>Ready for service</strong>
            </div>
            <div className="product-row">
              <span>Dinner Menu</span>
              <strong>32 pages</strong>
            </div>
            <div className="product-row">
              <span>BTG Wines</span>
              <strong>11 pages</strong>
            </div>
            <div className="product-row">
              <span>Quiz Readiness</span>
              <strong>87%</strong>
            </div>
          </div>

          <div className="solution-grid">
            {solutionCards.map((card) => (
              <article className="quiet-card" key={card.title}>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="story-section hook-section" id="pricing">
        <div className="story-copy centered-copy">
          <p className="eyebrow">Start simple</p>
          <h2>Start with a 30-day free trial.</h2>
          <p>
            Build your own workspace, or ask for managed setup if you want help migrating menus,
            Google Docs, wine lists, cocktail specs, and SOPs.
          </p>
        </div>

        <div className="hook-actions">
          <Link className="primary-button hero-cta" to="/trial">
            Start Your Free Trial
          </Link>
          <Link className="text-link" to="/managed-setup">
            Request Done-For-You Setup
          </Link>
        </div>
      </section>
    </>
  );
}
