import { Link } from "react-router-dom";

const valueCards = [
  {
    title: "Training Library",
    text: "Keep food, wine, cocktails, SOPs, and service notes in one organized workspace."
  },
  {
    title: "Quizzes & Progress",
    text: "Turn key staff knowledge into quizzes and see who is ready for service."
  },
  {
    title: "Managed Setup",
    text: "Send us your Google Docs, menus, tech sheets, and SOPs. We can organize everything for you."
  }
];

const howItWorksSteps = [
  "Create your restaurant workspace",
  "Add or import training material",
  "Invite managers and staff",
  "Track quizzes and progress"
];

export default function LandingPage() {
  return (
    <>
      <section className="hero-page product-hero">
        <div className="hero-copy">
          <p className="eyebrow">Restaurant training, organized before service.</p>
          <h1>Train your team faster before service starts.</h1>
          <p>
            Line Up gives restaurants one place to organize training docs, tech sheets, SOPs,
            wine notes, quizzes, and staff progress.
          </p>
          <div className="hero-actions">
            <Link className="primary-button" to="/trial">
              Start Free Trial
            </Link>
            <Link className="secondary-button" to="/managed-setup">
              Request Done-For-You Setup
            </Link>
          </div>
        </div>

        <aside className="hero-mockup" aria-label="Line Up product preview">
          <div className="mockup-header">
            <span className="type-pill">Line Up</span>
            <strong>Service Readiness</strong>
          </div>

          <div className="mockup-stat-grid">
            <div>
              <span>Training Library</span>
              <strong>128 pages</strong>
            </div>
            <div>
              <span>Published Docs</span>
              <strong>94</strong>
            </div>
            <div>
              <span>Staff Quiz Scores</span>
              <strong>87%</strong>
            </div>
            <div>
              <span>Staff Progress</span>
              <strong>24 active</strong>
            </div>
          </div>

          <div className="mockup-list">
            <div>
              <span className="mockup-dot" />
              <p>Dinner Menu updates published</p>
            </div>
            <div>
              <span className="mockup-dot accent-dot" />
              <p>Wine pairing quiz ready for review</p>
            </div>
            <div>
              <span className="mockup-dot sage-dot" />
              <p>New hire onboarding 72% complete</p>
            </div>
          </div>
        </aside>
      </section>

      <section className="page-section value-section" aria-label="Line Up value">
        <div className="feature-grid">
          {valueCards.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <h2>{feature.title}</h2>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-section content-section" id="how-it-works">
        <div className="section-heading">
          <p className="eyebrow">How it works</p>
          <h2>From scattered notes to a working training system.</h2>
        </div>

        <div className="step-grid">
          {howItWorksSteps.map((step, index) => (
            <article className="step-card" key={step}>
              <span>{index + 1}</span>
              <h3>{step}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="page-section pricing-section" id="pricing">
        <div className="section-heading">
          <p className="eyebrow">Pricing</p>
          <h2>Start with a 30-day free trial.</h2>
          <p>
            Payment will be handled securely through Stripe. Line Up does not store credit card information.
          </p>
        </div>

        <div className="plan-grid">
          <article className="plan-card">
            <span className="type-pill">Self-Service</span>
            <h3>Build It Yourself</h3>
            <p>
              Create your restaurant workspace, add your training categories, paste your tech sheets,
              publish content, and train your staff.
            </p>
            <Link className="primary-button full-width" to="/trial">
              Start Free Trial
            </Link>
          </article>

          <article className="plan-card highlighted-plan">
            <span className="type-pill">Managed Setup</span>
            <h3>Done-For-You Setup</h3>
            <p>
              Send us your menus, Google Docs, tech sheets, SOPs, wine lists, and cocktail specs.
              We organize everything into your training portal for you.
            </p>
            <Link className="secondary-button full-width" to="/managed-setup">
              Request Managed Setup
            </Link>
          </article>
        </div>
      </section>
    </>
  );
}
