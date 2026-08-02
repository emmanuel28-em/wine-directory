import { Link } from "react-router-dom";

const problemPoints = [
  "Training notes live in scattered docs, chats, and printed binders.",
  "Menu changes move faster than staff can study them.",
  "Managers cannot easily see who is actually ready for service."
];

const solutionCards = [
  {
    title: "Send",
    text: "Share the menus, tech sheets, wine lists, cocktail specs, and SOPs you already use."
  },
  {
    title: "We organize",
    text: "Line Up turns that material into a clean, current training library for your restaurant."
  },
  {
    title: "Your team studies",
    text: "Staff completes five-question checks while leaders see readiness before service."
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
          Send us the material you already have. We turn it into a simple training library your team can study.
        </p>
        <div className="hero-actions">
          <Link className="primary-button hero-cta" to="/managed-setup">
            Let Line Up Build Your Library
          </Link>
          <Link className="secondary-button hero-cta" to="/trial">
            Start Your Free Trial
          </Link>
        </div>
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
            Line Up keeps restaurant knowledge organized, gives staff a clear study path, and shows leaders who is ready.
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
            Google Docs, wine lists, cocktail specs, SOPs, staff groups, and review questions.
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

        <p className="pricing-footnote">Extra users can be added for $3-$5 per user per month depending on the account.</p>

        <div className="hook-actions">
          <Link className="primary-button hero-cta" to="/trial">
            Start Your Free Trial
          </Link>
          <Link className="text-link" to="/managed-setup">
            Let Line Up Build Your Library
          </Link>
        </div>
      </section>
    </>
  );
}
