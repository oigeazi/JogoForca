import { useEffect, useEffectEvent, useRef } from "react";

export function useGameAudio() {
  const backgroundAudioRef = useRef(null);
  const audioContextRef = useRef(null);
  const masterGainRef = useRef(null);
  const recordingDestinationRef = useRef(null);
  const activeAudioRefs = useRef(new Set());

  function ensureAudioGraph() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    if (!audioContextRef.current) {
      const context = new AudioContextClass();
      const masterGain = context.createGain();
      const recordingDestination = context.createMediaStreamDestination();

      masterGain.connect(context.destination);
      masterGain.connect(recordingDestination);

      audioContextRef.current = context;
      masterGainRef.current = masterGain;
      recordingDestinationRef.current = recordingDestination;
    }

    return {
      context: audioContextRef.current,
      masterGain: masterGainRef.current,
      recordingDestination: recordingDestinationRef.current,
    };
  }

  function clearFadeTimer(audioState) {
    if (audioState?.fadeTimer) {
      window.clearInterval(audioState.fadeTimer);
      audioState.fadeTimer = null;
    }
  }

  function cleanupAudio(audioState) {
    if (!audioState || audioState.cleanedUp) {
      return;
    }

    audioState.cleanedUp = true;
    clearFadeTimer(audioState);
    audioState.audio.pause();
    audioState.audio.removeAttribute("src");
    audioState.audio.load();
    audioState.sourceNode?.disconnect();
    audioState.gainNode?.disconnect();
    activeAudioRefs.current.delete(audioState);

    if (backgroundAudioRef.current === audioState) {
      backgroundAudioRef.current = null;
    }
  }

  function stopAllAudio() {
    for (const audioState of activeAudioRefs.current) {
      cleanupAudio(audioState);
    }

    activeAudioRefs.current.clear();
    backgroundAudioRef.current = null;
  }

  function createAudioState(src, volume, { loop = false } = {}) {
    const audioGraph = ensureAudioGraph();
    const audio = new Audio(src);
    audio.loop = loop;
    audio.volume = audioGraph ? 1 : volume;
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";

    const audioState = {
      audio,
      src,
      gainNode: null,
      sourceNode: null,
      fadeTimer: null,
      cleanedUp: false,
    };

    if (audioGraph) {
      const gainNode = audioGraph.context.createGain();
      gainNode.gain.value = volume;

      const sourceNode = audioGraph.context.createMediaElementSource(audio);
      sourceNode.connect(gainNode);
      gainNode.connect(audioGraph.masterGain);

      audioState.gainNode = gainNode;
      audioState.sourceNode = sourceNode;
    }

    audio.addEventListener("ended", () => {
      if (!audio.loop) {
        cleanupAudio(audioState);
      }
    });

    activeAudioRefs.current.add(audioState);
    return { audioGraph, audioState };
  }

  async function fadeAudio(audioState, targetVolume, durationMs = 600) {
    if (!audioState || audioState.cleanedUp) {
      return;
    }

    clearFadeTimer(audioState);

    const steps = Math.max(1, Math.round(durationMs / 50));
    const startVolume = audioState.gainNode
      ? audioState.gainNode.gain.value
      : audioState.audio.volume;
    const volumeDelta = targetVolume - startVolume;

    if (durationMs <= 0 || volumeDelta === 0) {
      if (audioState.gainNode) {
        audioState.gainNode.gain.value = targetVolume;
      } else {
        audioState.audio.volume = targetVolume;
      }

      return;
    }

    let currentStep = 0;

    await new Promise((resolve) => {
      audioState.fadeTimer = window.setInterval(() => {
        currentStep += 1;
        const nextVolume = startVolume + (volumeDelta * currentStep) / steps;
        const safeVolume = Math.max(0, nextVolume);

        if (audioState.gainNode) {
          audioState.gainNode.gain.value = safeVolume;
        } else {
          audioState.audio.volume = safeVolume;
        }

        if (currentStep >= steps) {
          clearFadeTimer(audioState);
          resolve();
        }
      }, durationMs / steps);
    });
  }

  async function playTrack(src, volume, options = {}) {
    const { loop = true, fadeMs = 650 } = options;
    const currentTrack = backgroundAudioRef.current;

    if (currentTrack && currentTrack.src === src) {
      const audioGraph = ensureAudioGraph();

      currentTrack.audio.loop = loop;

      if (currentTrack.gainNode) {
        currentTrack.gainNode.gain.value = volume;
      } else {
        currentTrack.audio.volume = volume;
      }

      try {
        if (audioGraph?.context.state === "suspended") {
          await audioGraph.context.resume();
        }

        if (currentTrack.audio.paused) {
          await currentTrack.audio.play();
        }
      } catch {
        cleanupAudio(currentTrack);
      }

      return;
    }

    const previousTrack = currentTrack;
    const { audioGraph, audioState } = createAudioState(src, volume, { loop });
    backgroundAudioRef.current = audioState;

    if (audioState.gainNode) {
      audioState.gainNode.gain.value = 0;
    } else {
      audioState.audio.volume = 0;
    }

    const fallback = () => {
      if (backgroundAudioRef.current === audioState) {
        cleanupAudio(audioState);
      }
    };

    audioState.audio.addEventListener("error", fallback, { once: true });

    try {
      if (audioGraph?.context.state === "suspended") {
        await audioGraph.context.resume();
      }

      await audioState.audio.play();
      await Promise.all([
        fadeAudio(audioState, volume, fadeMs),
        previousTrack ? fadeAudio(previousTrack, 0, fadeMs) : Promise.resolve(),
      ]);

      if (previousTrack) {
        cleanupAudio(previousTrack);
      }
    } catch {
      fallback();
    }
  }

  async function playEffect(src, volume, options = {}) {
    const { loop = false } = options;

    const { audioGraph, audioState } = createAudioState(src, volume, { loop });

    try {
      if (audioGraph?.context.state === "suspended") {
        await audioGraph.context.resume();
      }

      await audioState.audio.play();
      return audioState;
    } catch {
      cleanupAudio(audioState);
      return null;
    }
  }

  function getRecordingAudioStream() {
    const audioGraph = ensureAudioGraph();

    return audioGraph?.recordingDestination?.stream ?? null;
  }

  const stopAudioOnUnmount = useEffectEvent(() => {
    stopAllAudio();
  });

  useEffect(() => {
    return () => {
      stopAudioOnUnmount();

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    getRecordingAudioStream,
    playEffect,
    playTrack,
    stopAllAudio,
  };
}
