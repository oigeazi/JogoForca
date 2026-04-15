export function pickRandomItem(items) {
  return items[Math.floor(Math.random() * items.length)]
}

export function createConfettiPieces() {
  const colors = ['#f0abfc', '#c084fc', '#8b5cf6', '#f9a8d4', '#fef08a', '#ffffff']

  return Array.from({ length: 48 }, (_, index) => ({
    id: `confetti-${index}-${Date.now()}`,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.8}s`,
    duration: `${2.3 + Math.random() * 1.8}s`,
    rotate: `${-180 + Math.random() * 360}deg`,
    color: colors[index % colors.length],
  }))
}

export function getProgress(screen, finalStep) {
  if (screen === 'intro') {
    return 0
  }

  if (screen === 'stage1') {
    return 20
  }

  if (screen === 'stage2-guess') {
    return 40
  }

  if (screen === 'stage2-choice') {
    return 60
  }

  if (screen === 'stage3') {
    return finalStep === 'official' ? 100 : 80
  }

  return 100
}

export function getPhaseLabel(screen, finalStep) {
  if (screen === 'stage1') {
    return 'Fase 1 de 5'
  }

  if (screen === 'stage2-guess') {
    return 'Fase 2 de 5'
  }

  if (screen === 'stage2-choice') {
    return 'Fase 3 de 5'
  }

  if (screen === 'stage3' && finalStep !== 'official') {
    return 'Fase 4 de 5'
  }

  return 'PARABÉNS! AGORA SOMOS NAMORADOS'
}

export function getStageTitle(screen) {
  if (screen === 'stage1') {
    return 'Acerte a frase'
  }

  if (screen === 'stage2-guess') {
    return 'Continue'
  }

  if (screen === 'stage2-choice') {
    return 'Sua resposta'
  }

  return 'Ultima etapa'
}
