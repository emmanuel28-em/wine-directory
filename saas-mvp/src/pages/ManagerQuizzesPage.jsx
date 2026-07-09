import { useEffect, useMemo, useState } from "react";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import { listCollectionsForRestaurant } from "../lib/collections.js";
import { createQuiz, createQuizQuestion, listQuestionsForQuiz, listQuizzesForRestaurant, updateQuizPublishStatus } from "../lib/quizzes.js";
import { listTrainingDocsForRestaurant, parseContentJson } from "../lib/trainingDocs.js";

const emptyQuizForm = {
  title: "",
  category: "",
  trainingDocId: "",
  passingScore: "80",
  isPublished: false
};

const emptyQuestionForm = {
  prompt: "",
  choicesText: "",
  correctAnswer: "",
  explanation: ""
};

export default function ManagerQuizzesPage() {
  const workspace = useCurrentWorkspace();
  const [collections, setCollections] = useState([]);
  const [trainingDocs, setTrainingDocs] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [quizForm, setQuizForm] = useState(emptyQuizForm);
  const [questionForm, setQuestionForm] = useState(emptyQuestionForm);
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState("");

  const selectedQuiz = quizzes.find((quiz) => quiz.id === selectedQuizId);
  const selectedTrainingDoc = trainingDocs.find((doc) => doc.id === quizForm.trainingDocId);
  const testableStaffKnowledge = useMemo(() => {
    if (!selectedTrainingDoc) {
      return [];
    }

    const content = parseContentJson(selectedTrainingDoc.contentJson);
    return content.testableStaffKnowledge || content.quizFacts || [];
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
    if (!quizId) {
      setQuestions([]);
      return;
    }

    try {
      setQuestions(await listQuestionsForQuiz(quizId));
    } catch (error) {
      setMessage(error.message || "Could not load quiz questions.");
    }
  }

  useEffect(() => {
    loadQuizPage();
  }, [workspace.status, workspace.restaurant?.id]);

  useEffect(() => {
    loadQuestions(selectedQuizId);
  }, [selectedQuizId]);

  function updateQuizForm(event) {
    const { name, value, type, checked } = event.target;
    setQuizForm((currentForm) => ({
      ...currentForm,
      [name]: type === "checkbox" ? checked : value
    }));
  }

  function updateQuestionForm(event) {
    const { name, value } = event.target;
    setQuestionForm((currentForm) => ({
      ...currentForm,
      [name]: value
    }));
  }

  async function submitQuiz(event) {
    event.preventDefault();
    setIsWorking(true);
    setMessage("");

    try {
      const quiz = await createQuiz({
        restaurantId: workspace.restaurant.id,
        form: quizForm
      });

      setQuizForm(emptyQuizForm);
      setSelectedQuizId(quiz.id);
      await loadQuizPage();
      setMessage("Quiz created.");
    } catch (error) {
      setMessage(error.message || "Could not create quiz.");
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
      await createQuizQuestion({
        restaurantId: workspace.restaurant.id,
        quizId: selectedQuiz.id,
        form: questionForm
      });

      setQuestionForm(emptyQuestionForm);
      await loadQuestions(selectedQuiz.id);
      setMessage("Question added.");
    } catch (error) {
      setMessage(error.message || "Could not add question.");
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
    setMessage("Question started from Testable Staff Knowledge. Add similar wrong answers before saving.");
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
          <p>Build simple quizzes from training pages so staff can prove they are ready for service.</p>
        </div>
      </div>

      {message ? <p className="form-message page-message">{message}</p> : null}

      <div className="content-manager-grid">
        <form className="form-card" onSubmit={submitQuiz}>
          <h2>Quiz Details</h2>

          <label>
            Quiz title
            <input name="title" value={quizForm.title} onChange={updateQuizForm} required />
          </label>

          <label>
            Training Category optional
            <select name="category" value={quizForm.category} onChange={updateQuizForm}>
              <option value="">No category</option>
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
            Passing Score
            <input name="passingScore" type="number" min="1" max="100" value={quizForm.passingScore} onChange={updateQuizForm} required />
          </label>

          <label className="checkbox-label">
            <input name="isPublished" type="checkbox" checked={quizForm.isPublished} onChange={updateQuizForm} />
            Published
          </label>

          <button className="primary-button full-width" type="submit" disabled={isWorking}>
            {isWorking ? "Creating quiz..." : "Create Quiz"}
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
                    <p>{quiz.category || "No category"} · Passing Score: {quiz.passingScore || 80}%</p>
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
            <p className="eyebrow">Questions</p>
            <h2>{selectedQuiz ? selectedQuiz.title : "Select a quiz"}</h2>
            <p>Add answer choices one per line. Make sure the correct answer exactly matches one of the choices.</p>
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
            <h3>Add Question</h3>

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

            <button className="primary-button full-width" type="submit" disabled={isWorking || !selectedQuiz}>
              Add Question
            </button>
          </form>

          <section className="data-list-panel">
            <h3>Questions</h3>
            {questions.length === 0 ? (
              <p className="empty-panel">No questions yet.</p>
            ) : (
              <div className="operator-card-list">
                {questions.map((question) => (
                  <article className="operator-list-card" key={question.id}>
                    <div>
                      <h4>{question.prompt}</h4>
                      <p>Correct answer: {question.correctAnswer}</p>
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
