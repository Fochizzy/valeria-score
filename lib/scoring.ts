import type { DukeCard, StatKey } from '../data/cards'

export type ScoreInputs = Record<StatKey, number>

const RESOURCE_DIVISION_KEYS: StatKey[] = ['gold', 'fight', 'magic']
const DIVISION_KEYS = new Set<StatKey>(RESOURCE_DIVISION_KEYS)

export const createEmptyInputs = (): ScoreInputs => ({
  gold: 0,
  magic: 0,
  fight: 0,
  vp: 0,
  hammer: 0,
  helmet: 0,
  key: 0,
  holy: 0,
  citizenCount: 0,
  monstersCount: 0,
  monsterPoints: 0,
  bossCount: 0,
  lieutenantCount: 0,
  beastCount: 0,
  minionCount: 0,
  domainCount: 0,
  domainPoints: 0,
})

export function normalizeScoreInputs(
  payload: Partial<Record<StatKey, number>> | null | undefined
): ScoreInputs {
  return {
    gold: Number(payload?.gold ?? 0),
    magic: Number(payload?.magic ?? 0),
    fight: Number(payload?.fight ?? 0),
    vp: Number(payload?.vp ?? 0),
    hammer: Number(payload?.hammer ?? 0),
    helmet: Number(payload?.helmet ?? 0),
    key: Number(payload?.key ?? 0),
    holy: Number(payload?.holy ?? 0),
    citizenCount: Number(payload?.citizenCount ?? 0),
    monstersCount: Number(payload?.monstersCount ?? 0),
    monsterPoints: Number(payload?.monsterPoints ?? 0),
    bossCount: Number(payload?.bossCount ?? 0),
    lieutenantCount: Number(payload?.lieutenantCount ?? 0),
    beastCount: Number(payload?.beastCount ?? 0),
    minionCount: Number(payload?.minionCount ?? 0),
    domainCount: Number(payload?.domainCount ?? 0),
    domainPoints: Number(payload?.domainPoints ?? 0),
  }
}

export const isDivisionRule = (key: StatKey) => DIVISION_KEYS.has(key)

export function getResourceModifier(card: DukeCard) {
  return RESOURCE_DIVISION_KEYS.reduce((modifier, key) => {
    if (modifier > 0) return modifier

    const nextModifier = card.multipliers[key] ?? 0
    return nextModifier > 0 ? nextModifier : modifier
  }, 0)
}

export function calculateCombinedResourceTotal(
  card: DukeCard,
  inputs: ScoreInputs
) {
  const modifier = getResourceModifier(card)
  if (modifier <= 0) return 0

  const resourceInputTotal = RESOURCE_DIVISION_KEYS.reduce((sum, key) => {
    if ((card.multipliers[key] ?? 0) <= 0) return sum
    return sum + Math.max(0, inputs[key] ?? 0)
  }, 0)

  if (resourceInputTotal <= 0) return 0
  return Math.floor(resourceInputTotal / modifier)
}

function calculateResourceLineTotals(card: DukeCard, inputs: ScoreInputs) {
  const totals = new Map<StatKey, number>()
  const modifier = getResourceModifier(card)
  let runningInput = 0

  RESOURCE_DIVISION_KEYS.forEach((key) => {
    if (modifier <= 0 || (card.multipliers[key] ?? 0) <= 0) {
      totals.set(key, 0)
      return
    }

    const previousTotal = Math.floor(runningInput / modifier)
    runningInput += Math.max(0, inputs[key] ?? 0)
    const nextTotal = Math.floor(runningInput / modifier)

    totals.set(key, Math.max(0, nextTotal - previousTotal))
  })

  return totals
}

export function calculateLineTotal(
  key: StatKey,
  multiplier: number,
  input: number
) {
  if (multiplier <= 0 || input <= 0) return 0
  if (isDivisionRule(key)) return Math.floor(input / multiplier)
  return input * multiplier
}

export function calculateLineItems(card: DukeCard, inputs: ScoreInputs) {
  const resourceLineTotals = calculateResourceLineTotals(card, inputs)

  return Object.entries(card.multipliers).map(([key, multiplier]) => {
    const typedKey = key as StatKey
    const input = inputs[typedKey] ?? 0

    return {
      key: typedKey,
      multiplier,
      input,
      total: isDivisionRule(typedKey)
        ? resourceLineTotals.get(typedKey) ?? 0
        : calculateLineTotal(typedKey, multiplier, input),
      isDivision: isDivisionRule(typedKey),
    }
  })
}

export function calculateTotalScore(card: DukeCard, inputs: ScoreInputs) {
  const nonResourceTotal = Object.entries(card.multipliers).reduce(
    (sum, [key, multiplier]) => {
      const typedKey = key as StatKey
      if (isDivisionRule(typedKey)) return sum

      return sum + calculateLineTotal(
        typedKey,
        multiplier,
        inputs[typedKey] ?? 0
      )
    },
    0
  )

  return calculateCombinedResourceTotal(card, inputs) + nonResourceTotal
}

export function getRuleText(key: StatKey, multiplier: number) {
  if (multiplier <= 0) return 'Does not score'
  if (isDivisionRule(key)) return `÷ ${multiplier}`
  return `× ${multiplier}`
}

export function hasAnyInput(inputs: ScoreInputs) {
  return Object.values(inputs).some((value) => value > 0)
}

export function getVisibleKeys(card: DukeCard) {
  return (Object.keys(card.multipliers) as StatKey[]).filter(
    (key) => (card.multipliers[key] ?? 0) > 0
  )
}
