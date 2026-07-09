import { useState } from "react";

const materialOptions = [
  "Google Docs",
  "PDFs",
  "Word Docs",
  "Menus",
  "Wine Lists",
  "Cocktail Specs",
  "SOPs",
  "Training Manuals",
  "Other"
];

const priorityOptions = [
  "Food Menu",
  "Wine",
  "Cocktails",
  "SOPs",
  "Service Standards",
  "Onboarding",
  "Events"
];

const emptyInquiry = {
  restaurantName: "",
  contactFirstName: "",
  contactLastName: "",
  email: "",
  title: "",
  materials: [],
  amount: "Small: under 20 pages/docs",
  priorities: [],
  notes: ""
};

function toggleListValue(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export default function ManagedSetupPage() {
  const [inquiry, setInquiry] = useState(emptyInquiry);
  const [submittedInquiry, setSubmittedInquiry] = useState(null);

  function updateInquiry(event) {
    const { name, value } = event.target;
    setInquiry((currentInquiry) => ({
      ...currentInquiry,
      [name]: value
    }));
  }

  function toggleMaterial(value) {
    setInquiry((currentInquiry) => ({
      ...currentInquiry,
      materials: toggleListValue(currentInquiry.materials, value)
    }));
  }

  function togglePriority(value) {
    setInquiry((currentInquiry) => ({
      ...currentInquiry,
      priorities: toggleListValue(currentInquiry.priorities, value)
    }));
  }

  function submitInquiry(event) {
    event.preventDefault();

    // This is intentionally lightweight for now.
    // Later, this can save inquiries or send email notifications.
    console.log("Managed setup inquiry", inquiry);
    setSubmittedInquiry(inquiry);
    setInquiry(emptyInquiry);
  }

  return (
    <section className="page-section narrow-page">
      <div className="section-heading">
        <p className="eyebrow">Done-for-you setup</p>
        <h1>Send us your existing docs. We’ll organize Line Up for you.</h1>
        <p>
          Menus, tech sheets, SOPs, wine lists, cocktail specs, Google Docs, and training manuals can be turned into a clean staff training library.
        </p>
      </div>

      {submittedInquiry ? (
        <div className="success-panel">
          <h2>Request received</h2>
          <p>
            We have your managed setup request for <strong>{submittedInquiry.restaurantName}</strong>. We will follow up with next steps.
          </p>
        </div>
      ) : null}

      <form className="form-card" onSubmit={submitInquiry}>
        <label>
          Restaurant Name
          <input name="restaurantName" value={inquiry.restaurantName} onChange={updateInquiry} required />
        </label>

        <div className="field-pair">
          <label>
            Contact First Name
            <input name="contactFirstName" value={inquiry.contactFirstName} onChange={updateInquiry} required />
          </label>

          <label>
            Contact Last Name
            <input name="contactLastName" value={inquiry.contactLastName} onChange={updateInquiry} required />
          </label>
        </div>

        <label>
          Work Email
          <input name="email" type="email" value={inquiry.email} onChange={updateInquiry} required />
        </label>

        <label>
          Title
          <input name="title" value={inquiry.title} onChange={updateInquiry} required />
        </label>

        <fieldset className="option-fieldset">
          <legend>What materials do you already have?</legend>
          <div className="checkbox-grid">
            {materialOptions.map((option) => (
              <label className="checkbox-label" key={option}>
                <input
                  type="checkbox"
                  checked={inquiry.materials.includes(option)}
                  onChange={() => toggleMaterial(option)}
                />
                {option}
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          Approximate amount of material
          <select name="amount" value={inquiry.amount} onChange={updateInquiry}>
            <option>Small: under 20 pages/docs</option>
            <option>Medium: 20-75 pages/docs</option>
            <option>Large: 75+ pages/docs</option>
          </select>
        </label>

        <fieldset className="option-fieldset">
          <legend>What do you want us to organize first?</legend>
          <div className="checkbox-grid">
            {priorityOptions.map((option) => (
              <label className="checkbox-label" key={option}>
                <input
                  type="checkbox"
                  checked={inquiry.priorities.includes(option)}
                  onChange={() => togglePriority(option)}
                />
                {option}
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          Notes
          <textarea
            name="notes"
            value={inquiry.notes}
            onChange={updateInquiry}
            placeholder="Tell us what is messy, urgent, or most important to organize first."
          />
        </label>

        <button className="primary-button full-width" type="submit">
          Request Done-For-You Setup
        </button>
      </form>
    </section>
  );
}
