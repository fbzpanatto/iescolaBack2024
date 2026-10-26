import { QUESTION_OPTION_LABELS } from "./enums";

export const MAX_CORRECT_LABELS = 2

export function normalizeCorrectLabels(value: unknown): string | null {
  const raw = String(value ?? '').trim().toUpperCase()
  if (raw.length < 1 || raw.length > MAX_CORRECT_LABELS) { return null }

  const chars = [...raw]
  const labels: readonly string[] = QUESTION_OPTION_LABELS
  if (!chars.every(char => labels.includes(char))) { return null }
  if (new Set(chars).size !== chars.length) { return null }

  return chars.sort().join('')
}

export function displayLabelsFor(canonical: string, optionsOrder: string | null): string {
  if (optionsOrder === null) { return canonical }
  return [...canonical].map(char => String.fromCharCode(65 + optionsOrder.indexOf(char))).sort().join('')
}

export function canonicalLabelsFor(display: string, optionsOrder: string | null): string {
  if (optionsOrder === null) { return display }
  return [...display].map(char => optionsOrder.charAt(char.charCodeAt(0) - 65)).sort().join('')
}
