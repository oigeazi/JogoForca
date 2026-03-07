export function normalizeText(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

export function normalizeChar(value) {
  return normalizeText(value).replace(/[^A-Z]/g, '')
}

export function extractLetters(phrase) {
  return [...new Set([...phrase].map((char) => normalizeChar(char)).filter(Boolean))]
}
