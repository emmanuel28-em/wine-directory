import { useState } from "react";
import { useNavigate } from "react-router-dom";

const emptyTrial = {
  restaurantName: "",
  managerName: "",
  email: ""
};

export default function TrialPage() {
  const navigate = useNavigate();
  const [trial, setTrial] = useState(emptyTrial);

  function updateTrial(event) {
    const { name, value } = event.target;
    setTrial((currentTrial) => ({
      ...currentTrial,
      [name]: value
    }));
  }

  function startTrial(event) {
    event.preventDefault();

    // This is temporary for Checkpoint 1.
    // Later, Amplify Auth and Amplify Data will create the real account.
    localStorage.setItem("trialRestaurant", JSON.stringify(trial));
    navigate("/manager");
  }

  return (
    <section className="page-section narrow-page">
      <div className="section-heading">
        <p className="eyebrow">Free trial</p>
        <h1>Create your restaurant workspace</h1>
        <p>
          This form is a local placeholder right now. In the next checkpoints it will connect
          to real login and database records.
        </p>
      </div>

      <form className="form-card" onSubmit={startTrial}>
        <label>
          Restaurant name
          <input
            name="restaurantName"
            value={trial.restaurantName}
            onChange={updateTrial}
            placeholder="Rezdora"
            required
          />
        </label>

        <label>
          Manager name
          <input
            name="managerName"
            value={trial.managerName}
            onChange={updateTrial}
            placeholder="Emmanuel Morales"
            required
          />
        </label>

        <label>
          Manager email
          <input
            name="email"
            type="email"
            value={trial.email}
            onChange={updateTrial}
            placeholder="manager@example.com"
            required
          />
        </label>

        <button className="primary-button full-width" type="submit">
          Create Trial Workspace
        </button>
      </form>
    </section>
  );
}
