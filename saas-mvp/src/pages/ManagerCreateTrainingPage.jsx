import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { listCollectionsForRestaurant } from "../lib/collections.js";
import { uploadFileAsset } from "../lib/fileAssets.js";
import { buildReviewQuestionsForDoc, reviewQuestionCount } from "../lib/reviewQuestions.js";
import {
  buildContentJson,
  emptyTrainingDocForm,
  listTrainingDocsForRestaurant,
  saveTrainingDoc
} from "../lib/trainingDocs.js";

const contentTypes = [
  ["foodItem", "Food or menu item"],
  ["wine", "Wine"],
  ["cocktail", "Cocktail"],
  ["sop", "Procedure or SOP"],
  ["serviceStandard", "Service standard"],
  ["custom", "Other training"]
];

const modelTypes = {
  foodItem: "food",
  wine: "wine",
  cocktail: "cocktail",
  sop: "sop",
  serviceStandard: "custom",
  custom: "custom"
};

function firstSentence(value) {
  const cleanValue = String(value || "").trim();
  return (cleanValue.split(/(?<=[.!?])\s+/)[0] || cleanValue).slice(0, 280);
}

function cleanQuestions(questions) {
  return questions
    .map((question) => {
      const correctAnswer = String(question.correctAnswer || "").trim();
      const choices = [...new Set((question.choices || []).map((choice) => String(choice || "").trim()).filter(Boolean))];

      return {
        prompt: String(question.prompt || "").trim(),
        choices: choices.includes(correctAnswer) ? choices : [correctAnswer, ...choices].filter(Boolean),
        correctAnswer,
        explanation: String(question.explanation || "").trim()
      };
    })
    .filter((question) => question.prompt && question.correctAnswer && question.choices.length >= 2)
    .slice(0, reviewQuestionCount);
}

export default function ManagerCreateTrainingPage() {
  const workspace = useCurrentWorkspace();
  const [collections, setCollections] = useState([]);
  const [docs, setDocs] = useState([]);
  const [form, setForm] = useState({
    ...emptyTrainingDocForm,
    contentType: "foodItem",
    sectionIds: []
  });
  const [questions, setQuestions] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [message, setMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [savedDoc, setSavedDoc] = useState(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadPage() {
      if (workspace.status !== "ready") return;

      try {
        const [nextCollections, nextDocs] = await Promise.all([
          listCollectionsForRestaurant(workspace.restaurant.id),
          listTrainingDocsForRestaurant(workspace.restaurant.id)
        ]);

        if (isCurrent) {
          setCollections(nextCollections.filter((collection) => collection.status !== "archived"));
          setDocs(nextDocs);
        }
      } catch (error) {
        if (isCurrent) setMessage(error.message || "Could not load your training library.");
      }
    }

    loadPage();
    return () => {
      isCurrent = false;
    };
  }, [workspace.status, workspace.restaurant?.id]);

  const recentDocs = useMemo(
    () =>
      [...docs]
        .sort((left, right) => new Date(right.updatedAt || right.createdAt || 0) - new Date(left.updatedAt || left.createdAt || 0))
        .slice(0, 6),
    [docs]
  );

  function updateForm(event) {
    const { name, value } = event.target;
    setSavedDoc(null);
    setQuestions([]);
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleSection(sectionId) {
    setSavedDoc(null);
    setQuestions([]);
    setForm((current) => ({
      ...current,
      sectionIds: current.sectionIds.includes(sectionId)
        ? current.sectionIds.filter((id) => id !== sectionId)
        : [...current.sectionIds, sectionId]
    }));
  }

  function buildPreparedForm(status, reviewQuestions = questions) {
    const selectedSection = collections.find((collection) => form.sectionIds.includes(collection.id));

    return {
      ...form,
      collectionId: form.sectionIds[0] || "",
      category: selectedSection?.name || contentTypes.find(([value]) => value === form.contentType)?.[1] || "Training",
      status,
      summary: firstSentence(form.body),
      reviewQuestionsJson: JSON.stringify(reviewQuestions)
    };
  }

  function generateQuestions() {
    if (!form.title.trim() || !form.body.trim()) {
      setMessage("Add a title and training notes before generating questions.");
      return [];
    }

    const preparedForm = buildPreparedForm("draft", []);
    const temporaryDoc = {
      id: "new-training-page",
      title: preparedForm.title,
      type: modelTypes[preparedForm.contentType] || "custom",
      category: preparedForm.category,
      contentJson: buildContentJson(preparedForm)
    };
    const nextQuestions = buildReviewQuestionsForDoc(temporaryDoc, [temporaryDoc, ...docs], { preferSaved: false });

    setQuestions(nextQuestions);
    setMessage(`${nextQuestions.length} review questions are ready. Editing them is optional.`);
    return nextQuestions;
  }

  function updateQuestion(index, field, value) {
    setQuestions((current) =>
      current.map((question, questionIndex) =>
        questionIndex === index
          ? {
              ...question,
              [field]: field === "choices" ? value.split("\n") : value
            }
          : question
      )
    );
  }

  async function savePage(status) {
    if (!form.title.trim()) {
      setMessage("Give this training page a title.");
      return;
    }

    if (!form.body.trim()) {
      setMessage("Write or paste the training information first.");
      return;
    }

    if (imageFile && !String(imageFile.type || "").startsWith("image/")) {
      setMessage("Choose an image file for the training photo.");
      return;
    }

    setIsWorking(true);
    setMessage("");

    try {
      let reviewQuestions = cleanQuestions(questions);

      if (reviewQuestions.length < reviewQuestionCount) {
        const preparedWithoutQuestions = buildPreparedForm(status, []);
        const temporaryDoc = {
          id: "new-training-page",
          title: preparedWithoutQuestions.title,
          type: modelTypes[preparedWithoutQuestions.contentType] || "custom",
          category: preparedWithoutQuestions.category,
          contentJson: buildContentJson(preparedWithoutQuestions)
        };
        reviewQuestions = buildReviewQuestionsForDoc(temporaryDoc, [temporaryDoc, ...docs], { preferSaved: false });
      }

      if (reviewQuestions.length < reviewQuestionCount) {
        throw new Error("Add a little more training detail so Line Up can create five useful review questions.");
      }

      const createdDoc = await saveTrainingDoc({
        form: buildPreparedForm(status, reviewQuestions),
        editingDocId: null,
        restaurantId: workspace.restaurant.id,
        userProfileId: workspace.userProfile.id
      });

      if (imageFile) {
        await uploadFileAsset({
          restaurantId: workspace.restaurant.id,
          trainingDocId: createdDoc.id,
          file: imageFile,
          uploadedBy: workspace.userProfile.id
        });
      }

      setSavedDoc(createdDoc);
      setDocs((current) => [createdDoc, ...current]);
      setMessage(
        status === "published"
          ? `${createdDoc.title} is published with five staff review questions.`
          : `${createdDoc.title} is saved as a draft with five review questions.`
      );
      setForm({
        ...emptyTrainingDocForm,
        contentType: form.contentType,
        sectionIds: form.sectionIds
      });
      setQuestions([]);
      setImageFile(null);
    } catch (error) {
      setMessage(error.message || "Could not save this training page.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <section className="page-section simple-training-page">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Training</p>
          <h1>Create a training page</h1>
          <p>Write it the way you would explain it at pre-shift. Line Up turns it into a staff page and creates the review questions.</p>
        </div>
        <Link className="secondary-button" to="/manager/content">View training library</Link>
      </div>

      {message ? <p className="form-message page-message">{message}</p> : null}

      {workspace.status === "loading" ? <div className="empty-panel">Opening your training workspace...</div> : null}

      {workspace.status === "ready" ? (
        <>
          <form className="simple-training-composer" onSubmit={(event) => event.preventDefault()}>
            <div className="simple-composer-heading">
              <div>
                <span className="status-badge status-draft">New training</span>
                <h2>What does the team need to know?</h2>
              </div>
              <p>Only the title and training notes are required.</p>
            </div>

            <label>
              Title
              <input
                name="title"
                value={form.title}
                onChange={updateForm}
                placeholder="Example: New summer cocktail, Burrata Reale, or Closing sidework"
                required
              />
            </label>

            <label>
              Type
              <select name="contentType" value={form.contentType} onChange={updateForm}>
                {contentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>

            <label>
              Training information
              <textarea
                className="simple-training-editor"
                name="body"
                value={form.body}
                onChange={updateForm}
                placeholder={"Write or paste everything staff should know.\n\nUse normal sentences, headings, or bullet points. Include ingredients, allergens, talking points, steps, or service notes whenever they matter."}
                required
              />
            </label>

            <fieldset className="simple-section-picker">
              <legend>Where should staff find it? <span>Optional</span></legend>
              {collections.length === 0 ? (
                <p className="helper-text">No sections exist yet. Save the page now, or ask Line Up to organize the complete library for you.</p>
              ) : (
                <div className="simple-section-options">
                  {collections.map((collection) => (
                    <label key={collection.id}>
                      <input
                        type="checkbox"
                        checked={form.sectionIds.includes(collection.id)}
                        onChange={() => toggleSection(collection.id)}
                      />
                      <span>{collection.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            <label className="simple-image-picker">
              Add a photo <span>Optional</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
                onChange={(event) => setImageFile(event.target.files?.[0] || null)}
              />
              <small>{imageFile ? `${imageFile.name} will be attached when you save.` : "Add a dish, bottle, cocktail, equipment, or procedure photo."}</small>
            </label>

            <details className="simple-question-review">
              <summary>
                <span>
                  <strong>Review quiz questions</strong>
                  <small>Optional. Line Up creates five automatically.</small>
                </span>
              </summary>

              <button className="secondary-button" type="button" onClick={generateQuestions}>
                {questions.length ? "Regenerate questions" : "Preview questions"}
              </button>

              {questions.map((question, index) => (
                <article key={`${index}-${question.prompt}`}>
                  <strong>Question {index + 1}</strong>
                  <label>
                    Question
                    <input value={question.prompt} onChange={(event) => updateQuestion(index, "prompt", event.target.value)} />
                  </label>
                  <label>
                    Answer choices, one per line
                    <textarea value={(question.choices || []).join("\n")} onChange={(event) => updateQuestion(index, "choices", event.target.value)} />
                  </label>
                  <label>
                    Correct answer
                    <input value={question.correctAnswer} onChange={(event) => updateQuestion(index, "correctAnswer", event.target.value)} />
                  </label>
                </article>
              ))}
            </details>

            <div className="simple-composer-actions">
              <button className="secondary-button" type="button" disabled={isWorking} onClick={() => savePage("draft")}>
                {isWorking ? "Saving..." : "Save draft"}
              </button>
              <button className="primary-button" type="button" disabled={isWorking} onClick={() => savePage("published")}>
                {isWorking ? "Publishing..." : "Publish for staff"}
              </button>
            </div>
          </form>

          {savedDoc ? (
            <section className="success-panel simple-training-success">
              <div>
                <p className="eyebrow">Saved</p>
                <h2>{savedDoc.title}</h2>
                <p>The page and its review questions are ready.</p>
              </div>
              <div className="form-button-row">
                <Link className="secondary-button" to={`/manager/content?edit=${savedDoc.id}`}>Edit details</Link>
                <Link className="primary-button" to={`/training-library?open=${savedDoc.id}`}>View as staff</Link>
              </div>
            </section>
          ) : null}

          <section className="simple-training-recent">
            <div className="operator-section-heading">
              <div>
                <p className="eyebrow">Your work</p>
                <h2>Recently updated training</h2>
              </div>
              <Link to="/manager/content">See the full library</Link>
            </div>

            {recentDocs.length === 0 ? (
              <p className="empty-panel">Your first training page will appear here.</p>
            ) : (
              <div className="operator-card-list">
                {recentDocs.map((doc) => (
                  <article className="operator-list-card" key={doc.id}>
                    <div>
                      <span className={`status-badge status-${doc.status}`}>{doc.status}</span>
                      <h4>{doc.title}</h4>
                      <p>{doc.category || doc.type}</p>
                    </div>
                    <Link className="secondary-button" to={`/manager/content?edit=${doc.id}`}>Edit</Link>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="setup-help-strip">
            <div>
              <p className="eyebrow">Prefer to hand it off?</p>
              <h2>Let Line Up create your training library.</h2>
              <p>Send us your menus, tech sheets, SOPs, wine lists, cocktail specs, and employee information. We organize and build it for you.</p>
            </div>
            <Link className="primary-button" to="/managed-setup">Have Line Up build it</Link>
          </section>
        </>
      ) : null}
    </section>
  );
}
