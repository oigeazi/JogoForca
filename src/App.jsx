import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import "./App.css";
import GameModal from "./components/GameModal";
import HangmanDrawing from "./components/HangmanDrawing";
import PhraseBoard from "./components/PhraseBoard";
import {
  ALPHABET,
  COMPLIMENT_OPTIONS,
  HEARTS,
  MAX_ERRORS,
  OFFICIAL_TRACK,
  POLAROIDS,
  PROPOSAL_PHRASE,
  ROMANTIC_TRACK,
} from "./content/gameContent";
import { useGameAudio } from "./hooks/useGameAudio";
import {
  createConfettiPieces,
  getPhaseLabel,
  getProgress,
  pickRandomItem,
} from "./utils/gameState";
import { extractLetters, normalizeChar } from "./utils/text";

function App() {
  const [screen, setScreen] = useState("intro");
  const [selectedCompliment, setSelectedCompliment] = useState(
    COMPLIMENT_OPTIONS[0],
  );
  const [guessedLetters, setGuessedLetters] = useState([]);
  const [wrongLetters, setWrongLetters] = useState([]);
  const [modal, setModal] = useState(null);
  const [noCount, setNoCount] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [finalStep, setFinalStep] = useState("waiting");
  const [confettiPieces, setConfettiPieces] = useState([]);
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const advanceTimerRef = useRef(null);
  const finaleTimerRef = useRef(null);
  const romanticStartedRef = useRef(false);
  const { playTrack, stopAllAudio } = useGameAudio();

  const isMobileViewport = viewport.width <= 950;
  const isLandscape = viewport.width > viewport.height;
  const showDesktopBlock = !isMobileViewport;
  const showRotatePrompt = isMobileViewport && !isLandscape;
  const hangmanActive = screen === "stage1" || screen === "stage2-guess";
  const currentPhrase =
    screen === "stage1" ? selectedCompliment : PROPOSAL_PHRASE;
  const phraseLetters = extractLetters(currentPhrase);
  const usedLetters = new Set([...guessedLetters, ...wrongLetters]);
  const progressValue = getProgress(screen, finalStep);
  const revealFullPhrase = screen === "stage2-choice";
  const hideQuestionMark = screen === "stage2-guess";

  function clearRoundTimer() {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }

  function clearFinaleTimer() {
    if (finaleTimerRef.current) {
      window.clearTimeout(finaleTimerRef.current);
      finaleTimerRef.current = null;
    }
  }

  function resetRound() {
    setGuessedLetters([]);
    setWrongLetters([]);
    clearRoundTimer();
  }

  function queueAdvance(message, callback) {
    clearRoundTimer();
    setStatusText(message);
    advanceTimerRef.current = window.setTimeout(() => {
      startTransition(() => {
        callback();
        setStatusText("");
      });
    }, 900);
  }

  async function enterFullscreen() {
    const element = document.documentElement;

    if (document.fullscreenElement) {
      return;
    }

    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
        return;
      }

      if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
      }
    } catch {
      // Some mobile browsers reject fullscreen requests even after a tap.
    }
  }

  function startGame() {
    clearRoundTimer();
    clearFinaleTimer();
    stopAllAudio();
    romanticStartedRef.current = false;
    setScreen("stage1");
    setSelectedCompliment(pickRandomItem(COMPLIMENT_OPTIONS));
    setGuessedLetters([]);
    setWrongLetters([]);
    setModal(null);
    setNoCount(0);
    setStatusText("");
    setFinalStep("waiting");
    setConfettiPieces([]);
  }

  async function handleStartGame() {
    await enterFullscreen();
    startGame();
  }

  function submitGuess(value) {
    if (!hangmanActive || modal) {
      return;
    }

    const letter = normalizeChar(value);

    if (!letter || usedLetters.has(letter)) {
      return;
    }

    if (phraseLetters.includes(letter)) {
      const nextGuesses = [...guessedLetters, letter];
      setGuessedLetters(nextGuesses);

      const solved = phraseLetters.every((targetLetter) =>
        nextGuesses.includes(targetLetter),
      );

      if (!solved) {
        return;
      }

      if (screen === "stage1") {
        queueAdvance("Boa! Vamos para a proxima.", () => {
          setScreen("stage2-guess");
          resetRound();
        });
        return;
      }

      queueAdvance("Frase completa.", () => {
        setScreen("stage2-choice");
      });
      return;
    }

    const nextWrongLetters = [...wrongLetters, letter];
    setWrongLetters(nextWrongLetters);

    if (nextWrongLetters.length < MAX_ERRORS) {
      return;
    }

    clearRoundTimer();
    setStatusText("Quase... essa frase vai recomeçar.");
    advanceTimerRef.current = window.setTimeout(() => {
      setStatusText("");
      setModal("retry-round");
    }, 600);
  }

  const handleKeyGuess = useEffectEvent((value) => {
    submitGuess(value);
  });

  const playRomanticTrack = useEffectEvent(() => {
    void playTrack(ROMANTIC_TRACK, "romantic", 0.55);
  });

  const playOfficialTrack = useEffectEvent(() => {
    void playTrack(OFFICIAL_TRACK, "official", 1);
  });

  const stopAudioOnCleanup = useEffectEvent(() => {
    stopAllAudio();
  });

  useEffect(() => {
    const root = document.documentElement;

    function handleResize() {
      const width = window.visualViewport?.width ?? window.innerWidth;
      const height = window.visualViewport?.height ?? window.innerHeight;

      root.style.setProperty("--app-width", `${width}px`);
      root.style.setProperty("--app-height", `${height}px`);

      setViewport({
        width,
        height,
      });
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (!/^[a-z]$/i.test(event.key)) {
        return;
      }

      event.preventDefault();
      handleKeyGuess(event.key);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (screen !== "stage3") {
      clearFinaleTimer();
      romanticStartedRef.current = false;
      return;
    }

    if (finalStep === "official") {
      playOfficialTrack();
      return;
    }

    if (!romanticStartedRef.current) {
      romanticStartedRef.current = true;
      playRomanticTrack();
    }

    if (finalStep !== "waiting") {
      return;
    }

    clearFinaleTimer();
    finaleTimerRef.current = window.setTimeout(() => {
      setFinalStep("ready");
    }, 30000);

    return () => clearFinaleTimer();
  }, [finalStep, screen]);

  useEffect(() => {
    return () => {
      clearRoundTimer();
      clearFinaleTimer();
      stopAudioOnCleanup();
    };
  }, []);

  function handleProposalNo() {
    setModal("confirm-no");
  }

  function confirmProposalNo() {
    setModal(null);

    if (noCount === 0) {
      setNoCount(1);
      setModal("wrong-answer");
      return;
    }

    clearFinaleTimer();
    stopAllAudio();
    setScreen("ending");
  }

  function acceptProposal() {
    clearFinaleTimer();
    setModal(null);
    setScreen("stage3");
    setFinalStep("waiting");
    setConfettiPieces([]);
  }

  function handleOfficialMoment() {
    setFinalStep("official");
    setConfettiPieces(createConfettiPieces());
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient--one" />
      <div className="ambient ambient--two" />

      {showDesktopBlock ? (
        <section className="gate-screen">
          <h1>Abra este jogo em um celular</h1>
          <p>Este jogo foi otimizado apenas para telas mobile.</p>
        </section>
      ) : showRotatePrompt ? (
        <section className="gate-screen">
          <h1>Vire o celular para a horizontal</h1>
          <p>
            Modo vertical bloqueado para preservar <br /> a experiência do jogo.
          </p>
        </section>
      ) : (
        <section className="game-frame">
          {screen === "intro" ? (
            <div className="intro-screen">
              <h1>JOGO DA FORCA</h1>
              <button
                className="primary-button intro-button"
                onClick={handleStartGame}>
                Iniciar
              </button>
              <p className="intro-hint">Toque para jogar em tela cheia.</p>
            </div>
          ) : screen === "ending" ? (
            <div className="ending-screen">
              <span className="ending-tag">Fim do jogo</span>
              <h1>Devolva o celular ao dono e finja que nada aconteceu.</h1>
              <button className="primary-button" onClick={handleStartGame}>
                Recomecar
              </button>
            </div>
          ) : (
            <>
              <header className="top-bar">
                <p className="top-bar__label">{getPhaseLabel(screen)}</p>
                <div className="progress">
                  <div className="progress__track">
                    <div
                      className="progress__fill"
                      style={{ width: `${progressValue}%` }}
                    />
                  </div>
                  <span className="progress__value">
                    {Math.round(progressValue)}%
                  </span>
                </div>
              </header>

              {screen === "stage3" ? (
                <section className="finale-screen">
                  <div className="hearts-layer" aria-hidden="true">
                    {HEARTS.map((heart) => (
                      <span
                        key={heart.id}
                        className="heart"
                        style={{
                          left: heart.left,
                          animationDelay: heart.delay,
                          width: heart.size,
                          height: heart.size,
                        }}
                      />
                    ))}
                  </div>

                  {finalStep === "official" && (
                    <div className="confetti-layer" aria-hidden="true">
                      {confettiPieces.map((piece) => (
                        <span
                          key={piece.id}
                          className="confetti"
                          style={{
                            left: piece.left,
                            animationDelay: piece.delay,
                            animationDuration: piece.duration,
                            backgroundColor: piece.color,
                            rotate: piece.rotate,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  <div className="finale-copy">
                    <div className="finale-copy__head">
                      <span className="ending-tag">Fase final</span>
                      <h1>
                        {finalStep === "ready" || finalStep === "official"
                          ? "ENTÃO É OFICIAL?"
                          : "Estou nervoso, mas espera ai que tem mais..."}
                      </h1>
                    </div>

                    <div className="finale-copy__foot">
                      {finalStep === "ready" || finalStep === "official" ? (
                        <button
                          className="primary-button"
                          onClick={handleOfficialMoment}>
                          É OFICIAL!
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="polaroid-row">
                    {POLAROIDS.map((label, index) => (
                      <article
                        key={label}
                        className={`polaroid polaroid--${index + 1}`}>
                        <div className="polaroid__photo">Foto {index + 1}</div>
                        <p>{label}</p>
                      </article>
                    ))}
                  </div>
                </section>
              ) : (
                <section
                  className={`game-stage ${!hangmanActive ? "game-stage--solo" : ""}`}>
                  <div
                    className={`phrase-panel ${!hangmanActive ? "phrase-panel--solo" : ""}`}>
                    <PhraseBoard
                      phrase={currentPhrase}
                      guessedLetters={guessedLetters}
                      revealAll={revealFullPhrase}
                      hideQuestionMark={hideQuestionMark}
                      large={screen === "stage2-choice"}
                    />

                    <div className="status-strip">
                      <span>
                        {statusText || `Erros permitidos: ${MAX_ERRORS}`}
                      </span>
                      <span>
                        Letras erradas: {wrongLetters.join(" ") || "nenhuma"}
                      </span>
                    </div>

                    {screen === "stage2-choice" && (
                      <div className="proposal-actions">
                        <button
                          className="primary-button"
                          onClick={acceptProposal}>
                          SIM
                        </button>
                        <button
                          className="secondary-button"
                          onClick={handleProposalNo}>
                          NAO
                        </button>
                      </div>
                    )}
                  </div>

                  {hangmanActive && (
                    <>
                      <aside className="hangman-card">
                        <HangmanDrawing errors={wrongLetters.length} />
                      </aside>

                      <aside className="keyboard-panel">
                        <div className="keyboard">
                          {ALPHABET.map((letter) => {
                            const isUsed = usedLetters.has(letter);
                            const isCorrect = guessedLetters.includes(letter);

                            return (
                              <button
                                key={letter}
                                className={`key ${isCorrect ? "key--correct" : ""} ${isUsed && !isCorrect ? "key--wrong" : ""}`}
                                onClick={() => submitGuess(letter)}
                                disabled={isUsed || Boolean(modal)}>
                                {letter}
                              </button>
                            );
                          })}
                        </div>
                      </aside>
                    </>
                  )}
                </section>
              )}
            </>
          )}
        </section>
      )}

      <GameModal
        modalType={modal}
        onRetryRound={() => {
          setModal(null);
          resetRound();
        }}
        onConfirmNo={confirmProposalNo}
        onClose={() => setModal(null)}
      />
    </main>
  );
}

export default App;
