import type { DukeCard, StatKey } from '../data/cards'

export type ScoreInputs = Record<StatKey, number>

const DIVISION_KEYS = new Set<StatKey>(['gold', 'magic', 'fight'])

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
  return Object.entries(card.multipliers).map(([key, multiplier]) => {
    const typedKey = key as StatKey
    const input = inputs[typedKey] ?? 0

    return {
      key: typedKey,
      multiplier,
      input,
      total: calculateLineTotal(typedKey, multiplier, input),
      isDivision: isDivisionRule(typedKey),
    }
  })
}

export function calculateTotalScore(card: DukeCard, inputs: ScoreInputs) {
  return calculateLineItems(card, inputs).reduce((sum, item) => sum + item.total, 0)
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