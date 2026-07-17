import { Link } from "react-router-dom";

const featureCards = [
  {
    title: "Training Library",
    text: "Organize food, wine, cocktails, SOPs, service notes, and restaurant-specific knowledge in one place."
  },
  {
    title: "Quiz Practice",
    text: "Turn training content into quizzes so staff can build confidence before service."
  },
  {
    title: "Manager Visibility",
    text: "Give managers a simple place to see what staff are learning and where the team needs support."
  }
];

export default function LandingPage() {
  return (
    <section className="hero-page">
      <div className="hero-copy">
        <p className="eyebrow">Built for independent restaurants</p>
        <h1>Train your team faster without burying them in scattered notes.</h1>
        <p>
          A restaurant training platform for menus, beverage programs, SOPs, quizzes,
          and staff progress. This SaaS MVP will grow from the Rezdora training site
          into a tool any restaurant can use.
        </p>
        <div className="hero-actions">
          <Link className="primary-button" to="/trial">
            Start Free Trial
          </Link>
          <Link className="secondary-button" to="/login">
            Manager Login
          </Link>
        </div>
      </div>

      <div className="feature-grid" aria-label="Product features">
        {featureCards.map((feature) => (
          <article className="feature-card" key={feature.title}>
            <h2>{feature.title}</h2>
            <p>{feature.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
