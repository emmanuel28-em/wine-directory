import { useState } from "react";
import { useAuthSession } from "../auth/AuthSessionProvider.jsx";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { createManagedSetupRequest, uploadFileAsset } from "../lib/fileAssets.js";

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
  const authSession = useAuthSession();
  const workspace = useCurrentWorkspace();
  const [inquiry, setInquiry] = useState(emptyInquiry);
  const [submittedInquiry, setSubmittedInquiry] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");

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

  async function submitInquiry(event) {
    event.preventDefault();
    setIsWorking(true);
    setMessage("");

    if (authSession.status !== "authenticated" || workspace.status !== "ready") {
      setSubmittedInquiry({
        ...inquiry,
        publicOnly: true
      });
      setMessage("File uploads are available after creating a restaurant workspace. Start a free trial when you are ready to send source materials.");
      setInquiry(emptyInquiry);
      setSelectedFiles([]);
      setIsWorking(false);
      return;
    }

    try {
      const request = await createManagedSetupRequest({
        workspace,
        inquiry
      });

      for (const file of selectedFiles) {
        await uploadFileAsset({
          restaurantId: workspace.restaurant.id,
          managedSetupRequestId: request.id,
          file,
          uploadedBy: workspace.userProfile.id
        });
      }

      setSubmittedInquiry({
        ...inquiry,
        uploadedCount: selectedFiles.length
      });
      setInquiry(emptyInquiry);
      setSelectedFiles([]);
      setMessage("Thanks. We received your setup request. We’ll review your materials and follow up.");
    } catch (error) {
      setMessage(error.message || "Could not submit this managed setup request.");
    } finally {
      setIsWorking(false);
    }
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
          <h2>{submittedInquiry.publicOnly ? "Account needed for uploads" : "Request received"}</h2>
          {submittedInquiry.publicOnly ? (
            <p>
              Your request details are ready, but secure file upload requires a restaurant workspace first. Start a free trial,
              then return here to upload menus, SOPs, wine lists, and source files.
            </p>
          ) : (
            <p>
              We received your managed setup request for <strong>{submittedInquiry.restaurantName}</strong>
              {submittedInquiry.uploadedCount ? ` with ${submittedInquiry.uploadedCount} file(s)` : ""}. We will follow up with next steps.
            </p>
          )}
        </div>
      ) : null}

      {message ? <p className="form-message page-message">{message}</p> : null}

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

        <label>
          File uploads
          <span className="helper-text">
            Uploads are available for signed-in restaurant workspaces. Public uploads are disabled for safety.
          </span>
          <input
            type="file"
            multiple
            accept=".pdf,image/*,.doc,.docx,.txt,.csv,.xls,.xlsx"
            onChange={(event) => setSelectedFiles([...event.target.files])}
            disabled={authSession.status !== "authenticated" || workspace.status !== "ready"}
          />
        </label>

        {selectedFiles.length > 0 ? (
          <div className="attachment-list">
            {selectedFiles.map((file) => (
              <span className="type-pill" key={`${file.name}-${file.size}`}>
                {file.name}
              </span>
            ))}
          </div>
        ) : null}

        <button className="primary-button full-width" type="submit" disabled={isWorking}>
          {isWorking ? "Submitting..." : "Request Done-For-You Setup"}
        </button>
      </form>
    </section>
  );
}
