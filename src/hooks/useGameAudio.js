import { useEffect, useEffectEvent, useRef } from 'react'

export function useGameAudio() {
  const htmlAudioRef = useRef(null)
  const audioContextRef = useRef(null)
  const masterGainRef = useRef(null)
  const recordingDestinationRef = useRef(null)
  const synthTimerRef = useRef(null)

  function ensureAudioGraph() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext

    if (!AudioContextClass) {
      return null
    }

    if (!audioContextRef.current) {
      const context = new AudioContextClass()
      const masterGain = context.createGain()
      const recordingDestination = context.createMediaStreamDestination()

      masterGain.connect(context.destination)
      masterGain.connect(recordingDestination)

      audioContextRef.current = context
      masterGainRef.current = masterGain
      recordingDestinationRef.current = recordingDestination
    }

    return {
      context: audioContextRef.current,
      masterGain: masterGainRef.current,
      recordingDestination: recordingDestinationRef.current,
    }
  }

  function stopSynth() {
    if (synthTimerRef.current) {
      window.clearInterval(synthTimerRef.current)
      synthTimerRef.current = null
    }
  }

  function stopAllAudio() {
    stopSynth()

    if (htmlAudioRef.current) {
      htmlAudioRef.current.pause()
      htmlAudioRef.current.src = ''
      htmlAudioRef.current = null
    }
  }

  function startSynthTrack(kind, loop = true) {
    const audioGraph = ensureAudioGraph()

    if (!audioGraph) {
      return
    }

    stopSynth()

    const { context, masterGain } = audioGraph
    const config =
      kind === 'official'
        ? {
            notes: [392, 523.25, 659.25, 783.99, 659.25, 523.25, 880],
            duration: 0.24,
            gap: 0.04,
            waveform: 'triangle',
            volume: 0.11,
          }
        : {
            notes: [261.63, 329.63, 392, 440, 392, 329.63, 293.66],
            duration: 0.52,
            gap: 0.08,
            waveform: 'sine',
            volume: 0.045,
          }

    let noteIndex = 0

    const playNote = () => {
      if (context.state === 'suspended') {
        context.resume()
      }

      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const now = context.currentTime
      const frequency = config.notes[noteIndex % config.notes.length]

      oscillator.type = config.waveform
      oscillator.frequency.setValueAtTime(frequency, now)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(config.volume, now + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + config.duration)

      oscillator.connect(gain)
      gain.connect(masterGain)
      oscillator.start(now)
      oscillator.stop(now + config.duration + 0.03)

      noteIndex += 1
    }

    playNote()

    if (loop) {
      synthTimerRef.current = window.setInterval(
        playNote,
        (config.duration + config.gap) * 1000,
      )
    }
  }

  async function playTrack(src, kind, volume, options = {}) {
    const { loop = true } = options
    stopAllAudio()

    const audioGraph = ensureAudioGraph()
    const audio = new Audio(src)
    audio.loop = loop
    audio.volume = volume
    audio.preload = 'auto'
    audio.crossOrigin = 'anonymous'
    htmlAudioRef.current = audio

    const fallback = () => {
      if (htmlAudioRef.current === audio) {
        htmlAudioRef.current = null
        startSynthTrack(kind, loop)
      }
    }

    audio.addEventListener('error', fallback, { once: true })

    try {
      if (audioGraph) {
        if (audioGraph.context.state === 'suspended') {
          await audioGraph.context.resume()
        }

        const source = audioGraph.context.createMediaElementSource(audio)
        source.connect(audioGraph.masterGain)
      }

      await audio.play()
    } catch {
      fallback()
    }
  }

  function getRecordingAudioStream() {
    const audioGraph = ensureAudioGraph()

    return audioGraph?.recordingDestination?.stream ?? null
  }

  const stopAudioOnUnmount = useEffectEvent(() => {
    stopAllAudio()
  })

  useEffect(() => {
    return () => {
      stopAudioOnUnmount()

      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  return {
    getRecordingAudioStream,
    playTrack,
    stopAllAudio,
  }
}
