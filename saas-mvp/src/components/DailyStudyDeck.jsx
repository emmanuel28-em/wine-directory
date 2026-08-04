import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

function splitList(value) {
  return String(value || "")
    .split(/\n|,|;|\|/)
    .map((item) => item.replace(/^[-*•]+\s*/, "").trim())
    .filter(Boolean);
}

export default function DailyStudyDeck({
  cards,
  onResponse,
  onRestart,
  isExpanded = false,
  onToggleExpanded
}) {
  const [deck, setDeck] = useState(cards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDeck(cards);
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [cards]);

  useEffect(() => {
    if (!isExpanded) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isExpanded]);

  const currentCard = deck[currentIndex];
  const isComplete = currentIndex >= deck.length;
  const progress = deck.length ? Math.min(100, Math.round((currentIndex / deck.length) * 100)) : 0;
  const allergens = useMemo(() => splitList(currentCard?.allergens).slice(0, 5), [currentCard?.allergens]);
  const ingredients = useMemo(() => splitList(currentCard?.ingredients).slice(0, 6), [currentCard?.ingredients]);

  const respond = useCallback(async (response) => {
    if (!currentCard || isSaving) return;
    setIsSaving(true);

    try {
      await onResponse(currentCard, response);

      if (response === "review-again" && !currentCard.hasRepeated) {
        setDeck((currentDeck) => {
          const nextDeck = [...currentDeck];
          const insertAt = Math.min(currentIndex + 3, nextDeck.length);
          nextDeck.splice(insertAt, 0, { ...currentCard, hasRepeated: true });
          return nextDeck;
        });
      }

      setCurrentIndex((index) => index + 1);
      setIsFlipped(false);
    } finally {
      setIsSaving(false);
    }
  }, [currentCard, currentIndex, isSaving, onResponse]);

  useEffect(() => {
    function handleKeyboard(event) {
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(event.target?.tagName)) return;

      if (event.key === "Escape" && isExpanded) {
        onToggleExpanded?.();
      } else if (event.code === "Space" && currentCard) {
        event.preventDefault();
        setIsFlipped((value) => !value);
      } else if (event.key === "ArrowLeft" && currentCard && isFlipped) {
        event.preventDefault();
        respond("review-again");
      } else if (event.key === "ArrowRight" && currentCard && isFlipped) {
        event.preventDefault();
        respond("got-it");
      }
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [currentCard, isExpanded, isFlipped, onToggleExpanded, respond]);

  let content;

  if (!cards.length) {
    content = (
      <section className="daily-deck-empty">
        <p className="eyebrow">Daily practice</p>
        <h2>No study cards are ready yet.</h2>
        <p>Published training pages with useful facts will appear here automatically.</p>
        <Link className="primary-button" to="/library">Open the library</Link>
      </section>
    );
  } else if (isComplete) {
    content = (
      <section className="daily-deck-complete">
        <span className="daily-deck-complete-mark" aria-hidden="true">✓</span>
        <p className="eyebrow">Practice complete</p>
        <h2>You cleared this study set.</h2>
        <p>Facts marked Review Again will return in your next set.</p>
        <div className="daily-deck-complete-actions">
          <button className="primary-button" type="button" onClick={onRestart}>Practice another set</button>
          <Link className="secondary-button" to="/library">Search the library</Link>
        </div>
      </section>
    );
  } else {
    content = (
      <section className="daily-deck-shell" aria-label="Daily flashcard practice">
        <div className="daily-deck-toolbar">
          <div className="daily-deck-status">
            <span>Fact {currentIndex + 1} of {deck.length}</span>
            <strong>{currentCard.assigned ? "Assigned" : currentCard.recent ? "Recently updated" : currentCard.reviewed ? "Refresh" : "To study"}</strong>
          </div>
          {onToggleExpanded ? (
            <button className="deck-expand-button" type="button" onClick={onToggleExpanded}>
              {isExpanded ? "Exit full screen" : "Open full screen"}
            </button>
          ) : null}
        </div>
        <div className="daily-deck-track" aria-label={`${progress}% through this study set`}>
          <span style={{ width: `${progress}%` }} />
        </div>

        <div className={isFlipped ? "daily-flashcard is-flipped" : "daily-flashcard"}>
          <div
            className="daily-flashcard-inner"
            role="button"
            tabIndex="0"
            aria-label={isFlipped ? `Hide answer for ${currentCard.title}` : `Reveal answer for ${currentCard.title}`}
            onClick={() => setIsFlipped((value) => !value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") setIsFlipped((value) => !value);
            }}
          >
            <article className="daily-flashcard-face daily-flashcard-front">
              <div className="daily-flashcard-media">
                {currentCard.imageUrl ? (
                  <img src={currentCard.imageUrl} alt={`${currentCard.title} training`} />
                ) : (
                  <div className="daily-flashcard-fallback" aria-hidden="true">
                    <span>{currentCard.title.charAt(0)}</span>
                    <small>{currentCard.section}</small>
                  </div>
                )}
              </div>
              <div className="daily-flashcard-copy">
                <div className="daily-flashcard-labels">
                  <span>{currentCard.category}</span>
                  {currentCard.assigned ? <strong>Priority</strong> : null}
                </div>
                <h1>{currentCard.title}</h1>
                {allergens.length ? (
                  <div className="daily-allergen-list" aria-label={`Allergens for ${currentCard.title}`}>
                    {allergens.map((allergen) => <span key={allergen}>{allergen}</span>)}
                  </div>
                ) : null}
                <div className="daily-card-question">
                  <small>Test yourself</small>
                  <p>{currentCard.prompt}</p>
                </div>
                <span className="daily-flip-hint">Tap to reveal</span>
              </div>
            </article>

            <article className="daily-flashcard-face daily-flashcard-back">
              <div className="daily-answer-heading">
                <span>{currentCard.category}</span>
                <h2>{currentCard.title}</h2>
              </div>
              <div className="daily-answer-block primary-answer">
                <small>Answer</small>
                <strong>{currentCard.answer}</strong>
              </div>
              {currentCard.summary ? (
                <div className="daily-answer-block">
                  <small>One-liner</small>
                  <p>{currentCard.summary}</p>
                </div>
              ) : null}
              {ingredients.length ? (
                <div className="daily-answer-block">
                  <small>Key ingredients</small>
                  <div className="daily-ingredient-list">
                    {ingredients.map((ingredient) => <span key={ingredient}>{ingredient}</span>)}
                  </div>
                </div>
              ) : null}
              {currentCard.serviceNotes ? (
                <div className="daily-answer-block daily-service-note">
                  <small>Service note</small>
                  <p>{currentCard.serviceNotes}</p>
                </div>
              ) : null}
              <span className="daily-flip-hint">Tap to see the front</span>
            </article>
          </div>
        </div>

        <button className="daily-flip-button" type="button" onClick={() => setIsFlipped((value) => !value)}>
          {isFlipped ? "Show question" : "Reveal answer"}
        </button>

        <div className="daily-response-actions" aria-label="Rate this study fact">
          <button type="button" className="daily-response review-again" onClick={() => respond("review-again")} disabled={!isFlipped || isSaving}>
            <strong>Review Again</strong>
            <span>Bring this fact back</span>
          </button>
          <button type="button" className="daily-response got-it" onClick={() => respond("got-it")} disabled={!isFlipped || isSaving}>
            <strong>{isSaving ? "Saving..." : "Got It"}</strong>
            <span>Count this fact toward completion</span>
          </button>
        </div>

        <div className="daily-deck-footer">
          <span>Space flips</span>
          <span>Arrow keys rate</span>
          <Link to={`/library?open=${currentCard.trainingDocId}`}>Open full training page</Link>
        </div>
      </section>
    );
  }

  if (!isExpanded) return content;

  return (
    <div className="daily-deck-overlay" role="dialog" aria-modal="true" aria-label="Full screen flashcard practice">
      <div className="daily-deck-overlay-inner">
        <button className="daily-overlay-close" type="button" onClick={onToggleExpanded} aria-label="Close full screen practice">Close</button>
        {content}
      </div>
    </div>
  );
}
