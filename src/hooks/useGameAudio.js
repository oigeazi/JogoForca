import { useEffect, useEffectEvent, useRef } from 'react'

export function useGameAudio() {
  const htmlAudioRef = useRef(null)
  const audioContextRef = useRef(null)
  const synthTimerRef = useRef(null)

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
    const AudioContextClass = window.AudioContext || window.webkitAudioContext

    if (!AudioContextClass) {
      return
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass()
    }

    stopSynth()

    const context = audioContextRef.current
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
      gain.connect(context.destination)
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

    const audio = new Audio(src)
    audio.loop = loop
    audio.volume = volume
    audio.preload = 'auto'
    htmlAudioRef.current = audio

    const fallback = () => {
      if (htmlAudioRef.current === audio) {
        htmlAudioRef.current = null
        startSynthTrack(kind, loop)
      }
    }

    audio.addEventListener('error', fallback, { once: true })

    try {
      await audio.play()
    } catch {
      fallback()
    }
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
    playTrack,
    stopAllAudio,
  }
}
