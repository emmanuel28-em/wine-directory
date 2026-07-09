import { Link } from "react-router-dom";

const pageCopy = {
  quizzes: {
    eyebrow: "Quizzes",
    title: "Quiz builder coming next",
    text: "Quizzes will pull from Testable Staff Knowledge in each Training Page."
  },
  myProgress: {
    eyebrow: "My Progress",
    title: "Personal progress coming next",
    text: "Staff will see completed training, quiz results, and readiness here."
  },
  staffProgress: {
    eyebrow: "Staff Progress",
    title: "Staff progress dashboard coming next",
    text: "Managers will see completion, quiz scores, and readiness by team member."
  },
  inviteTeam: {
    eyebrow: "Invite Team",
    title: "Invite system coming next",
    text: "Owners and managers will invite Admins, Managers, and Staff with role-based invite links."
  },
  settings: {
    eyebrow: "Settings",
    title: "Workspace settings coming next",
    text: "Account Owners will manage restaurant details, admins, and billing settings here."
  },
  reportIssue: {
    eyebrow: "Report Issue",
    title: "Issue reporting coming next",
    text: "Staff will be able to flag outdated or confusing training pages for managers."
  }
};

export default function ComingSoonPage({ page = "quizzes", backTo = "/manager" }) {
  const copy = pageCopy[page] || pageCopy.quizzes;

  return (
    <section className="page-section narrow-page">
      <div className="form-card">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p>{copy.text}</p>
        <Link className="secondary-button full-width" to={backTo}>
          Back
        </Link>
      </div>
    </section>
  );
}
