import { useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { createManagedSetupRequest } from "../lib/fileAssets.js";
import {
  FOUNDING_OFFER,
  STAFF_SIZE_OPTIONS,
  TRAINING_PRIORITY_OPTIONS,
  TRAINING_SYSTEM_OPTIONS,
  toManagedSetupInquiry,
  validateFoundingDemoRequest
} from "../lib/foundingCampaign.js";

const emptyRequest = {
  restaurantName: "",
  contactFirstName: "",
  contactLastName: "",
  email: "",
  title: "",
  staffSize: STAFF_SIZE_OPTIONS[1],
  currentSystem: TRAINING_SYSTEM_OPTIONS[0],
  priority: "",
  preferredTime: "",
  notes: ""
};

const includedItems = [
  "A restaurant-branded workspace with your name, logo, and training sections",
  "Initial organization of menus, tech sheets, wine lists, cocktail specs, and SOPs",
  "Staff flashcards, five-fact reviews, assignments, and readiness reporting",
  "Routine monthly updates when menus or training information change"
];

const fitSignals = [
  "Your menu, specials, wine list, or cocktail program changes regularly.",
  "Training information is split between Docs, PDFs, messages, binders, and pre-shift notes.",
  "Managers need a faster way to see who reviewed new information.",
  "New hires have a lot to learn before they can confidently work the floor."
];

export default function FoundingRestaurantsPage() {
  const workspace = useCurrentWorkspace();
  const [request, setRequest] = useState(emptyRequest);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setRequest((current) => ({ ...current, [name]: value }));
  }

  async function submitRequest(event) {
    event.preventDefault();
    const validationMessage = validateFoundingDemoRequest(request);

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      await createManagedSetupRequest({
        workspace: workspace.status === "ready" ? workspace : null,
        inquiry: toManagedSetupInquiry(request)
      });
      setSubmitted(true);
      setMessage("Your demo request is in. Line Up will contact you to choose a 15-minute time.");
      setRequest(emptyRequest);
    } catch (error) {
      setMessage(error.message || "Your request could not be saved. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="founding-page">
      <section className="founding-hero">
        <div className="founding-hero-copy">
          <p className="eyebrow">Three founding restaurant openings</p>
          <h1>Your restaurant’s training library, built and maintained for you.</h1>
          <p className="founding-lede">
            Send us your menus, tech sheets, wine lists, cocktail specs, SOPs, and existing Google Docs.
            Line Up turns them into a branded portal where staff can study, practice, and stay ready for service.
          </p>
          <div className="founding-hero-actions">
            <a className="primary-button" href="#book-demo">Book a 15-Minute Demo</a>
            <a className="secondary-button" href="#founding-process">See how it works</a>
          </div>
          <p className="founding-proof-line">Built by a NYC restaurant floor manager from a real fine-dining training workflow.</p>
        </div>

        <div className="founding-product-visual" aria-label="Example restaurant training workspace">
          <div className="founding-browser-bar">
            <span />
            <span />
            <span />
            <small>your restaurant · powered by Line Up</small>
          </div>
          <div className="founding-product-shell">
            <aside>
              <strong>Northstar Dining</strong>
              <span className="is-active">Home</span>
              <span>Training Library</span>
              <span>Team Readiness</span>
            </aside>
            <div className="founding-product-main">
              <div className="founding-progress-preview">
                <span>Service readiness</span>
                <strong>82%</strong>
                <div><i /></div>
              </div>
              <div className="founding-training-preview">
                <div className="founding-preview-photo" aria-hidden="true">Tonight</div>
                <div>
                  <span>Dinner Menu · New</span>
                  <strong>Spring agnolotti</strong>
                  <p>Five facts ready to practice before service.</p>
                  <b>Start review</b>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="founding-problem-band">
        <p className="eyebrow">The problem is not a lack of information</p>
        <h2>It is keeping the right information organized, current, and in front of the team.</h2>
        <div className="founding-problem-grid">
          <article><strong>Scattered</strong><p>Training lives across messages, PDFs, Docs, binders, and someone’s memory.</p></article>
          <article><strong>Always changing</strong><p>New dishes and beverage changes arrive faster than managers can rebuild training.</p></article>
          <article><strong>Hard to verify</strong><p>Pre-shift explanations do not show who studied or who still needs help.</p></article>
        </div>
      </section>

      <section className="founding-process" id="founding-process">
        <div className="founding-section-heading">
          <p className="eyebrow">Completely done for you</p>
          <h2>You send the material. We build the system.</h2>
          <p>No course building. No complicated implementation project. No manager spending a week copying fields into software.</p>
        </div>
        <ol className="founding-process-list">
          <li><span>1</span><div><strong>Send what you already use</strong><p>Menus, specs, SOPs, Docs, PDFs, and staff notes are all useful starting points.</p></div></li>
          <li><span>2</span><div><strong>We organize and build</strong><p>Line Up creates the sections, training pages, study facts, and branded staff workspace.</p></div></li>
          <li><span>3</span><div><strong>You review once</strong><p>A restaurant leader checks the structure and content before anything reaches staff.</p></div></li>
          <li><span>4</span><div><strong>Your team starts studying</strong><p>Staff receive a simple library and flashcard practice while managers see readiness.</p></div></li>
        </ol>
      </section>

      <section className="founding-case-study">
        <div>
          <p className="eyebrow">Built inside a real NYC restaurant</p>
          <h2>From scattered tech sheets to one place the team can study.</h2>
          <p>
            The first Line Up library was created from real food, wine, and cocktail training material at a
            Michelin-starred restaurant. Existing documents became searchable training pages, quick flashcards,
            and visible staff progress without asking the management team to become software administrators.
          </p>
        </div>
        <dl>
          <div><dt>Before</dt><dd>Docs, PDFs, messages, and verbal updates</dd></div>
          <div><dt>After</dt><dd>One branded, mobile-friendly training library</dd></div>
          <div><dt>Manager view</dt><dd>Who is current and who needs review</dd></div>
        </dl>
      </section>

      <section className="founding-offer" id="founding-offer">
        <div className="founding-offer-card">
          <p className="eyebrow">Founding restaurant offer</p>
          <div className="founding-price-row">
            <div><strong>${FOUNDING_OFFER.setupFee}</strong><span>one-time setup</span></div>
            <div><strong>${FOUNDING_OFFER.monthlyFee}</strong><span>per month after 30 days</span></div>
          </div>
          <p>One NYC location · Month-to-month · Delivered within seven business days after complete materials arrive.</p>
          <ul>{includedItems.map((item) => <li key={item}>{item}</li>)}</ul>
          <a className="primary-button full-width" href="#book-demo">Claim a Founding Restaurant Opening</a>
          <a className="founding-download-link" href="/founding/line-up-founding-offer.pdf" target="_blank" rel="noreferrer">
            Download the one-page overview
          </a>
          <small>Routine updates are included. Large restructures, additional locations, and unusual migrations are scoped separately.</small>
        </div>
        <div className="founding-fit-card">
          <p className="eyebrow">A strong fit if</p>
          <h2>Your team has plenty to learn and your managers have no time to rebuild it.</h2>
          <ul>{fitSignals.map((signal) => <li key={signal}>{signal}</li>)}</ul>
          <Link to="/managed-setup">Already ready to send materials? Request setup directly.</Link>
        </div>
      </section>

      <section className="founding-demo-section" id="book-demo">
        <div className="founding-demo-copy">
          <p className="eyebrow">A focused 15-minute walkthrough</p>
          <h2>See the staff experience using a real restaurant workflow.</h2>
          <p>We will look at where your training lives today, show how Line Up organizes it, and confirm whether the founding offer fits your restaurant.</p>
          <div className="founding-demo-agenda">
            <span>5 min · Your current process</span>
            <span>5 min · Staff and manager walkthrough</span>
            <span>5 min · Materials, timeline, and next step</span>
          </div>
        </div>

        <form className="founding-demo-form" onSubmit={submitRequest} noValidate>
          <div className="field-pair">
            <label>First name<input name="contactFirstName" value={request.contactFirstName} onChange={updateField} required /></label>
            <label>Last name<input name="contactLastName" value={request.contactLastName} onChange={updateField} required /></label>
          </div>
          <label>Restaurant name<input name="restaurantName" value={request.restaurantName} onChange={updateField} required /></label>
          <div className="field-pair">
            <label>Work email<input name="email" type="email" value={request.email} onChange={updateField} required /></label>
            <label>Your title<input name="title" value={request.title} onChange={updateField} placeholder="General Manager" required /></label>
          </div>
          <div className="field-pair">
            <label>Team size<select name="staffSize" value={request.staffSize} onChange={updateField}>{STAFF_SIZE_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label>Training lives mostly in<select name="currentSystem" value={request.currentSystem} onChange={updateField}>{TRAINING_SYSTEM_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select></label>
          </div>
          <label>What should Line Up solve first?
            <select name="priority" value={request.priority} onChange={updateField} required>
              <option value="">Choose one</option>
              {TRAINING_PRIORITY_OPTIONS.map((option) => <option key={option}>{option}</option>)}
            </select>
          </label>
          <label>Good times to contact you<input name="preferredTime" value={request.preferredTime} onChange={updateField} placeholder="Tuesday morning or Thursday after 2pm" /></label>
          <label>Anything else we should know?<textarea name="notes" value={request.notes} onChange={updateField} placeholder="What changes often, where information lives, or what takes managers the most time?" /></label>
          {message ? <p className={submitted ? "form-message success-message" : "form-message"}>{message}</p> : null}
          <button className="primary-button full-width" type="submit" disabled={isSubmitting || submitted}>
            {isSubmitting ? "Sending..." : submitted ? "Demo Request Received" : "Request a 15-Minute Demo"}
          </button>
          <small>No sales presentation marathon. We will simply confirm whether Line Up can save your managers time.</small>
        </form>
      </section>
    </div>
  );
}
