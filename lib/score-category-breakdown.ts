import type { DukeCard, StatKey } from '../data/cards'
import {
  calculateCombinedResourceTotal,
  calculateLineTotal,
  isDivisionRule,
  normalizeScoreInputs,
  type ScoreInputs,
} from './scoring.ts'

export type CategoryKey =
  | 'resources'
  | 'symbols'
  | 'monsterSymbols'
  | 'counts'
  | 'points'
  | 'vp'

export type CategoryBreakdown = {
  resources: number
  symbols: number
  monsterSymbols: number
  counts: number
  points: number
  vp: number
  total: number
}

export const CATEGORY_KEYS: readonly CategoryKey[] = [
  'resources',
  'symbols',
  'monsterSymbols',
  'counts',
  'points',
  'vp',
] as const

export const CATEGORY_LABEL: Record<CategoryKey, string> = {
  resources: 'Resources',
  symbols: 'Symbols',
  monsterSymbols: 'Monster Symbols',
  counts: 'Counts',
  points: 'Points on Cards',
  vp: 'Victory Points',
}

// Stat keys are displayed on the score screen under one of four section pills.
// For analytics we additionally split Victory Points out from Resources so
// they get their own category — that's only a statistics-side decision and
// does not change the score screen layout or the score calculation.
const STAT_KEY_TO_CATEGORY: Record<StatKey, CategoryKey> = {
  gold: 'resources',
  magic: 'resources',
  fight: 'resources',
  vp: 'vp',
  hammer: 'symbols',
  helmet: 'symbols',
  key: 'symbols',
  holy: 'symbols',
  bossCount: 'monsterSymbols',
  lieutenantCount: 'monsterSymbols',
  beastCount: 'monsterSymbols',
  minionCount: 'monsterSymbols',
  citizenCount: 'counts',
  monstersCount: 'counts',
  domainCount: 'counts',
  monsterPoints: 'points',
  domainPoints: 'points',
}

export function getCategoryForStatKey(key: StatKey): CategoryKey {
  return STAT_KEY_TO_CATEGORY[key]
}

export function createEmptyCategoryBreakdown(): CategoryBreakdown {
  return {
    resources: 0,
    symbols: 0,
    monsterSymbols: 0,
    counts: 0,
    points: 0,
    vp: 0,
    total: 0,
  }
}

export function computeGameCategoryBreakdown(
  card: DukeCard,
  inputs: ScoreInputs
): CategoryBreakdown {
  const breakdown = createEmptyCategoryBreakdown()

  const combinedResourceTotal = calculateCombinedResourceTotal(card, inputs)
  if (combinedResourceTotal > 0) {
    breakdown.resources += combinedResourceTotal
    breakdown.total += combinedResourceTotal
  }

  for (const [rawKey, multiplier] of Object.entries(card.multipliers)) {
    const key = rawKey as StatKey
    if (isDivisionRule(key)) continue

    const input = inputs[key] ?? 0
    const lineTotal = calculateLineTotal(key, multiplier, input)
    if (lineTotal === 0) continue

    const category = STAT_KEY_TO_CATEGORY[key]
    breakdown[category] += lineTotal
    breakdown.total += lineTotal
  }

  return breakdown
}

export type GameCategorySource = {
  duke_slug: string
  inputs: Partial<Record<StatKey, number>> | null | undefined
  is_winner?: boolean
}

export function aggregateBreakdownsForGames(
  games: GameCategorySource[],
  cardsLookup: Record<string, DukeCard>
): CategoryBreakdown {
  const total = createEmptyCategoryBreakdown()

  for (const game of games) {
    const card = cardsLookup[game.duke_slug]
    if (!card) continue

    const inputs = normalizeScoreInputs(game.inputs ?? {})
    const breakdown = computeGameCategoryBreakdown(card, inputs)

    total.resources += breakdown.resources
    total.symbols += breakdown.symbols
    total.monsterSymbols += breakdown.monsterSymbols
    total.counts += breakdown.counts
    total.points += breakdown.points
    total.vp += breakdown.vp
    total.total += breakdown.total
  }

  return total
}

export function computeCategoryShare(
  breakdown: CategoryBreakdown,
  key: CategoryKey
): number {
  if (breakdown.total <= 0) return 0
  return (breakdown[key] / breakdown.total) * 100
}

export type PlayerCategoryStats = {
  allGames: CategoryBreakdown
  winsOnly: CategoryBreakdown
  totalGames: number
  totalWins: number
}

export function buildPlayerCategoryStats(
  games: GameCategorySource[],
  cardsLookup: Record<string, DukeCard>
): PlayerCategoryStats {
  const wonGames = games.filter((game) => Boolean(game.is_winner))

  return {
    allGames: aggregateBreakdownsForGames(games, cardsLookup),
    winsOnly: aggregateBreakdownsForGames(wonGames, cardsLookup),
    totalGames: games.length,
    totalWins: wonGames.length,
  }
}

export function buildCardsLookup(cards: DukeCard[]): Record<string, DukeCard> {
  return cards.reduce<Record<string, DukeCard>>((acc, card) => {
    acc[card.slug] = card
    return acc
  }, {})
}
