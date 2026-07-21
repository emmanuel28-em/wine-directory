import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { listCollectionsForRestaurant, saveCollection } from "../lib/collections.js";
import { parseBulkTrainingMaterial } from "../lib/bulkTrainingImport.js";
import { listTrainingDocsForRestaurant, saveTrainingDoc } from "../lib/trainingDocs.js";

function updateDraftAtIndex(drafts, index, field, value) {
  return drafts.map((draft, draftIndex) => (draftIndex === index ? { ...draft, [field]: value } : draft));
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

export default function ManagerImportPage() {
  const workspace = useCurrentWorkspace();
  const [searchParams] = useSearchParams();
  const [collections, setCollections] = useState([]);
  const [sourceText, setSourceText] = useState("");
  const [defaultCollectionId, setDefaultCollectionId] = useState("");
  const [drafts, setDrafts] = useState([]);
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [importSummary, setImportSummary] = useState(null);

  useEffect(() => {
    async function loadCollections() {
      if (workspace.status !== "ready") {
        return;
      }

      try {
        const nextCollections = await listCollectionsForRestaurant(workspace.restaurant.id);
        setCollections(nextCollections);
        const requestedCollectionId = searchParams.get("collection");
        if (requestedCollectionId && nextCollections.some((collection) => collection.id === requestedCollectionId)) {
          setDefaultCollectionId(requestedCollectionId);
        }
      } catch (error) {
        setMessage(error.message || "Could not load your library sections.");
      }
    }

    loadCollections();
  }, [workspace.status, workspace.restaurant?.id, searchParams]);

  const selectedCount = useMemo(() => drafts.filter((draft) => draft.selected).length, [drafts]);

  function reviewMaterial() {
    setImportSummary(null);
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
        ? "One draft page is ready. If you expected more, place --- on its own line between items and try again."
        : `${parsedDrafts.length} draft pages are ready. Line Up also suggested library sections. Nothing has been saved yet.`
    );
  }

  async function loadTextFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedExtensions = [".txt", ".md", ".csv"];
    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowedExtensions.includes(extension)) {
      setMessage("This importer can read .txt, .md, and .csv files. For PDFs or Word documents, paste the text here or request setup help.");
      event.target.value = "";
      return;
    }

    try {
      setSourceText(await file.text());
      setMessage(`${file.name} is ready. Select “Find training pages” to review what Line Up finds.`);
    } catch {
      setMessage("Line Up could not read that file. Try pasting its text instead.");
    }
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
    let publishedCreatedCount = 0;
    let skippedCount = 0;

    try {
      const [existingDocs, latestCollections] = await Promise.all([
        listTrainingDocsForRestaurant(workspace.restaurant.id),
        listCollectionsForRestaurant(workspace.restaurant.id)
      ]);
      const existingKeys = new Set(
        existingDocs.map((doc) => `${(doc.title || "").trim().toLowerCase()}::${doc.collectionId || ""}`)
      );
      const collectionIdByName = new Map(latestCollections.map((collection) => [normalizeName(collection.name), collection.id]));

      for (const draft of drafts.filter((item) => item.selected)) {
        if (!draft.title.trim()) {
          throw new Error("Every selected draft needs a title.");
        }

        let collectionId = draft.collectionId;

        if (!collectionId && draft.suggestedCollectionName) {
          const suggestedKey = normalizeName(draft.suggestedCollectionName);
          collectionId = collectionIdByName.get(suggestedKey);

          if (!collectionId) {
            const createdCollection = await saveCollection({
              collection: {
                name: draft.suggestedCollectionName,
                description: "Created from imported training material.",
                categoryType: draft.suggestedCollectionType || "custom",
                status: "active",
                sortOrder: latestCollections.length + collectionIdByName.size + 1
              },
              restaurantId: workspace.restaurant.id,
              userProfileId: workspace.userProfile.id,
              editingCollectionId: null
            });
            collectionId = createdCollection.id;
            collectionIdByName.set(suggestedKey, collectionId);
          }
        }

        const duplicateKey = `${draft.title.trim().toLowerCase()}::${collectionId || ""}`;

        if (existingKeys.has(duplicateKey)) {
          skippedCount += 1;
          continue;
        }

        await saveTrainingDoc({
          form: {
            ...draft,
            collectionId,
            status: draft.status || "draft"
          },
          editingDocId: null,
          restaurantId: workspace.restaurant.id,
          userProfileId: workspace.userProfile.id
        });
        createdCount += 1;
        if (draft.status === "published") publishedCreatedCount += 1;
        existingKeys.add(duplicateKey);
      }

      setDrafts([]);
      setSourceText("");
      setImportSummary({ createdCount, skippedCount });
      const draftCount = createdCount - publishedCreatedCount;
      setMessage(
        `${createdCount} training page${createdCount === 1 ? " was" : "s were"} saved. ${publishedCreatedCount} published and ${draftCount} kept as ${draftCount === 1 ? "a draft" : "drafts"}.${
          skippedCount ? ` ${skippedCount} possible duplicate${skippedCount === 1 ? " was" : "s were"} skipped.` : ""
        } Review the new pages, add photos, then publish anything that should be visible to staff.`
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
          <p className="eyebrow">Library builder</p>
          <h1>Let Line Up create your training library for you</h1>
          <p>Paste a large menu packet, wine list, cocktail specs, SOPs, or manager notes. Line Up separates the material into draft pages and suggests sections.</p>
        </div>
        <Link className="secondary-button" to="/manager/content">
          Back to training
        </Link>
      </div>

      <div className="workflow-strip">
        <span>1. Paste everything</span>
        <span>2. Review the draft library</span>
        <span>3. Save pages and sections</span>
        <span>4. Add photos where needed</span>
      </div>

      {message ? <p className="form-message page-message">{message}</p> : null}

      <section className="operator-section">
        <div className="import-workspace-grid">
          <form className="form-card" onSubmit={(event) => event.preventDefault()}>
            <h2>Paste your existing materials</h2>
            <p className="helper-text">
              This is designed for a massive copy paste from Google Docs, menus, wine tech sheets, cocktail specs,
              opening notes, or SOPs. Line Up looks for familiar headings and turns them into reviewable draft pages.
            </p>

            <label>
              Put everything into one section optional
              <select value={defaultCollectionId} onChange={(event) => setDefaultCollectionId(event.target.value)}>
                <option value="">Let Line Up suggest sections</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Or load a text document
              <input type="file" accept=".txt,.md,.csv,text/plain,text/markdown,text/csv" onChange={loadTextFile} />
              <small>Works with text, Markdown, and CSV files. For PDFs or Word docs, copy the text and paste it below for now.</small>
            </label>

            <label>
              Menus, tech sheets, SOPs, or training notes
              <textarea
                className="import-textarea"
                value={sourceText}
                onChange={(event) => setSourceText(event.target.value)}
                placeholder={`Burrata Reale\n\nMenu description:\nMaitake mushroom, black truffle, parsley\n\nOne Liner:\nOur burrata with maitake and truffle puree.\n\nAllergies:\nDairy, Mushroom\n\nIngredients:\nBurrata\nRoasted maitake\n\nDetails:\nFull training notes...`}
              />
            </label>

            <p className="helper-text">
              Tip: for unusual formats, put <strong>---</strong> on its own line between items. Photos are added after the pages are created.
            </p>

            <button className="primary-button full-width" type="button" onClick={reviewMaterial} disabled={isWorking}>
              Build draft training library
            </button>
          </form>

          <aside className="form-card import-guidance-card">
            <p className="eyebrow">What Line Up does</p>
            <h2>It organizes first. You approve before staff sees it.</h2>
            <p>Line Up creates draft pages, suggests library sections, and pulls useful quiz facts from headings like allergens, ingredients, region, glassware, garnish, and details.</p>
            <h3>Best way to add images</h3>
            <p className="helper-text">
              Import the written material first. Then open each new page in Training Library and attach the best photo for that item.
              Later, the easiest upgrade is a bulk image matcher that pairs uploaded photos by file name.
            </p>
            <h3>Best results</h3>
            <ul className="plain-list">
              <li>Keep the item name on its own line.</li>
              <li>Keep familiar headings from the original document.</li>
              <li>Review allergens and ingredients carefully.</li>
              <li>Let Line Up suggest sections, then adjust anything that looks wrong.</li>
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
              <p>{selectedCount} of {drafts.length} draft pages selected. You can edit titles, sections, notes, and visibility before saving.</p>
            </div>
            <button className="primary-button" type="button" onClick={importDrafts} disabled={isWorking || selectedCount === 0}>
              {isWorking ? "Saving..." : `Save ${selectedCount} Training Page${selectedCount === 1 ? "" : "s"}`}
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
                    <option value="">Use Line Up suggestion: {draft.suggestedCollectionName || "Training Library"}</option>
                    {collections.map((collection) => (
                      <option key={collection.id} value={collection.id}>
                        {collection.name}
                      </option>
                    ))}
                  </select>
                  <small>Line Up will create this section if it does not already exist.</small>
                </label>

                <label>
                  Staff visibility
                  <select value={draft.status} onChange={(event) => updateDraft(index, "status", event.target.value)}>
                    <option value="draft">Draft — managers only</option>
                    <option value="published">Published — visible to staff</option>
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

      {importSummary ? (
        <section className="success-panel import-next-steps">
          <div>
            <p className="eyebrow">Material added</p>
            <h2>Your training pages are ready for the next step.</h2>
            <p>Review the new pages, add photos where needed, create a quiz, or invite one staff member to begin testing the workspace.</p>
          </div>
          <div className="import-next-actions">
            <Link className="secondary-button" to="/manager/content">Review and add photos</Link>
            <Link className="primary-button" to="/manager/quizzes">Generate a quiz</Link>
            <Link className="secondary-button" to="/manager/invite-team">Invite your team</Link>
          </div>
        </section>
      ) : null}

      <section className="setup-help-strip">
        <div>
          <strong>Have a PDF, Word document, image-heavy menu, or a large training manual?</strong>
          <span>Use setup help if you want Line Up to organize the first library with you.</span>
        </div>
        <div>
          <Link to="/managed-setup">Request setup help</Link>
          <Link to="/report-issue">Report a problem</Link>
        </div>
      </section>
    </section>
  );
}
