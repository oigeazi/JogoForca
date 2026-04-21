import { normalizeChar } from '../utils/text'

function PhraseBoard({
  phrase,
  guessedLetters,
  revealedIndexes = [],
  animatedIndexes = [],
  revealAll = false,
  hideQuestionMark = false,
  large = false,
  clean = false,
  celebrating = false,
}) {
  const revealedIndexSet = new Set(revealedIndexes)
  const animatedIndexSet = new Set(animatedIndexes)

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
        const visible =
          revealedIndexSet.has(index) && normalized
            ? char
            : revealCharacter(char)

        return (
          <span
            key={`${char}-${index}`}
            className={`phrase-slot ${
              normalized || clean
                ? clean
                  ? 'phrase-slot--clean'
                  : 'phrase-slot--letter'
                : 'phrase-slot--fixed'
            } ${animatedIndexSet.has(index) ? 'phrase-slot--revealed' : ''} ${
              celebrating ? 'phrase-slot--celebrating' : ''
            }`}
          >
            {visible}
          </span>
        )
      })}
    </div>
  )
}

export default PhraseBoard
