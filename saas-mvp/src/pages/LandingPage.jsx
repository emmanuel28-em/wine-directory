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

const pricingCards = [
  ["Starter", "$99/month", "Up to 20 users", "Good for small restaurants"],
  ["Growth", "$199/month", "Up to 50 users", "Most independent restaurants"],
  ["Pro", "$349/month", "Up to 100 users", "Larger restaurants and groups"]
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

      <section className="story-section solution-section" id="how-it-works">
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
            Build your own training library, or ask for setup help if you want us to organize menus,
            Google Docs, wine lists, cocktail specs, and SOPs.
          </p>
        </div>

        <div className="public-pricing-grid">
          {pricingCards.map(([name, price, limit, bestFor]) => (
            <article className="quiet-card pricing-summary-card" key={name}>
              <h3>{name}</h3>
              <strong>{price}</strong>
              <p>{limit}</p>
              <p>{bestFor}</p>
            </article>
          ))}
        </div>

        <p className="pricing-footnote">
          Start with a one-month free trial. Payment is handled securely through Stripe, and extra users can be added for $3-$5 per user per month depending on the account.
        </p>

        <div className="hook-actions">
          <Link className="primary-button hero-cta" to="/trial">
            Start Your Free Trial
          </Link>
          <Link className="text-link" to="/managed-setup">
            Get Setup Help
          </Link>
        </div>
      </section>
    </>
  );
}
