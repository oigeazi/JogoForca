import { normalizeChar } from '../utils/text'

function PhraseBoard({ phrase, guessedLetters, revealAll = false, hideQuestionMark = false, large = false }) {
  function revealCharacter(char) {
    if (char === '?' && hideQuestionMark && !revealAll) {
      return ''
    }

    const normalized = normalizeChar(char)

    if (!normalized) {
      return char === ' ' ? '\u00A0' : char
    }

    return guessedLetters.includes(normalized) || revealAll ? char : ''
  }

  return (
    <div className={`phrase-board ${large ? 'phrase-board--large' : ''}`}>
      {[...phrase].map((char, index) => {
        const normalized = normalizeChar(char)
        const visible = revealCharacter(char)

        return (
          <span
            key={`${char}-${index}`}
            className={`phrase-slot ${normalized ? 'phrase-slot--letter' : 'phrase-slot--fixed'}`}
          >
            {visible}
          </span>
        )
      })}
    </div>
  )
}

export default PhraseBoard
