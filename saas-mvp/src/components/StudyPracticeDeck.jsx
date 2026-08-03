import { useEffect, useMemo, useState } from "react";

export default function StudyPracticeDeck({ cards, onClose, onMasterPrompt }) {
  const [deck, setDeck] = useState(cards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [sessionStats, setSessionStats] = useState({ gotIt: 0, needsPractice: 0 });

  const currentCard = deck[currentIndex];
  const isComplete = currentIndex >= deck.length;
  const progress = deck.length ? Math.min(100, Math.round((currentIndex / deck.length) * 100)) : 100;

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  const sessionLabel = useMemo(() => {
    if (isComplete) return "Practice complete";
    return `Card ${currentIndex + 1} of ${deck.length}`;
  }, [currentIndex, deck.length, isComplete]);

  function rateCard(rating) {
    if (!currentCard) return;

    if (rating === "got-it") {
      onMasterPrompt(currentCard);
      setSessionStats((current) => ({ ...current, gotIt: current.gotIt + 1 }));
    } else {
      setSessionStats((current) => ({ ...current, needsPractice: current.needsPractice + 1 }));

      // Anki-style spacing: "Again" returns soon, while "Hard" returns near
      // the end. Limit each card to one repeat so a two-minute session stays short.
      if (!currentCard.hasRepeated) {
        setDeck((currentDeck) => {
          const repeatedCard = { ...currentCard, hasRepeated: true };
          const nextDeck = [...currentDeck];
          const insertAt = rating === "again"
            ? Math.min(currentIndex + 3, nextDeck.length)
            : nextDeck.length;
          nextDeck.splice(insertAt, 0, repeatedCard);
          return nextDeck;
        });
      }
    }

    setCurrentIndex((index) => index + 1);
    setIsRevealed(false);
  }

  return (
    <div className="practice-deck-backdrop" role="presentation" onClick={onClose}>
      <section
        className="practice-deck"
        role="dialog"
        aria-modal="true"
        aria-label="Two-minute training practice"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="practice-deck-header">
          <div>
            <p className="eyebrow">Two-minute practice</p>
            <strong>{sessionLabel}</strong>
          </div>
          <button className="practice-close-button" type="button" onClick={onClose} aria-label="Close practice">
            Close
          </button>
        </header>

        <div className="practice-progress-track" aria-label={`${progress}% of practice complete`}>
          <span style={{ width: `${progress}%` }} />
        </div>

        {isComplete ? (
          <div className="practice-complete-panel">
            <span className="practice-complete-mark" aria-hidden="true">✓</span>
            <p className="eyebrow">Session complete</p>
            <h2>Good work before service.</h2>
            <p>
              You knew {sessionStats.gotIt} fact{sessionStats.gotIt === 1 ? "" : "s"}. {sessionStats.needsPractice} response{sessionStats.needsPractice === 1 ? "" : "s"} will return in a future practice session.
            </p>
            <button className="primary-button" type="button" onClick={onClose}>Back to the library</button>
          </div>
        ) : (
          <div className={isRevealed ? "practice-card is-revealed" : "practice-card"}>
            <div className="practice-card-context">
              <span>{currentCard.section}</span>
              <strong>{currentCard.docTitle}</strong>
            </div>

            <div className="practice-card-face">
              <p className="practice-card-label">Question</p>
              <h2>{currentCard.prompt}</h2>

              {isRevealed ? (
                <div className="practice-answer">
                  <p className="practice-card-label">Answer</p>
                  <strong>{currentCard.answer}</strong>
                  {currentCard.explanation && currentCard.explanation !== currentCard.answer ? (
                    <p>{currentCard.explanation}</p>
                  ) : null}
                </div>
              ) : (
                <button className="primary-button practice-reveal-button" type="button" onClick={() => setIsRevealed(true)}>
                  Show answer
                </button>
              )}
            </div>

            {isRevealed ? (
              <div className="practice-rating-actions" aria-label="How well did you know this answer?">
                <button className="practice-rating again" type="button" onClick={() => rateCard("again")}>
                  <strong>Again</strong>
                  <span>Show me soon</span>
                </button>
                <button className="practice-rating hard" type="button" onClick={() => rateCard("hard")}>
                  <strong>Hard</strong>
                  <span>Practice later</span>
                </button>
                <button className="practice-rating got-it" type="button" onClick={() => rateCard("got-it")}>
                  <strong>Got it</strong>
                  <span>I knew this</span>
                </button>
              </div>
            ) : null}

            <p className="practice-deck-note">Practice helps you remember. A five-question check still confirms that a page is reviewed.</p>
          </div>
        )}
      </section>
    </div>
  );
}
