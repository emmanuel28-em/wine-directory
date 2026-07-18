import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCurrentWorkspace } from "../hooks/useCurrentWorkspace.js";
import {
  getAssignedItemIdsForUser,
  listStaffGroupMembersForRestaurant,
  listTrainingAssignmentsForRestaurant
} from "../lib/assignments.js";
import { listQuestionsForQuiz, listQuizzesForRestaurant, parseChoices, parseAnswersJson, saveQuizAttempt } from "../lib/quizzes.js";

function getResultLabel(passed) {
  return passed ? "Ready for Service" : "Needs Review";
}

export default function StaffQuizzesPage() {
  const workspace = useCurrentWorkspace();
  const [quizzes, setQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [assignedQuizIds, setAssignedQuizIds] = useState(new Set());
  const [hasAssignments, setHasAssignments] = useState(false);
  const [message, setMessage] = useState("");
  const [isWorking, setIsWorking] = useState(false);

  const selectedQuiz = quizzes.find((quiz) => quiz.id === selectedQuizId);

  const resultAnswers = useMemo(() => parseAnswersJson(result?.answersJson), [result]);

  async function loadQuizzes() {
    if (workspace.status !== "ready") {
      return;
    }

    setMessage("");

    try {
      const [restaurantQuizzes, assignments, groupMembers] = await Promise.all([
        listQuizzesForRestaurant(workspace.restaurant.id),
        listTrainingAssignmentsForRestaurant(workspace.restaurant.id),
        listStaffGroupMembersForRestaurant(workspace.restaurant.id)
      ]);
      const publishedQuizzes = restaurantQuizzes.filter((quiz) => quiz.isPublished);
      const nextAssignedQuizIds = getAssignedItemIdsForUser({
        assignments,
        groupMembers,
        userProfileId: workspace.userProfile.id,
        itemType: "quiz"
      });
      setQuizzes(publishedQuizzes);
      setAssignedQuizIds(nextAssignedQuizIds);
      setHasAssignments(assignments.some((assignment) => assignment.status === "active" && assignment.itemType === "quiz"));

      if (!selectedQuizId && publishedQuizzes.length) {
        setSelectedQuizId(publishedQuizzes.find((quiz) => nextAssignedQuizIds.has(quiz.id))?.id || publishedQuizzes[0].id);
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

    setMessage("");
    setAnswers({});
    setResult(null);

    try {
      setQuestions(await listQuestionsForQuiz(quizId, workspace.restaurant.id));
    } catch (error) {
      setMessage(error.message || "Could not load quiz questions.");
    }
  }

  useEffect(() => {
    loadQuizzes();
  }, [workspace.status, workspace.restaurant?.id]);

  useEffect(() => {
    loadQuestions(selectedQuizId);
  }, [selectedQuizId, workspace.status, workspace.restaurant?.id]);

  function chooseAnswer(questionId, answer) {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      [questionId]: answer
    }));
  }

  const assignedQuizzes = quizzes.filter((quiz) => assignedQuizIds.has(quiz.id));
  const otherQuizzes = quizzes.filter((quiz) => !assignedQuizIds.has(quiz.id));
  const visibleQuizSections = hasAssignments
    ? [
        { title: "Assigned to me", empty: "No quizzes are assigned to you yet.", quizzes: assignedQuizzes },
        { title: "Other available quizzes", empty: "", quizzes: otherQuizzes }
      ]
    : [{ title: "Available quizzes", empty: "No published quizzes yet.", quizzes }];

  async function submitQuiz(event) {
    event.preventDefault();

    if (!selectedQuiz || !questions.length) {
      setMessage("This quiz does not have questions yet.");
      return;
    }

    if (questions.some((question) => !answers[question.id])) {
      setMessage("Answer every question before submitting.");
      return;
    }

    setIsWorking(true);
    setMessage("");

    try {
      const attempt = await saveQuizAttempt({
        restaurantId: workspace.restaurant.id,
        quiz: selectedQuiz,
        userProfileId: workspace.userProfile.id,
        cognitoUserId: workspace.user?.userId,
        questions,
        answers
      });
      setResult(attempt);
      setMessage("Quiz submitted.");
    } catch (error) {
      setMessage(error.message || "Could not save quiz attempt.");
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <section className="page-section">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Quizzes</p>
          <h1>Staff Quizzes</h1>
          <p>Take published quizzes from your restaurant and check your readiness before service.</p>
        </div>
        <Link className="secondary-button" to="/my-progress">
          My Progress
        </Link>
      </div>

      {message ? <p className="form-message page-message">{message}</p> : null}

      {workspace.status === "loading" ? <div className="empty-panel">Loading quizzes...</div> : null}

      {workspace.status === "empty" || workspace.status === "error" ? (
        <div className="form-card">
          <h2>Workspace setup needed</h2>
          <p>{workspace.message}</p>
        </div>
      ) : null}

      {workspace.status === "ready" && quizzes.length === 0 ? (
        <div className="empty-panel">No published quizzes yet. A manager needs to publish a quiz first.</div>
      ) : null}

      {workspace.status === "ready" && quizzes.length > 0 ? (
        <div className="content-manager-grid">
          <section className="data-list-panel">
            <div className="data-list-heading">
              <h2>Quizzes</h2>
              <button className="secondary-button" type="button" onClick={loadQuizzes}>
                Refresh
              </button>
            </div>

            {visibleQuizSections.map((section) => (
              <div className="assignment-section" key={section.title}>
                <h3>{section.title}</h3>
                {section.quizzes.length === 0 && section.empty ? <p className="empty-panel">{section.empty}</p> : null}
                {section.quizzes.length > 0 ? (
                  <div className="operator-card-list">
                    {section.quizzes.map((quiz) => (
                      <article className="operator-list-card" key={quiz.id}>
                        <div>
                          <span className="type-pill">{assignedQuizIds.has(quiz.id) ? "Assigned" : quiz.category || "Training"}</span>
                          <h4>{quiz.title}</h4>
                          <p>Passing Score: {quiz.passingScore || 80}%</p>
                        </div>
                        <button className="secondary-button" type="button" onClick={() => setSelectedQuizId(quiz.id)}>
                          Take Quiz
                        </button>
                      </article>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </section>

          <form className="form-card quiz-card" onSubmit={submitQuiz}>
            <h2>{selectedQuiz?.title || "Select a quiz"}</h2>

            {!selectedQuiz ? <p className="helper-text">Choose a quiz to begin.</p> : null}

            {selectedQuiz && questions.length === 0 ? (
              <p className="helper-text">This quiz is published, but it does not have questions yet.</p>
            ) : null}

            {questions.map((question, index) => (
              <fieldset className="quiz-question" key={question.id}>
                <legend>
                  {index + 1}. {question.prompt}
                </legend>

                {parseChoices(question.choicesJson).map((choice) => (
                  <label className="quiz-choice" key={`${question.id}-${choice}`}>
                    <input
                      type="radio"
                      name={question.id}
                      value={choice}
                      checked={answers[question.id] === choice}
                      onChange={() => chooseAnswer(question.id, choice)}
                      disabled={Boolean(result)}
                    />
                    {choice}
                  </label>
                ))}
              </fieldset>
            ))}

            {selectedQuiz && questions.length > 0 && !result ? (
              <button className="primary-button full-width" type="submit" disabled={isWorking}>
                {isWorking ? "Submitting..." : "Submit Quiz"}
              </button>
            ) : null}

            {result ? (
              <section className={result.passed ? "quiz-result quiz-result-pass" : "quiz-result quiz-result-review"}>
                <p className="eyebrow">{getResultLabel(result.passed)}</p>
                <h2>{result.score}%</h2>
                <p>Passing Score: {selectedQuiz.passingScore || 80}%</p>

                <div className="result-answer-list">
                  {resultAnswers.map((answer) => (
                    <article key={answer.questionId}>
                      <strong>{answer.isCorrect ? "Correct" : "Review"}</strong>
                      <p>{answer.prompt}</p>
                      <p>Your answer: {answer.selectedAnswer}</p>
                      {!answer.isCorrect ? <p>Correct answer: {answer.correctAnswer}</p> : null}
                      {answer.explanation ? <p>{answer.explanation}</p> : null}
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </form>
        </div>
      ) : null}
    </section>
  );
}
