import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { listCollectionsForRestaurant } from "../lib/collections.js";
import { parseBulkTrainingMaterial } from "../lib/bulkTrainingImport.js";
import { listTrainingDocsForRestaurant, saveTrainingDoc } from "../lib/trainingDocs.js";

function updateDraftAtIndex(drafts, index, field, value) {
  return drafts.map((draft, draftIndex) => (draftIndex === index ? { ...draft, [field]: value } : draft));
}

export default function ManagerImportPage() {
  const workspace = useCurrentWorkspace();
  const [collections, setCollections] = useState([]);
  const [sourceText, setSourceText] = useState("");
  const [defaultCollectionId, setDefaultCollectionId] = useState("");
  const [drafts, setDrafts] = useState([]);
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadCollections() {
      if (workspace.status !== "ready") {
        return;
      }

      try {
        setCollections(await listCollectionsForRestaurant(workspace.restaurant.id));
      } catch (error) {
        setMessage(error.message || "Could not load your library sections.");
      }
    }

    loadCollections();
  }, [workspace.status, workspace.restaurant?.id]);

  const selectedCount = useMemo(() => drafts.filter((draft) => draft.selected).length, [drafts]);

  function reviewMaterial() {
    const parsedDrafts = parseBulkTrainingMaterial(sourceText).map((draft) => ({
      ...draft,
      collectionId: defaultCollectionId
    }));

    if (parsedDrafts.length === 0) {
      setMessage("Paste at least one menu item, tech sheet, cocktail spec, or SOP first.");
      return;
    }

    setDrafts(parsedDrafts);
    setMessage(
      parsedDrafts.length === 1
        ? "One page is ready to review. If you expected more, place --- on its own line between items and try again."
        : `${parsedDrafts.length} pages are ready to review. Nothing has been saved yet.`
    );
  }

  function updateDraft(index, field, value) {
    setDrafts((currentDrafts) => updateDraftAtIndex(currentDrafts, index, field, value));
  }

  function removeDraft(index) {
    setDrafts((currentDrafts) => currentDrafts.filter((_, draftIndex) => draftIndex !== index));
  }

  async function importDrafts() {
    if (workspace.status !== "ready" || selectedCount === 0) {
      return;
    }

    setIsWorking(true);
    setMessage("");
    let createdCount = 0;
    let skippedCount = 0;

    try {
      const existingDocs = await listTrainingDocsForRestaurant(workspace.restaurant.id);
      const existingKeys = new Set(
        existingDocs.map((doc) => `${(doc.title || "").trim().toLowerCase()}::${doc.collectionId || ""}`)
      );

      for (const draft of drafts.filter((item) => item.selected)) {
        if (!draft.title.trim()) {
          throw new Error("Every selected draft needs a title.");
        }

        const duplicateKey = `${draft.title.trim().toLowerCase()}::${draft.collectionId || ""}`;

        if (existingKeys.has(duplicateKey)) {
          skippedCount += 1;
          continue;
        }

        await saveTrainingDoc({
          form: {
            ...draft,
            status: "draft"
          },
          editingDocId: null,
          restaurantId: workspace.restaurant.id,
          userProfileId: workspace.userProfile.id
        });
        createdCount += 1;
        existingKeys.add(duplicateKey);
      }

      setDrafts([]);
      setSourceText("");
      setMessage(
        `${createdCount} training page${createdCount === 1 ? " was" : "s were"} saved as a draft.${
          skippedCount ? ` ${skippedCount} possible duplicate${skippedCount === 1 ? " was" : "s were"} skipped.` : ""
        } Review and publish the new pages when they are ready for staff.`
      );
    } catch (error) {
      setMessage(
        `${createdCount} page${createdCount === 1 ? " was" : "s were"} created before the import stopped. ${error.message || "The remaining pages could not be imported."}`
      );
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Add training</p>
          <h1>Paste the material you already have</h1>
          <p>Line Up separates your notes into pages. You review everything before staff can see it.</p>
        </div>
        <Link className="secondary-button" to="/manager/content">
          Back to training
        </Link>
      </div>

      <div className="workflow-strip">
        <span>1. Paste your material</span>
        <span>2. Check what Line Up found</span>
        <span>3. Save as drafts</span>
      </div>

      {message ? <p className="form-message page-message">{message}</p> : null}

      <section className="operator-section">
        <div className="import-workspace-grid">
          <form className="form-card" onSubmit={(event) => event.preventDefault()}>
            <h2>Paste your notes</h2>
            <p className="helper-text">
              Line Up recognizes headings such as Menu Description, One Liner, Allergies, Ingredients, Producer,
              Varietal, Region, Glassware, Garnish, and Details.
            </p>

            <label>
              Library section optional
              <select value={defaultCollectionId} onChange={(event) => setDefaultCollectionId(event.target.value)}>
                <option value="">Choose later</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Menu notes, tech sheets, or procedures
              <textarea
                className="import-textarea"
                value={sourceText}
                onChange={(event) => setSourceText(event.target.value)}
                placeholder={`Burrata Reale\n\nMenu description:\nMaitake mushroom, black truffle, parsley\n\nOne Liner:\nOur burrata with maitake and truffle puree.\n\nAllergies:\nDairy, Mushroom\n\nIngredients:\nBurrata\nRoasted maitake\n\nDetails:\nFull training notes...`}
              />
            </label>

            <p className="helper-text">For unusual formats, put <strong>---</strong> on its own line between items.</p>

            <button className="primary-button full-width" type="button" onClick={reviewMaterial} disabled={isWorking}>
              Find training pages
            </button>
          </form>

          <aside className="form-card import-guidance-card">
            <p className="eyebrow">You stay in control</p>
            <h2>Staff will not see anything yet</h2>
            <p>Every page is saved as a draft. Review the details, add quiz facts, and publish it only when it is ready.</p>
            <h3>Best results</h3>
            <ul className="plain-list">
              <li>Keep the item name on its own line.</li>
              <li>Keep familiar headings from the original document.</li>
              <li>Review allergens and ingredients carefully.</li>
              <li>Choose a library section that matches the restaurant menu.</li>
            </ul>
          </aside>
        </div>
      </section>

      {drafts.length > 0 ? (
        <section className="operator-section">
          <div className="operator-section-heading">
            <div>
              <p className="eyebrow">Review</p>
              <h2>Check what Line Up found</h2>
              <p>{selectedCount} of {drafts.length} drafts selected for import.</p>
            </div>
            <button className="primary-button" type="button" onClick={importDrafts} disabled={isWorking || selectedCount === 0}>
              {isWorking ? "Saving..." : `Save ${selectedCount} Draft${selectedCount === 1 ? "" : "s"}`}
            </button>
          </div>

          <div className="import-draft-list">
            {drafts.map((draft, index) => (
              <article className="form-card import-draft-card" key={draft.importId}>
                <div className="import-draft-heading">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={draft.selected}
                      onChange={(event) => updateDraft(index, "selected", event.target.checked)}
                    />
                    Save this page
                  </label>
                  <button className="quiet-danger-button" type="button" onClick={() => removeDraft(index)}>
                    Remove
                  </button>
                </div>

                <div className="field-pair">
                  <label>
                    Title
                    <input value={draft.title} onChange={(event) => updateDraft(index, "title", event.target.value)} required />
                  </label>
                  <label>
                    Training type
                    <select value={draft.contentType} onChange={(event) => updateDraft(index, "contentType", event.target.value)}>
                      <option value="foodItem">Food Item</option>
                      <option value="wine">Wine</option>
                      <option value="cocktail">Cocktail</option>
                      <option value="sop">SOP</option>
                      <option value="serviceStandard">Service Standard</option>
                      <option value="custom">Custom</option>
                    </select>
                  </label>
                </div>

                <label>
                  Library section
                  <select value={draft.collectionId} onChange={(event) => updateDraft(index, "collectionId", event.target.value)}>
                    <option value="">Unassigned</option>
                    {collections.map((collection) => (
                      <option key={collection.id} value={collection.id}>
                        {collection.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Short description
                  <textarea value={draft.summary} onChange={(event) => updateDraft(index, "summary", event.target.value)} />
                </label>

                <label>
                  Training details
                  <textarea className="large-textarea" value={draft.body} onChange={(event) => updateDraft(index, "body", event.target.value)} />
                </label>

                <div className="field-pair">
                  <label>
                    Ingredients
                    <textarea value={draft.ingredients} onChange={(event) => updateDraft(index, "ingredients", event.target.value)} />
                  </label>
                  <label>
                    Allergens
                    <textarea value={draft.allergens} onChange={(event) => updateDraft(index, "allergens", event.target.value)} />
                  </label>
                </div>

                <label>
                  Service Notes
                  <textarea value={draft.serviceNotes} onChange={(event) => updateDraft(index, "serviceNotes", event.target.value)} />
                </label>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
