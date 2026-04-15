import {
  startTransition,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import confetti from "canvas-confetti";
import "./App.css";
import FloatingHeart from "./components/FloatingHeart";
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
import logoJogoForca from "./assets/Logo Jogo Forca.png";
import { useGameAudio } from "./hooks/useGameAudio";
import { getPhaseLabel, getProgress, pickRandomItem } from "./utils/gameState";
import { extractLetters, normalizeChar } from "./utils/text";

const DEBUG_STAGE = null;
// "stage3-ready"
// "stage3-official"

function App() {
  const [screen, setScreen] = useState(DEBUG_STAGE ? "stage3" : "intro");
  const [selectedCompliment, setSelectedCompliment] = useState(
    COMPLIMENT_OPTIONS[0],
  );
  const [guessedLetters, setGuessedLetters] = useState([]);
  const [wrongLetters, setWrongLetters] = useState([]);
  const [modal, setModal] = useState(null);
  const [noCount, setNoCount] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [finalStep, setFinalStep] = useState(
    DEBUG_STAGE === "stage3-ready"
      ? "ready"
      : DEBUG_STAGE === "stage3-official"
        ? "official"
        : "waiting",
  );
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const advanceTimerRef = useRef(null);
  const confettiCanvasRef = useRef(null);
  const confettiLauncherRef = useRef(null);
  const confettiHeartsRef = useRef([]);
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
  const showProposalChoice = screen === "stage2-choice";

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
    void playTrack(ROMANTIC_TRACK, "romantic", 0.55, { loop: true });
  });

  const playOfficialTrack = useEffectEvent(() => {
    void playTrack(OFFICIAL_TRACK, "official", 1, { loop: false });
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
    }, 10000);

    return () => clearFinaleTimer();
  }, [finalStep, screen]);

  useEffect(() => {
    if (screen !== "stage3" || !confettiCanvasRef.current) {
      confettiLauncherRef.current?.reset?.();
      confettiLauncherRef.current = null;
      confettiHeartsRef.current = [];
      return;
    }

    confettiLauncherRef.current = confetti.create(confettiCanvasRef.current, {
      resize: true,
      useWorker: true,
    });
    confettiHeartsRef.current = [
      confetti.shapeFromText({ text: "❤️", scalar: 2.1, color: "#fbcfe8" }),
      confetti.shapeFromText({ text: "🤍", scalar: 2.1, color: "#f472b6" }),
      confetti.shapeFromText({ text: "💜", scalar: 2.1, color: "#ec4899" }),
      confetti.shapeFromText({ text: "❤️", scalar: 2.1, color: "#88dd18" }),
    ];

    return () => {
      confettiLauncherRef.current?.reset?.();
      confettiLauncherRef.current = null;
      confettiHeartsRef.current = [];
    };
  }, [screen]);

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
  }

  function handleOfficialMoment() {
    setFinalStep("official");

    const launch = confettiLauncherRef.current;
    const heartShapes = confettiHeartsRef.current;

    if (!launch || heartShapes.length === 0) {
      return;
    }

    const end = Date.now() + 2400;
    const defaults = {
      scalar: 1.8,
      startVelocity: 18,
      ticks: 160,
      gravity: 0.55,
      decay: 0.96,
      drift: 0.15,
      shapes: heartShapes,
      zIndex: 3,
      disableForReducedMotion: false,
    };

    function frame() {
      void launch({
        ...defaults,
        particleCount: 1,
        spread: 70,
        origin: { x: 0.18, y: 0.72 },
      });

      void launch({
        ...defaults,
        particleCount: 2,
        spread: 70,
        origin: { x: 0.82, y: 0.72 },
      });

      void launch({
        ...defaults,
        particleCount: 1,
        spread: 50,
        origin: { x: 0.5, y: 0.6 },
        scalar: 1.5,
        startVelocity: 22,
      });

      if (Date.now() < end) {
        window.requestAnimationFrame(frame);
      }
    }

    frame();
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
              <img
                className="intro-logo"
                src={logoJogoForca}
                alt="Logo Jogo da Forca"
              />
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
              <header
                className={`top-bar ${screen === "stage3" && finalStep === "official" ? "top-bar--celebration" : ""}`}>
                <p className="top-bar__label">
                  {getPhaseLabel(screen, finalStep)}
                </p>
                {!(screen === "stage3" && finalStep === "official") && (
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
                )}
              </header>

              {screen === "stage3" ? (
                <section
                  className={`finale-screen ${finalStep === "official" ? "finale-screen--official" : "finale-screen--centered"}`}>
                  <canvas
                    ref={confettiCanvasRef}
                    className="confetti-canvas"
                    aria-hidden="true"
                  />

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
                          rotate: heart.rotate,
                        }}>
                        <FloatingHeart className="heart-svg" />
                      </span>
                    ))}
                  </div>

                  <div className="finale-copy">
                    <div className="finale-copy__head">
                      {finalStep === "official" ? (
                        <h1 className="finale-couple-name">Geazi & Ester</h1>
                      ) : (
                        <h1>
                          {finalStep === "ready"
                            ? "É OFICIAL?"
                            : "Estou nervoso, mas espera ai que tem mais..."}
                        </h1>
                      )}
                    </div>

                    <div className="finale-copy__foot">
                      {finalStep === "ready" ? (
                        <button
                          className="primary-button"
                          onClick={handleOfficialMoment}>
                          SIM
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {finalStep === "official" && (
                    <div className="polaroid-row">
                      {POLAROIDS.map((polaroid, index) => (
                        <article
                          key={polaroid.label}
                          className={`polaroid polaroid--${index + 1}`}>
                          <img
                            className="polaroid__photo"
                            src={polaroid.image}
                            alt={polaroid.label}
                          />
                          <p>{polaroid.label}</p>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              ) : (
                <section
                  className={`game-stage ${!hangmanActive ? "game-stage--solo" : ""}`}>
                  <div
                    className={`phrase-panel ${!hangmanActive ? "phrase-panel--solo" : ""} ${showProposalChoice ? "phrase-panel--choice" : ""}`}>
                    <PhraseBoard
                      phrase={currentPhrase}
                      guessedLetters={guessedLetters}
                      revealAll={revealFullPhrase}
                      hideQuestionMark={hideQuestionMark}
                      large={screen === "stage2-choice"}
                      clean={screen === "stage2-choice"}
                    />

                    {!showProposalChoice && (
                      <div className="status-strip">
                        <span>
                          {statusText || `Erros permitidos: ${MAX_ERRORS}`}
                        </span>
                        <span>
                          Letras erradas: {wrongLetters.join(" ") || "nenhuma"}
                        </span>
                      </div>
                    )}

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
                          NÃO
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
