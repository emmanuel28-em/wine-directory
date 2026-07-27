import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { createTrainingAssignment, listStaffGroupsForRestaurant } from "../lib/assignments.js";
import { listCollectionsForRestaurant, saveCollection } from "../lib/collections.js";
import { parseBulkTrainingMaterial } from "../lib/bulkTrainingImport.js";
import { finishImportRun, startImportRun } from "../lib/importRuns.js";
import { buildContentJson, listTrainingDocsForRestaurant, saveTrainingDoc } from "../lib/trainingDocs.js";
import { buildReviewQuestionsForDoc } from "../lib/reviewQuestions.js";

const contentTypeToDocType = {
  foodItem: "food",
  wine: "wine",
  cocktail: "cocktail",
  sop: "sop",
  serviceStandard: "custom",
  menuOverview: "custom",
  tastingMenuCourse: "pastaTasting",
  eventNote: "custom",
  custom: "custom"
};

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
  const [staffGroups, setStaffGroups] = useState([]);
  const [sourceText, setSourceText] = useState("");
  const [defaultCollectionId, setDefaultCollectionId] = useState("");
  const [drafts, setDrafts] = useState([]);
  const [isWorking, setIsWorking] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [message, setMessage] = useState("");
  const [importSummary, setImportSummary] = useState(null);
  const [postImportAssignment, setPostImportAssignment] = useState({
    sectionId: "all",
    targetGroupId: "",
    dueDate: "",
    note: "Review before service."
  });
  const [sourceDetails, setSourceDetails] = useState({ type: "paste", name: "Pasted training material" });

  useEffect(() => {
    async function loadSetupData() {
      if (workspace.status !== "ready") {
        return;
      }

      try {
        const [nextCollections, nextStaffGroups] = await Promise.all([
          listCollectionsForRestaurant(workspace.restaurant.id),
          listStaffGroupsForRestaurant(workspace.restaurant.id)
        ]);
        setCollections(nextCollections);
        setStaffGroups(nextStaffGroups.filter((group) => group.status === "active"));
        setPostImportAssignment((current) => ({
          ...current,
          targetGroupId: current.targetGroupId || nextStaffGroups.find((group) => group.status === "active")?.id || ""
        }));
        const requestedCollectionId = searchParams.get("collection");
        if (requestedCollectionId && nextCollections.some((collection) => collection.id === requestedCollectionId)) {
          setDefaultCollectionId(requestedCollectionId);
        }
      } catch (error) {
        setMessage(error.message || "Could not load your library sections.");
      }
    }

    loadSetupData();
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
      setSourceDetails({ type: "file", name: file.name });
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

  function setSelectedDraftStatus(status) {
    setDrafts((currentDrafts) =>
      currentDrafts.map((draft) => (draft.selected ? { ...draft, status } : draft))
    );
  }

  function setAllDraftSelection(selected) {
    setDrafts((currentDrafts) => currentDrafts.map((draft) => ({ ...draft, selected })));
  }

  function buildReviewQuestionsForDraft({ draft, collectionId, existingDocs }) {
    const tempDoc = {
      id: draft.importId,
      title: draft.title,
      type: contentTypeToDocType[draft.contentType] || "custom",
      category: draft.category,
      collectionId,
      contentJson: buildContentJson({
        ...draft,
        collectionId,
        reviewQuestionsJson: "[]"
      })
    };

    return buildReviewQuestionsForDoc(tempDoc, [tempDoc, ...existingDocs], { preferSaved: false });
  }

  function updatePostImportAssignment(event) {
    const { name, value } = event.target;
    setPostImportAssignment((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function assignImportedSections() {
    if (workspace.status !== "ready" || !importSummary?.sections?.length) {
      return;
    }

    if (!postImportAssignment.targetGroupId) {
      setMessage("Choose a staff group before assigning the imported training.");
      return;
    }

    const selectedSections =
      postImportAssignment.sectionId === "all"
        ? importSummary.sections
        : importSummary.sections.filter((section) => section.id === postImportAssignment.sectionId);

    if (selectedSections.length === 0) {
      setMessage("Choose an imported section to assign.");
      return;
    }

    setIsAssigning(true);
    setMessage("");

    try {
      for (const section of selectedSections) {
        await createTrainingAssignment({
          restaurantId: workspace.restaurant.id,
          userProfileId: workspace.userProfile.id,
          form: {
            itemType: "collection",
            itemId: section.id,
            targetType: "group",
            targetId: postImportAssignment.targetGroupId,
            dueDate: postImportAssignment.dueDate,
            note: postImportAssignment.note || `Review the ${section.name} training before service.`
          }
        });
      }

      const targetGroupName = staffGroups.find((group) => group.id === postImportAssignment.targetGroupId)?.name || "the selected group";
      setImportSummary((current) => ({
        ...current,
        assignedCount: (current.assignedCount || 0) + selectedSections.length
      }));
      setMessage(`${selectedSections.length} section${selectedSections.length === 1 ? "" : "s"} assigned to ${targetGroupName}.`);
    } catch (error) {
      setMessage(error.message || "Could not assign this imported training.");
    } finally {
      setIsAssigning(false);
    }
  }

  async function importDrafts(statusOverride = "") {
    if (workspace.status !== "ready" || selectedCount === 0) {
      return;
    }

    setIsWorking(true);
    setMessage("");
    let createdCount = 0;
    let publishedCreatedCount = 0;
    let skippedCount = 0;
    let importRunId = "";

    try {
      try {
        const importRun = await startImportRun({
          restaurantId: workspace.restaurant.id,
          userProfileId: workspace.userProfile.id,
          sourceType: sourceDetails.type,
          sourceName: sourceDetails.name,
          detectedCount: drafts.length,
          selectedCount
        });
        importRunId = importRun.id;
      } catch {
        // Operational history must never block a manager from saving training.
      }

      const [existingDocs, latestCollections] = await Promise.all([
        listTrainingDocsForRestaurant(workspace.restaurant.id),
        listCollectionsForRestaurant(workspace.restaurant.id)
      ]);
      const existingKeys = new Set(
        existingDocs.map((doc) => `${(doc.title || "").trim().toLowerCase()}::${doc.collectionId || ""}`)
      );
      const collectionIdByName = new Map(latestCollections.map((collection) => [normalizeName(collection.name), collection.id]));
      const collectionNameById = new Map(latestCollections.map((collection) => [collection.id, collection.name]));
      const touchedSectionIds = new Set();
      const touchedSections = [];

      function rememberSection(sectionId, sectionName) {
        if (!sectionId || touchedSectionIds.has(sectionId)) {
          return;
        }

        touchedSectionIds.add(sectionId);
        touchedSections.push({
          id: sectionId,
          name: sectionName || "Imported section"
        });
      }

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
            collectionNameById.set(collectionId, createdCollection.name);
          }
        }

        const duplicateKey = `${draft.title.trim().toLowerCase()}::${collectionId || ""}`;

        if (existingKeys.has(duplicateKey)) {
          skippedCount += 1;
          continue;
        }

        const reviewQuestions = buildReviewQuestionsForDraft({
          draft,
          collectionId,
          existingDocs
        });

        const finalStatus = statusOverride || draft.status || "draft";
        rememberSection(collectionId, collectionNameById.get(collectionId) || draft.suggestedCollectionName);

        await saveTrainingDoc({
          form: {
            ...draft,
            collectionId,
            status: finalStatus,
            reviewQuestionsJson: JSON.stringify(reviewQuestions)
          },
          editingDocId: null,
          restaurantId: workspace.restaurant.id,
          userProfileId: workspace.userProfile.id
        });
        createdCount += 1;
        if (finalStatus === "published") publishedCreatedCount += 1;
        existingKeys.add(duplicateKey);
      }

      setDrafts([]);
      setSourceText("");
      const nextCollections = await listCollectionsForRestaurant(workspace.restaurant.id).catch(() => collections);
      setCollections(nextCollections);
      setImportSummary({
        createdCount,
        skippedCount,
        publishedCreatedCount,
        sections: touchedSections
      });
      await finishImportRun({ importRunId, status: "completed", createdCount, skippedCount }).catch(() => null);
      const draftCount = createdCount - publishedCreatedCount;
      setMessage(
        `${createdCount} training page${createdCount === 1 ? " was" : "s were"} saved. ${publishedCreatedCount} published and ${draftCount} kept as ${draftCount === 1 ? "a draft" : "drafts"}.${
          skippedCount ? ` ${skippedCount} possible duplicate${skippedCount === 1 ? " was" : "s were"} skipped.` : ""
        } Review the new pages, add photos, check the card questions, then assign the right sections to staff.`
      );
    } catch (error) {
      await finishImportRun({
        importRunId,
        status: "failed",
        createdCount,
        skippedCount,
        errorMessage: error.message || "Import stopped before completion."
      }).catch(() => null);
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
            <div className="import-review-actions">
              <button className="secondary-button" type="button" onClick={() => setAllDraftSelection(true)}>
                Select all
              </button>
              <button className="secondary-button" type="button" onClick={() => setAllDraftSelection(false)}>
                Clear all
              </button>
              <button className="secondary-button" type="button" onClick={() => setSelectedDraftStatus("draft")} disabled={selectedCount === 0}>
                Keep selected as drafts
              </button>
              <button className="secondary-button" type="button" onClick={() => setSelectedDraftStatus("published")} disabled={selectedCount === 0}>
                Mark selected published
              </button>
              <button className="primary-button" type="button" onClick={() => importDrafts()} disabled={isWorking || selectedCount === 0}>
                {isWorking ? "Saving..." : `Save ${selectedCount}`}
              </button>
              <button className="primary-button accent-button" type="button" onClick={() => importDrafts("published")} disabled={isWorking || selectedCount === 0}>
                Publish selected
              </button>
            </div>
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

                <div className="import-draft-checklist">
                  <span className={draft.title ? "status-badge status-published" : "status-badge status-draft"}>Title</span>
                  <span className={draft.collectionId || draft.suggestedCollectionName ? "status-badge status-published" : "status-badge status-draft"}>Section</span>
                  <span className={draft.summary || draft.body ? "status-badge status-published" : "status-badge status-draft"}>Notes</span>
                  <span className={draft.quizFactsJson && draft.quizFactsJson !== "[]" ? "status-badge status-published" : "status-badge status-draft"}>Quiz facts</span>
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
            <p>
              {importSummary.createdCount} page{importSummary.createdCount === 1 ? "" : "s"} saved.
              {importSummary.publishedCreatedCount ? ` ${importSummary.publishedCreatedCount} published for staff.` : " Publish drafts when they are ready."}
              {importSummary.sections?.length ? ` Imported into ${importSummary.sections.length} section${importSummary.sections.length === 1 ? "" : "s"}.` : ""}
            </p>
          </div>

          <div className="post-import-assignment-card">
            <div>
              <p className="eyebrow">Assign now</p>
              <h3>Send this training to the right team</h3>
              <p className="helper-text">
                Assign the imported section to Servers, Bar Team, Captains, New Hires, or any group you created.
                Staff will see the cards as assigned study work.
              </p>
            </div>

            {staffGroups.length === 0 ? (
              <div className="empty-panel">
                Create a staff group first, then come back to assign imported sections.
                <Link className="secondary-button full-width" to="/manager/assignments">Create staff groups</Link>
              </div>
            ) : importSummary.sections?.length ? (
              <div className="post-import-assignment-form">
                <div className="field-pair">
                  <label>
                    Imported section
                    <select name="sectionId" value={postImportAssignment.sectionId} onChange={updatePostImportAssignment}>
                      <option value="all">All imported sections</option>
                      {importSummary.sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Assign to
                    <select name="targetGroupId" value={postImportAssignment.targetGroupId} onChange={updatePostImportAssignment}>
                      <option value="">Choose group</option>
                      {staffGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="field-pair">
                  <label>
                    Due date optional
                    <input name="dueDate" type="date" value={postImportAssignment.dueDate} onChange={updatePostImportAssignment} />
                  </label>

                  <label>
                    Staff note optional
                    <input
                      name="note"
                      value={postImportAssignment.note}
                      onChange={updatePostImportAssignment}
                      placeholder="Example: Study before pre-shift."
                    />
                  </label>
                </div>

                <button
                  className="primary-button full-width"
                  type="button"
                  onClick={assignImportedSections}
                  disabled={isAssigning || !postImportAssignment.targetGroupId}
                >
                  {isAssigning ? "Assigning..." : "Assign imported training"}
                </button>
                {importSummary.assignedCount ? (
                  <p className="helper-text">{importSummary.assignedCount} imported section assignment{importSummary.assignedCount === 1 ? "" : "s"} created.</p>
                ) : null}
              </div>
            ) : (
              <div className="empty-panel">No imported section was available to assign. Review the pages and add them to a section first.</div>
            )}
          </div>

          <div className="import-next-actions">
            <Link className="secondary-button" to="/manager/content">Review and add photos</Link>
            <Link className="secondary-button" to="/manager/assignments">Open assignments</Link>
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
