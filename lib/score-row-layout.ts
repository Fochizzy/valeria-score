function normalizeLabel(label: string) {
  return label.trim().toLowerCase()
}

export const RESOURCE_FORMULA_DIVIDER = '÷'
export const RESOURCE_FORMULA_ICON_SIZE = 12
export const RESOURCE_FORMULA_LEADING_SLOT_SIZE = 18

export type ScoreRowAccentTone =
  | 'default'
  | 'domain'
  | 'fight'
  | 'gold'
  | 'gray'
  | 'green'
  | 'mana'
  | 'monster'
  | 'victory'

export function getScoreRowAccentTone(label: string): ScoreRowAccentTone {
  const normalized = normalizeLabel(label)

  if (normalized === 'gold') return 'gold'
  if (normalized === 'fight') return 'fight'
  if (normalized === 'mana' || normalized === 'magic') return 'mana'
  if (normalized === 'monster points' || normalized === 'monsters') return 'gray'
  if (normalized === 'domains' || normalized === 'domain points') return 'green'
  if (normalized.includes('victory')) return 'victory'

  if (
    normalized.includes('boss') ||
    normalized.includes('beast') ||
    normalized.includes('minion') ||
    normalized.includes('lieutenant')
  ) {
    return 'monster'
  }

  if (normalized.includes('domain') || normalized.includes('citizen')) {
    return 'domain'
  }

  return 'default'
}

export function getScoreRowLayout(label: string) {
  const normalized = normalizeLabel(label)
  const isCenteredMathRow =
    normalized === 'gold' || normalized === 'mana' || normalized === 'fight'

  return {
    hideLabel: isCenteredMathRow,
    plainRuleText: isCenteredMathRow,
    resourceFormula: isCenteredMathRow,
    compactLabel: false,
    trailingInlineRule: !isCenteredMathRow,
  }
}
