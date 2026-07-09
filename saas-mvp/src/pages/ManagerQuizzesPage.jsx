import { useEffect, useMemo, useState } from "react";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { listCollectionsForRestaurant } from "../lib/collections.js";
import { generateDraftQuestions } from "../lib/quizGeneration.js";
import {
  createQuiz,
  createQuizQuestion,
  deleteQuizQuestion,
  listQuestionsForQuiz,
  listQuizzesForRestaurant,
  parseChoices,
  updateQuizPublishStatus,
  updateQuizQuestion
} from "../lib/quizzes.js";
import { listTrainingDocsForRestaurant, parseContentJson } from "../lib/trainingDocs.js";

const emptyQuizForm = {
  title: "",
  category: "",
  trainingDocId: "",
  questionCount: "5",
  passingScore: "80",
  status: "draft"
};

const emptyQuestionForm = {
  prompt: "",
  choicesText: "",
  correctAnswer: "",
  explanation: ""
};

function getQuestionFormFromSavedQuestion(question) {
  return {
    prompt: question.prompt || "",
    choicesText: parseChoices(question.choicesJson).join("\n"),
    correctAnswer: question.correctAnswer || "",
    explanation: question.explanation || ""
  };
}

function splitChoices(value) {
  return String(value || "")
    .split("\n")
    .map((choice) => choice.trim())
    .filter(Boolean);
}

export default function ManagerQuizzesPage() {
  const workspace = useCurrentWorkspace();
  const [collections, setCollections] = useState([]);
  const [trainingDocs, setTrainingDocs] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [quizForm, setQuizForm] = useState(emptyQuizForm);
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);
  const [editingQuestionId, setEditingQuestionId] = useState("");
  const [draftQuestions, setDraftQuestions] = useState([]);
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");

  const selectedQuiz = quizzes.find((quiz) => quiz.id === selectedQuizId);
  const selectedTrainingDocId = quizForm.trainingDocId || selectedQuiz?.trainingDocId;
  const selectedTrainingDoc = trainingDocs.find((doc) => doc.id === selectedTrainingDocId);
  const testableStaffKnowledge = useMemo(() => {
    if (!selectedTrainingDoc) {
      return [];
    }

    const content = parseContentJson(selectedTrainingDoc.contentJson);
    return (content.testableStaffKnowledge || content.quizFacts || []).filter((fact) => fact.quizEligible !== false);
  }, [selectedTrainingDoc]);

  async function loadQuizPage() {
    if (workspace.status !== "ready") {
      return;
    }

    setMessage("");

    try {
      const [nextCollections, nextTrainingDocs, nextQuizzes] = await Promise.all([
        listCollectionsForRestaurant(workspace.restaurant.id),
        listTrainingDocsForRestaurant(workspace.restaurant.id),
        listQuizzesForRestaurant(workspace.restaurant.id)
      ]);

      setCollections(nextCollections);
      setTrainingDocs(nextTrainingDocs.filter((doc) => doc.status === "published"));
      setQuizzes(nextQuizzes);

      if (!selectedQuizId && nextQuizzes.length) {
        setSelectedQuizId(nextQuizzes[0].id);
      }
    } catch (error) {
      setMessage(error.message || "Could not load quizzes.");
    }
  }

  async function loadQuestions(quizId) {
    if (!quizId || workspace.status !== "ready") {
      setQuestions([]);
      return;
    }

    try {
      setQuestions(await listQuestionsForQuiz(quizId, workspace.restaurant.id));
    } catch (error) {
      setMessage(error.message || "Could not load quiz questions.");
    }
  }

  useEffect(() => {
    loadQuizPage();
  }, [workspace.status, workspace.restaurant?.id]);

  useEffect(() => {
    loadQuestions(selectedQuizId);
    setDraftQuestions([]);
    setEditingQuestionId("");
    setQuestionForm(emptyQuestionForm);
  }, [selectedQuizId, workspace.status, workspace.restaurant?.id]);

  function updateQuizForm(event) {
    const { name, value } = event.target;
    setQuizForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  }

  function updateQuestionForm(event) {
    const { name, value } = event.target;
    setQuestionForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  }

  function getSourceDocs(source) {
    if (source.trainingDocId) {
      return trainingDocs.filter((doc) => doc.id === source.trainingDocId);
    }

    if (source.category) {
      const selectedCollection = collections.find((collection) => collection.name === source.category);
      return trainingDocs.filter((doc) => doc.collectionId === selectedCollection?.id || doc.category === source.category);
    }

    return trainingDocs;
  }

  async function createQuizFromForm() {
    const quiz = await createQuiz({
      restaurantId: workspace.restaurant.id,
      form: quizForm
    });

    setSelectedQuizId(quiz.id);
    await loadQuizPage();
    return quiz;
  }

  async function submitQuiz(event) {
    event.preventDefault();
    setIsWorking(true);
    setMessage("");

    try {
      await createQuizFromForm();
      setQuizForm(emptyQuizForm);
      setMessage("Quiz created. You can now generate or add questions.");
    } catch (error) {
      setMessage(error.message || "Could not create quiz.");
    } finally {
      setIsWorking(false);
    }
  }

  async function generateQuestions() {
    if (workspace.status !== "ready") {
      return;
    }

    setIsWorking(true);
    setMessage("");

    try {
      const quiz = selectedQuiz || (await createQuizFromForm());
      const sourceDocs = getSourceDocs(quiz);
      const generatedQuestions = generateDraftQuestions({
        allTrainingDocs: trainingDocs,
        sourceTrainingDocs: sourceDocs,
        questionCount: quizForm.questionCount
      });

      if (generatedQuestions.length === 0) {
        setDraftQuestions([]);
        setMessage("Add Testable Staff Knowledge to your training pages before generating quiz questions.");
        return;
      }

      setDraftQuestions(generatedQuestions);
      setMessage("Draft questions generated. Review and edit them before saving.");
    } catch (error) {
      setMessage(error.message || "Could not generate quiz questions.");
    } finally {
      setIsWorking(false);
    }
  }

  async function submitQuestion(event) {
    event.preventDefault();

    if (!selectedQuiz) {
      setMessage("Create or select a quiz before adding questions.");
      return;
    }

    setIsWorking(true);
    setMessage("");

    try {
      if (editingQuestionId) {
        await updateQuizQuestion({
          questionId: editingQuestionId,
          form: questionForm
        });
        setMessage("Question updated.");
      } else {
        await createQuizQuestion({
          restaurantId: workspace.restaurant.id,
          quizId: selectedQuiz.id,
          form: questionForm
        });
        setMessage("Question added.");
      }

      setEditingQuestionId("");
      setQuestionForm(emptyQuestionForm);
      await loadQuestions(selectedQuiz.id);
    } catch (error) {
      setMessage(error.message || "Could not save question.");
    } finally {
      setIsWorking(false);
    }
  }

  function useFactAsQuestion(fact) {
    setQuestionForm({
      prompt: fact.questionHint || `What should staff know about ${fact.label}?`,
      choicesText: fact.value,
      correctAnswer: fact.value,
      explanation: `${fact.label}: ${fact.value}`
    });
    setEditingQuestionId("");
    setMessage("Question started from Testable Staff Knowledge. Add similar wrong answers before saving.");
  }

  function addManualDraftQuestion() {
    setDraftQuestions((currentDrafts) => [
      ...currentDrafts,
      {
        id: `manual-${Date.now()}`,
        prompt: "",
        choices: ["", "", "", ""],
        correctAnswer: "",
        explanation: "",
        sourceTitle: "Manual question"
      }
    ]);
  }

  function updateDraftQuestion(index, field, value) {
    setDraftQuestions((currentDrafts) =>
      currentDrafts.map((question, questionIndex) =>
        questionIndex === index
          ? {
              ...question,
              [field]: field === "choices" ? splitChoices(value) : value
            }
          : question
      )
    );
  }

  function deleteDraftQuestion(index) {
    setDraftQuestions((currentDrafts) => currentDrafts.filter((_, questionIndex) => questionIndex !== index));
  }

  async function saveDraftQuestions() {
    if (!selectedQuiz) {
      setMessage("Create or select a quiz before saving draft questions.");
      return;
    }

    setIsWorking(true);
    setMessage("");

    try {
      for (const question of draftQuestions) {
        await createQuizQuestion({
          restaurantId: workspace.restaurant.id,
          quizId: selectedQuiz.id,
          form: {
            prompt: question.prompt,
            choicesText: question.choices.join("\n"),
            correctAnswer: question.correctAnswer,
            explanation: question.explanation
          }
        });
      }

      setDraftQuestions([]);
      await loadQuestions(selectedQuiz.id);
      setMessage("Draft questions saved to the quiz.");
    } catch (error) {
      setMessage(error.message || "Could not save draft questions.");
    } finally {
      setIsWorking(false);
    }
  }

  function editSavedQuestion(question) {
    setEditingQuestionId(question.id);
    setQuestionForm(getQuestionFormFromSavedQuestion(question));
    setMessage("Editing saved question.");
  }

  async function removeSavedQuestion(question) {
    setIsWorking(true);
    setMessage("");

    try {
      await deleteQuizQuestion(question.id);
      await loadQuestions(selectedQuiz.id);
      setMessage("Question deleted.");
    } catch (error) {
      setMessage(error.message || "Could not delete question.");
    } finally {
      setIsWorking(false);
    }
  }

  async function togglePublished(quiz) {
    setIsWorking(true);
    setMessage("");

    try {
      await updateQuizPublishStatus({
        quiz,
        isPublished: !quiz.isPublished
      });
      await loadQuizPage();
      setMessage(quiz.isPublished ? "Quiz moved to draft." : "Quiz published.");
    } catch (error) {
      setMessage(error.message || "Could not update quiz.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Quizzes</p>
          <h1>Create Quiz</h1>
          <p>Generate draft quiz questions from published training pages, then review them before staff sees them.</p>
        </div>
      </div>

      {message ? <p className="form-message page-message">{message}</p> : null}

      <div className="content-manager-grid">
        <form className="form-card" onSubmit={submitQuiz}>
          <h2>Quiz Setup</h2>

          <label>
            Quiz title
            <input name="title" value={quizForm.title} onChange={updateQuizForm} required />
          </label>

          <label>
            Training Category optional
            <select name="category" value={quizForm.category} onChange={updateQuizForm}>
              <option value="">All published training pages</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.name}>
                  {collection.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Training Page optional
            <select name="trainingDocId" value={quizForm.trainingDocId} onChange={updateQuizForm}>
              <option value="">No specific page</option>
              {trainingDocs.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title}
                </option>
              ))}
            </select>
          </label>

          <label>
            Number of questions
            <input name="questionCount" type="number" min="1" max="25" value={quizForm.questionCount} onChange={updateQuizForm} required />
          </label>

          <label>
            Passing Score
            <input name="passingScore" type="number" min="1" max="100" value={quizForm.passingScore} onChange={updateQuizForm} required />
          </label>

          <label>
            Status
            <select name="status" value={quizForm.status} onChange={updateQuizForm}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>

          <button className="primary-button full-width" type="submit" disabled={isWorking}>
            {isWorking ? "Creating quiz..." : "Create Quiz"}
          </button>

          <button className="secondary-button full-width" type="button" onClick={generateQuestions} disabled={isWorking || (!selectedQuiz && !quizForm.title)}>
            Generate Questions from Training Material
          </button>
        </form>

        <section className="data-list-panel">
          <div className="data-list-heading">
            <h2>Restaurant Quizzes</h2>
            <button className="secondary-button" type="button" onClick={loadQuizPage} disabled={isWorking}>
              Refresh
            </button>
          </div>

          {quizzes.length === 0 ? (
            <p className="empty-panel">No quizzes yet.</p>
          ) : (
            <div className="operator-card-list">
              {quizzes.map((quiz) => (
                <article className="operator-list-card" key={quiz.id}>
                  <div>
                    <span className="type-pill">{quiz.isPublished ? "Published" : "Draft"}</span>
                    <h4>{quiz.title}</h4>
                    <p>{quiz.category || "All training"} · Passing Score: {quiz.passingScore || 80}%</p>
                  </div>
                  <div className="card-actions">
                    <button className="secondary-button" type="button" onClick={() => setSelectedQuizId(quiz.id)}>
                      Manage Questions
                    </button>
                    <button className="secondary-button" type="button" onClick={() => togglePublished(quiz)}>
                      {quiz.isPublished ? "Move to Draft" : "Publish"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="operator-section">
        <div className="operator-section-heading">
          <div>
            <p className="eyebrow">Generated Drafts</p>
            <h2>Review Questions Before Saving</h2>
            <p>Generated questions are drafts. Managers can edit the prompt, choices, answer, and explanation before saving.</p>
          </div>
          <button className="secondary-button" type="button" onClick={addManualDraftQuestion}>
            Add Manual Draft
          </button>
        </div>

        {draftQuestions.length === 0 ? (
          <p className="empty-panel">No draft questions yet. Generate questions from training material or add a manual draft.</p>
        ) : (
          <div className="draft-question-list">
            {draftQuestions.map((question, index) => (
              <article className="form-card draft-question-card" key={question.id}>
                <div className="data-list-heading">
                  <h3>Draft Question {index + 1}</h3>
                  <button className="quiet-danger-button" type="button" onClick={() => deleteDraftQuestion(index)}>
                    Delete Draft
                  </button>
                </div>
                <p className="helper-text">Source: {question.sourceTitle}</p>

                <label>
                  Question prompt
                  <textarea value={question.prompt} onChange={(event) => updateDraftQuestion(index, "prompt", event.target.value)} />
                </label>

                <label>
                  Answer choices
                  <span className="helper-text">Put each answer on its own line.</span>
                  <textarea value={question.choices.join("\n")} onChange={(event) => updateDraftQuestion(index, "choices", event.target.value)} />
                </label>

                <label>
                  Correct answer
                  <input value={question.correctAnswer} onChange={(event) => updateDraftQuestion(index, "correctAnswer", event.target.value)} />
                </label>

                <label>
                  Explanation optional
                  <textarea value={question.explanation} onChange={(event) => updateDraftQuestion(index, "explanation", event.target.value)} />
                </label>
              </article>
            ))}

            <button className="primary-button full-width" type="button" onClick={saveDraftQuestions} disabled={isWorking || !selectedQuiz}>
              Save Draft Questions to Quiz
            </button>
          </div>
        )}
      </section>

      <section className="operator-section">
        <div className="operator-section-heading">
          <div>
            <p className="eyebrow">Saved Questions</p>
            <h2>{selectedQuiz ? selectedQuiz.title : "Select a quiz"}</h2>
            <p>These are the questions staff will see when the quiz is published.</p>
          </div>
        </div>

        {testableStaffKnowledge.length > 0 ? (
          <div className="example-strip">
            {testableStaffKnowledge.map((fact) => (
              <button className="secondary-button" type="button" key={`${fact.label}-${fact.value}`} onClick={() => useFactAsQuestion(fact)}>
                Use: {fact.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="content-manager-grid">
          <form className="form-card" onSubmit={submitQuestion}>
            <h3>{editingQuestionId ? "Edit Question" : "Add Question"}</h3>

            <label>
              Question prompt
              <textarea name="prompt" value={questionForm.prompt} onChange={updateQuestionForm} required />
            </label>

            <label>
              Answer choices
              <span className="helper-text">Put each answer on its own line.</span>
              <textarea name="choicesText" value={questionForm.choicesText} onChange={updateQuestionForm} required />
            </label>

            <label>
              Correct answer
              <input name="correctAnswer" value={questionForm.correctAnswer} onChange={updateQuestionForm} required />
            </label>

            <label>
              Explanation optional
              <textarea name="explanation" value={questionForm.explanation} onChange={updateQuestionForm} />
            </label>

            <div className="form-button-row">
              <button className="primary-button" type="submit" disabled={isWorking || !selectedQuiz}>
                {editingQuestionId ? "Save Question" : "Add Question"}
              </button>
              {editingQuestionId ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setEditingQuestionId("");
                    setQuestionForm(emptyQuestionForm);
                  }}
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>

          <section className="data-list-panel">
            <h3>Questions</h3>
            {questions.length === 0 ? (
              <p className="empty-panel">No saved questions yet.</p>
            ) : (
              <div className="operator-card-list">
                {questions.map((question) => (
                  <article className="operator-list-card" key={question.id}>
                    <div>
                      <h4>{question.prompt}</h4>
                      <p>Correct answer: {question.correctAnswer}</p>
                    </div>
                    <div className="card-actions">
                      <button className="secondary-button" type="button" onClick={() => editSavedQuestion(question)}>
                        Edit
                      </button>
                      <button className="quiet-danger-button" type="button" onClick={() => removeSavedQuestion(question)}>
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </section>
  );
}
