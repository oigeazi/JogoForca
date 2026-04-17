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
const OFFICIAL_RECORDING_DELAY_MS = 20000;
const ENDING_RECORDING_DELAY_MS = 5000;
const CAMERA_ASPECT_RATIO = 16 / 9;
const RECORDER_MIME_TYPES = [
  "video/mp4;codecs=h264,aac",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

function App() {
  const [screen, setScreen] = useState(DEBUG_STAGE ? "stage3" : "intro");
  const [selectedCompliment, setSelectedCompliment] = useState(
    COMPLIMENT_OPTIONS[0],
  );
  const [guessedLetters, setGuessedLetters] = useState([]);
  const [wrongLetters, setWrongLetters] = useState([]);
  const [modal, setModal] = useState(null);
  const [noCount, setNoCount] = useState(0);
  const [wrongAnswerCountdown, setWrongAnswerCountdown] = useState(7);
  const [statusText, setStatusText] = useState("");
  const [cameraFeedback, setCameraFeedback] = useState("");
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
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const cameraPreparePromiseRef = useRef(null);
  const recorderRef = useRef(null);
  const recorderMimeTypeRef = useRef("");
  const recordedChunksRef = useRef([]);
  const recorderStopTimerRef = useRef(null);
  const recorderStreamRef = useRef(null);
  const recordingAudioContextRef = useRef(null);
  const recordingArmedRef = useRef(false);
  const shouldDownloadRecordingRef = useRef(true);
  const roundTimerCallbackRef = useRef(null);
  const roundTimerRemainingRef = useRef(0);
  const roundTimerStartedAtRef = useRef(0);
  const finaleTimerRemainingRef = useRef(10000);
  const finaleTimerStartedAtRef = useRef(0);
  const { getRecordingAudioStream, playTrack, stopAllAudio } = useGameAudio();

  const isMobileViewport = viewport.width <= 950;
  const isLandscape = viewport.width > viewport.height;
  const showDesktopBlock = !isMobileViewport;
  const showRotatePrompt = isMobileViewport && !isLandscape;
  const isViewportBlocked = showDesktopBlock || showRotatePrompt;
  const isSecureRuntime =
    typeof window !== "undefined" ? window.isSecureContext : false;
  const canRequestUserMedia =
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia);
  const canRecordMedia =
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined";
  const shouldRecordOnThisDevice = isMobileViewport;
  const hangmanActive = screen === "stage1" || screen === "stage2-guess";
  const currentPhrase =
    screen === "stage1" ? selectedCompliment : PROPOSAL_PHRASE;
  const phraseLetters = extractLetters(currentPhrase);
  const usedLetters = new Set([...guessedLetters, ...wrongLetters]);
  const progressValue = getProgress(screen, finalStep);
  const revealFullPhrase = screen === "stage2-choice";
  const hideQuestionMark = screen === "stage2-guess";
  const showProposalChoice = screen === "stage2-choice";

  function getRecordingUnavailableReason() {
    if (!shouldRecordOnThisDevice) {
      return "A gravação fica desativada fora do celular.";
    }

    if (!recordingArmedRef.current) {
      return "A gravação só será ativada se você tocar no logo antes de iniciar.";
    }

    if (!isSecureRuntime) {
      return `Para liberar a câmera no celular, abra em HTTPS. ${window.location.origin} não é um contexto seguro para getUserMedia nesse aparelho.`;
    }

    if (!canRequestUserMedia) {
      return "Este navegador não disponibilizou acesso à câmera.";
    }

    if (!canRecordMedia) {
      return "Este navegador não suporta gravação com MediaRecorder.";
    }

    return "";
  }

  function clearRoundTimer(resetState = true) {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }

    if (resetState) {
      roundTimerCallbackRef.current = null;
      roundTimerRemainingRef.current = 0;
      roundTimerStartedAtRef.current = 0;
    }
  }

  function clearFinaleTimer(resetState = true) {
    if (finaleTimerRef.current) {
      window.clearTimeout(finaleTimerRef.current);
      finaleTimerRef.current = null;
    }

    if (resetState) {
      finaleTimerRemainingRef.current = 10000;
      finaleTimerStartedAtRef.current = 0;
    }
  }

  function clearRecorderStopTimer() {
    if (recorderStopTimerRef.current) {
      window.clearTimeout(recorderStopTimerRef.current);
      recorderStopTimerRef.current = null;
    }
  }

  function attachCameraStream(stream) {
    if (!cameraVideoRef.current) {
      return;
    }

    cameraVideoRef.current.srcObject = stream;
    const previewPlayback = cameraVideoRef.current.play();
    previewPlayback?.catch(() => {
      // O preview fica invisível e pode ser bloqueado sem afetar a gravação.
    });
  }

  function hasUsableCameraStream() {
    if (!cameraStreamRef.current) {
      return false;
    }

    return cameraStreamRef.current
      .getTracks()
      .some((track) => track.readyState === "live");
  }

  function releaseCameraStream() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    cameraPreparePromiseRef.current = null;
    recordingArmedRef.current = false;

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  }

  function releaseRecorderStream() {
    recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
    recorderStreamRef.current = null;

    if (recordingAudioContextRef.current) {
      void recordingAudioContextRef.current.close();
      recordingAudioContextRef.current = null;
    }
  }

  function getSupportedRecorderMimeType() {
    if (typeof MediaRecorder === "undefined") {
      return "";
    }

    return (
      RECORDER_MIME_TYPES.find((mimeType) =>
        MediaRecorder.isTypeSupported(mimeType),
      ) ?? ""
    );
  }

  function getRecorderOutputMimeType() {
    const chunkMimeType =
      recordedChunksRef.current.find((chunk) => chunk.type)?.type ?? "";
    const configuredMimeType = recorderMimeTypeRef.current ?? "";
    const supportedMimeType = getSupportedRecorderMimeType();

    return (
      chunkMimeType || configuredMimeType || supportedMimeType || "video/webm"
    );
  }

  async function createRecorderStream(baseStream) {
    const videoTracks = baseStream.getVideoTracks();
    const microphoneTracks = baseStream.getAudioTracks();
    const appAudioStream = getRecordingAudioStream();
    const hasAppAudio =
      Boolean(appAudioStream) && appAudioStream.getAudioTracks().length > 0;

    releaseRecorderStream();

    if (microphoneTracks.length === 0 && !hasAppAudio) {
      return new MediaStream(videoTracks);
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return new MediaStream([...videoTracks, ...microphoneTracks]);
    }

    const recordingAudioContext = new AudioContextClass();
    const mixedDestination = recordingAudioContext.createMediaStreamDestination();

    if (recordingAudioContext.state === "suspended") {
      await recordingAudioContext.resume();
    }

    if (microphoneTracks.length > 0) {
      const microphoneStream = new MediaStream(microphoneTracks);
      const microphoneSource =
        recordingAudioContext.createMediaStreamSource(microphoneStream);
      microphoneSource.connect(mixedDestination);
    }

    if (hasAppAudio) {
      const appAudioSource =
        recordingAudioContext.createMediaStreamSource(appAudioStream);
      appAudioSource.connect(mixedDestination);
    }

    const recorderStream = new MediaStream([
      ...videoTracks,
      ...mixedDestination.stream.getAudioTracks(),
    ]);

    recorderStreamRef.current = recorderStream;
    recordingAudioContextRef.current = recordingAudioContext;

    return recorderStream;
  }

  function getCameraVideoConstraints() {
    const supportedConstraints =
      navigator.mediaDevices?.getSupportedConstraints?.() ?? {};
    const videoConstraints = {
      facingMode: "user",
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    };

    if (supportedConstraints.aspectRatio) {
      videoConstraints.aspectRatio = { ideal: CAMERA_ASPECT_RATIO };
    }

    if (supportedConstraints.resizeMode) {
      videoConstraints.resizeMode = "crop-and-scale";
    }

    return videoConstraints;
  }

  async function prepararCamera() {
    if (!shouldRecordOnThisDevice) {
      setCameraFeedback("A gravação fica desativada fora do celular.");
      recordingArmedRef.current = false;
      return false;
    }

    recordingArmedRef.current = true;
    const unavailableReason = getRecordingUnavailableReason();

    if (unavailableReason) {
      setCameraFeedback(unavailableReason);
      console.warn(unavailableReason);
      recordingArmedRef.current = false;
      return false;
    }

    if (hasUsableCameraStream()) {
      attachCameraStream(cameraStreamRef.current);
      setCameraFeedback("");
      return true;
    }

    if (cameraStreamRef.current) {
      releaseCameraStream();
    }

    if (cameraPreparePromiseRef.current) {
      await cameraPreparePromiseRef.current;
      return hasUsableCameraStream();
    }

    cameraPreparePromiseRef.current = navigator.mediaDevices
      .getUserMedia({
        video: getCameraVideoConstraints(),
        audio: true,
      })
      .then((stream) => {
        cameraStreamRef.current = stream;
        attachCameraStream(stream);
        setCameraFeedback("");
        recordingArmedRef.current = true;
        return true;
      })
      .catch((error) => {
        setCameraFeedback("A câmera foi bloqueada ou não ficou disponível.");
        console.error("Não foi possível preparar a câmera.", error);
        recordingArmedRef.current = false;
        return false;
      })
      .finally(() => {
        cameraPreparePromiseRef.current = null;
      });

    return await cameraPreparePromiseRef.current;
  }

  function dispararDownloadGravacao(videoBlob, mimeType) {
    const videoUrl = URL.createObjectURL(videoBlob);
    const downloadLink = document.createElement("a");
    const extension = mimeType.includes("mp4") ? "mp4" : "webm";

    downloadLink.href = videoUrl;
    downloadLink.download = `gravacao-jogo-forca-${Date.now()}.${extension}`;
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(videoUrl);
    }, 1000);
  }

  async function iniciarGravacao() {
    if (!shouldRecordOnThisDevice || !recordingArmedRef.current) {
      return false;
    }

    if (
      typeof MediaRecorder === "undefined" ||
      (recorderRef.current && recorderRef.current.state !== "inactive")
    ) {
      if (typeof MediaRecorder === "undefined") {
        console.warn("MediaRecorder não está disponível neste navegador.");
        return false;
      }

      return true;
    }

    if (!hasUsableCameraStream()) {
      const cameraReady = await prepararCamera();

      if (!cameraReady || !cameraStreamRef.current) {
        return false;
      }
    }

    clearRecorderStopTimer();
    shouldDownloadRecordingRef.current = true;
    recordedChunksRef.current = [];

    try {
      const recorderStream = await createRecorderStream(cameraStreamRef.current);
      const mimeType = getSupportedRecorderMimeType();
      const recorder = mimeType
        ? new MediaRecorder(recorderStream, { mimeType })
        : new MediaRecorder(recorderStream);

      recorderMimeTypeRef.current = recorder.mimeType || mimeType || "";
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        clearRecorderStopTimer();

        const mimeTypeForDownload = getRecorderOutputMimeType();

        if (
          shouldDownloadRecordingRef.current &&
          recordedChunksRef.current.length > 0
        ) {
          const videoBlob = new Blob(recordedChunksRef.current, {
            type: mimeTypeForDownload,
          });

          dispararDownloadGravacao(videoBlob, mimeTypeForDownload);
        }

        recordedChunksRef.current = [];
        recorderMimeTypeRef.current = "";
        recorderRef.current = null;
        releaseRecorderStream();
        releaseCameraStream();
      };

      recorder.onerror = (event) => {
        console.error("Erro durante a gravação.", event.error);
        clearRecorderStopTimer();
        recorderRef.current = null;
        releaseRecorderStream();
        releaseCameraStream();
      };

      recorder.start(1000);
      return true;
    } catch (error) {
      console.error("Não foi possível iniciar a gravação.", error);
      releaseRecorderStream();
      releaseCameraStream();
      return false;
    }
  }

  function finalizarGravacaoComDelay(delayMs = OFFICIAL_RECORDING_DELAY_MS) {
    clearRecorderStopTimer();

    recorderStopTimerRef.current = window.setTimeout(() => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
        return;
      }

      releaseCameraStream();
    }, delayMs);
  }

  function resetRound() {
    setGuessedLetters([]);
    setWrongLetters([]);
    clearRoundTimer();
  }

  function runRoundTimerCallback() {
    const callback = roundTimerCallbackRef.current;

    clearRoundTimer();

    if (callback) {
      callback();
    }
  }

  function startRoundTimer(delayMs) {
    if (isViewportBlocked || !roundTimerCallbackRef.current) {
      return;
    }

    roundTimerRemainingRef.current = delayMs;
    roundTimerStartedAtRef.current = Date.now();
    advanceTimerRef.current = window.setTimeout(runRoundTimerCallback, delayMs);
  }

  function scheduleRoundTimer(callback, delayMs) {
    clearRoundTimer();
    roundTimerCallbackRef.current = callback;
    startRoundTimer(delayMs);
  }

  function pauseRoundTimer() {
    if (!advanceTimerRef.current) {
      return;
    }

    const elapsedMs = Date.now() - roundTimerStartedAtRef.current;
    roundTimerRemainingRef.current = Math.max(
      0,
      roundTimerRemainingRef.current - elapsedMs,
    );
    clearRoundTimer(false);
  }

  function resumeRoundTimer() {
    if (!roundTimerCallbackRef.current || advanceTimerRef.current) {
      return;
    }

    startRoundTimer(roundTimerRemainingRef.current);
  }

  function queueAdvance(message, callback) {
    clearRoundTimer();
    setStatusText(message);
    scheduleRoundTimer(() => {
      startTransition(() => {
        callback();
        setStatusText("");
      });
    }, 900);
  }

  function startFinaleTimer(delayMs) {
    if (isViewportBlocked || screen !== "stage3" || finalStep !== "waiting") {
      return;
    }

    finaleTimerRemainingRef.current = delayMs;
    finaleTimerStartedAtRef.current = Date.now();
    finaleTimerRef.current = window.setTimeout(() => {
      clearFinaleTimer();
      setFinalStep("ready");
    }, delayMs);
  }

  function pauseFinaleTimer() {
    if (!finaleTimerRef.current) {
      return;
    }

    const elapsedMs = Date.now() - finaleTimerStartedAtRef.current;
    finaleTimerRemainingRef.current = Math.max(
      0,
      finaleTimerRemainingRef.current - elapsedMs,
    );
    clearFinaleTimer(false);
  }

  function resumeFinaleTimer() {
    if (
      finaleTimerRef.current ||
      screen !== "stage3" ||
      finalStep !== "waiting" ||
      finaleTimerRemainingRef.current <= 0
    ) {
      return;
    }

    startFinaleTimer(finaleTimerRemainingRef.current);
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

  async function iniciarJogo() {
    await enterFullscreen();
    clearRoundTimer();
    clearFinaleTimer();
    clearRecorderStopTimer();
    if (shouldRecordOnThisDevice && recordingArmedRef.current) {
      await iniciarGravacao();
    }
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
        queueAdvance("Boa! Vamos para a próxima.", () => {
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
    setStatusText("Quase... tente novamente.");
    scheduleRoundTimer(() => {
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
      // Se houver um modal aberto ou o jogo não estiver ativo, ignorar teclado físico.
      if (modal || !hangmanActive || !/^[a-z]$/i.test(event.key)) {
        return;
      }

      event.preventDefault();
      handleKeyGuess(event.key);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modal, hangmanActive]); // `handleKeyGuess` vem de `useEffectEvent`.

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
    startFinaleTimer(10000);

    return () => clearFinaleTimer();
  }, [finalStep, isViewportBlocked, screen]);

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
    if (modal !== "wrong-answer") {
      setWrongAnswerCountdown(7);
      return;
    }

    if (wrongAnswerCountdown <= 0) {
      setModal(null);
      return;
    }

    if (isViewportBlocked) {
      return;
    }

    const countdownInterval = window.setInterval(() => {
      setWrongAnswerCountdown((currentCountdown) => {
        if (currentCountdown <= 1) {
          window.clearInterval(countdownInterval);
          setModal(null);
          return 0;
        }

        return currentCountdown - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(countdownInterval);
    };
  }, [isViewportBlocked, modal, wrongAnswerCountdown]);

  useEffect(() => {
    if (isViewportBlocked) {
      pauseRoundTimer();
      pauseFinaleTimer();
      return;
    }

    resumeRoundTimer();
    resumeFinaleTimer();
  }, [isViewportBlocked]);

  useEffect(() => {
    return () => {
      clearRoundTimer();
      clearFinaleTimer();
      clearRecorderStopTimer();
      shouldDownloadRecordingRef.current = false;

      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
        return;
      }

      releaseRecorderStream();
      releaseCameraStream();
      stopAudioOnCleanup();
    };
  }, []);

  function handleProposalNo() {
    const nextNoCount = noCount + 1;

    setNoCount(nextNoCount);

    if (nextNoCount >= 3) {
      finishGame();
      return;
    }

    setModal(nextNoCount === 1 ? "confirm-no-first" : "confirm-no-second");
  }

  function finishGame() {
    clearFinaleTimer();
    stopAllAudio();
    setModal(null);
    setScreen("ending");
    finalizarGravacaoComDelay(ENDING_RECORDING_DELAY_MS);
  }

  function confirmProposalNo() {
    setModal(null);

    if (noCount === 1) {
      setModal("wrong-answer");
      return;
    }

    finishGame();
  }

  function acceptProposal() {
    if (screen === "stage3") return; // Evita cliques duplos

    clearFinaleTimer();
    clearRoundTimer();
    setModal(null);
    setScreen("stage3");
    setFinalStep("waiting");
  }

  function handleOfficialMoment() {
    setFinalStep("official");
    finalizarGravacaoComDelay();

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
              <button
                type="button"
                className="intro-logo-button"
                onClick={prepararCamera}
                aria-label="Preparar câmera">
                <img
                  className="intro-logo"
                  src={logoJogoForca}
                  alt="Logo Jogo da Forca"
                />
              </button>
              <button
                className="primary-button intro-button"
                onClick={iniciarJogo}>
                Iniciar
              </button>
              <p className="intro-hint">Toque para jogar em tela cheia.</p>
              {cameraFeedback ? (
                <p className="intro-hint intro-hint--warning">
                  {cameraFeedback}
                </p>
              ) : null}
            </div>
          ) : screen === "ending" ? (
            <div className="ending-screen">
              <span className="ending-tag">Fim do jogo</span>
              <h1>Devolva o celular ao dono e finja que nada aconteceu.</h1>
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
                            : "Estou nervoso, mas espera aí que tem mais..."}
                        </h1>
                      )}
                    </div>

                    <div className="finale-copy__foot">
                      {finalStep === "ready" ? (
                        <button
                          className="primary-button"
                          onClick={handleOfficialMoment}>
                          {"\u00C9 Oficial"}
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
                          onClick={acceptProposal}
                          aria-label="Aceitar pedido de namoro">
                          SIM
                        </button>
                        <button
                          className="secondary-button"
                          onClick={handleProposalNo}
                          aria-label="Recusar pedido de namoro">
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
        wrongAnswerCountdown={wrongAnswerCountdown}
        onRetryRound={() => {
          setModal(null);
          resetRound();
        }}
        onConfirmNo={confirmProposalNo}
        onWrongAnswerContinue={() => setModal(null)}
        onClose={() => setModal(null)}
      />

      <video
        ref={cameraVideoRef}
        className="camera-preview-hidden"
        autoPlay
        playsInline
        muted
        aria-hidden="true"
      />
    </main>
  );
}

export default App;
