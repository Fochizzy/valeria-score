import { cards } from '../data/cards.ts'
import {
  buildCardsLookup,
  buildPlayerCategoryStats,
  CATEGORY_KEYS,
  CATEGORY_LABEL,
  computeGameCategoryBreakdown,
  createEmptyCategoryBreakdown,
  type CategoryBreakdown,
  type CategoryKey,
  type PlayerCategoryStats,
} from './score-category-breakdown.ts'
import { normalizeScoreInputs, type ScoreInputs } from './scoring.ts'
import {
  sanitizeSoloInputsForRole,
  type SoloResolution,
  type SoloVictoryCondition,
  type SoloWinner,
} from './solo-mode.ts'

type RawSoloRow = {
  id?: string | null
  owner_user_id?: string | null
  player_duke_slug: string | null
  dark_lord_duke_slug: string | null
  victory_condition: SoloVictoryCondition
  winner: SoloWinner
  resolution: SoloResolution
  player_total: number | null
  dark_lord_total: number | null
  player_inputs: unknown
  dark_lord_inputs: unknown
  created_at?: string | null
  updated_at?: string | null
}

export type SoloGameResultRow = {
  id: string | null
  ownerUserId: string | null
  playerDukeSlug: string
  darkLordDukeSlug: string
  victoryCondition: SoloVictoryCondition
  winner: SoloWinner
  resolution: SoloResolution
  playerTotal: number
  darkLordTotal: number
  playerInputs: ScoreInputs
  darkLordInputs: ScoreInputs
  createdAt: string | null
  updatedAt: string | null
}

export type SoloStatsSummary = {
  totalGames: number
  wins: number
  losses: number
  winRate: number
  lossRate: number
  avgPlayerTotal: number
  avgDarkLordTotal: number
  avgMargin: number
  autoWins: number
  autoLosses: number
  contestedWins: number
  contestedLosses: number
  conditionCounts: Record<SoloVictoryCondition, number>
}

export type SoloDukeUsageRow = {
  dukeSlug: string
  games: number
  wins: number
  losses: number
  winRate: number
  avgPlayerTotal: number
}

export type SoloConditionSummaryRow = {
  victoryCondition: SoloVictoryCondition
  totalGames: number
  wins: number
  losses: number
  winRate: number
}

export type SoloStrategyDukeRow = SoloDukeUsageRow & {
  avgMargin: number
  avgDarkLordTotal: number
}

export type SoloConditionPerformanceRow = SoloConditionSummaryRow & {
  avgMargin: number
}

export type SoloContestedConversion = {
  wins: number
  total: number
  winRate: number
}

export type SoloLossTypeSplit = {
  autoLosses: number
  contestedLosses: number
}

export type SoloMatchupResolutionSplit = {
  contested: number
  playerAuto: number
  darkLordAuto: number
}

export type SoloMatchupRow = {
  playerDukeSlug: string
  darkLordDukeSlug: string
  games: number
  wins: number
  losses: number
  winRate: number
  avgMargin: number
  avgPlayerTotal: number
  avgDarkLordTotal: number
  conditionRows: SoloConditionSummaryRow[]
  resolutionSplit: SoloMatchupResolutionSplit
}

export type SoloStrategySections = {
  winPatterns: {
    strongestDuke: SoloStrategyDukeRow | null
    bestVictoryCondition: SoloConditionPerformanceRow | null
    contestedConversion: SoloContestedConversion
    winningCategories: string[]
  }
  riskPatterns: {
    hardestVictoryCondition: SoloConditionPerformanceRow | null
    toughestDarkLord: SoloStrategyDukeRow | null
    lossTypeSplit: SoloLossTypeSplit
    lossTrapCategory: string | null
  }
  matchups: {
    best: SoloMatchupRow[]
    worst: SoloMatchupRow[]
    mostPlayed: SoloMatchupRow | null
  }
}

export type SoloStatsMeta = {
  dukelessAutomaticResults: number
}

export type SoloStatsBundle = {
  rows: SoloGameResultRow[]
  meta: SoloStatsMeta
  summary: SoloStatsSummary
  playerDukeRows: SoloDukeUsageRow[]
  darkLordRows: SoloDukeUsageRow[]
  categoryStats: PlayerCategoryStats
  conditionRows: SoloConditionSummaryRow[]
  strategy: SoloStrategySections
}

const cardsLookup = buildCardsLookup(cards)

const EMPTY_CONDITION_COUNTS: Record<SoloVictoryCondition, number> = {
  slay_all_monsters: 0,
  monster_attacks_empty_column: 0,
  five_stacks_exhausted: 0,
}

function normalizeText(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : ''
}

function toNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function roundRate(part: number, total: number) {
  if (total <= 0) return 0
  return Number(((part / total) * 100).toFixed(1))
}

function averageRounded(total: number, count: number) {
  if (count <= 0) return 0
  return Math.round(total / count)
}

function averageExact(total: number, count: number) {
  if (count <= 0) return 0
  return total / count
}

function qualifiesForStrategyRanking(games: number) {
  return games >= 3
}

function rankByWinRate<T extends { winRate: number; avgMargin: number; games: number }>(
  rows: T[],
  direction: 'best' | 'worst'
) {
  const multiplier = direction === 'best' ? -1 : 1
  return [...rows].sort((a, b) => {
    if (a.winRate !== b.winRate) return (a.winRate - b.winRate) * multiplier
    if (a.avgMargin !== b.avgMargin) return (a.avgMargin - b.avgMargin) * multiplier
    if (a.games !== b.games) return b.games - a.games
    return 0
  })
}

function rankConditionRows(
  rows: SoloConditionPerformanceRow[],
  direction: 'best' | 'worst'
) {
  return [...rows].sort((a, b) => {
    if (a.winRate !== b.winRate) {
      return direction === 'best' ? b.winRate - a.winRate : a.winRate - b.winRate
    }
    if (a.avgMargin !== b.avgMargin) {
      return direction === 'best' ? b.avgMargin - a.avgMargin : a.avgMargin - b.avgMargin
    }
    if (a.totalGames !== b.totalGames) return b.totalGames - a.totalGames
    return a.victoryCondition.localeCompare(b.victoryCondition)
  })
}

function rankMatchups(rows: SoloMatchupRow[], direction: 'best' | 'worst') {
  return [...rows].sort((a, b) => {
    if (a.winRate !== b.winRate) {
      return direction === 'best' ? b.winRate - a.winRate : a.winRate - b.winRate
    }
    if (a.avgMargin !== b.avgMargin) {
      return direction === 'best' ? b.avgMargin - a.avgMargin : a.avgMargin - b.avgMargin
    }
    if (a.games !== b.games) return b.games - a.games
    const aLabel = `${a.playerDukeSlug}:${a.darkLordDukeSlug}`
    const bLabel = `${b.playerDukeSlug}:${b.darkLordDukeSlug}`
    return aLabel.localeCompare(bLabel)
  })
}

function getPlayerBreakdownForRow(
  row: SoloGameResultRow,
  lookup: Record<string, (typeof cards)[number]> = cardsLookup
) {
  const card = lookup[row.playerDukeSlug]
  if (!card) return null
  return computeGameCategoryBreakdown(card, row.playerInputs)
}

function averageBreakdownForRows(
  rows: SoloGameResultRow[],
  lookup: Record<string, (typeof cards)[number]> = cardsLookup
) {
  const total = createEmptyCategoryBreakdown()
  let count = 0

  for (const row of rows) {
    const breakdown = getPlayerBreakdownForRow(row, lookup)
    if (!breakdown) continue
    count += 1
    total.resources += breakdown.resources
    total.symbols += breakdown.symbols
    total.monsterSymbols += breakdown.monsterSymbols
    total.counts += breakdown.counts
    total.points += breakdown.points
    total.vp += breakdown.vp
    total.total += breakdown.total
  }

  if (count === 0) return { breakdown: createEmptyCategoryBreakdown(), count: 0 }

  const average: CategoryBreakdown = {
    resources: averageExact(total.resources, count),
    symbols: averageExact(total.symbols, count),
    monsterSymbols: averageExact(total.monsterSymbols, count),
    counts: averageExact(total.counts, count),
    points: averageExact(total.points, count),
    vp: averageExact(total.vp, count),
    total: averageExact(total.total, count),
  }

  return { breakdown: average, count }
}

function topCategoryLabels(
  breakdown: CategoryBreakdown,
  limit: number
) {
  return [...CATEGORY_KEYS]
    .map((key) => ({ key, value: breakdown[key] }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value
      return a.key.localeCompare(b.key)
    })
    .slice(0, limit)
    .map((entry) => CATEGORY_LABEL[entry.key])
}

function buildSoloPlayerDukePerformanceRows(rows: SoloGameResultRow[]) {
  const aggregate = new Map<
    string,
    {
      games: number
      wins: number
      losses: number
      totalPlayerTotal: number
      totalDarkLordTotal: number
      totalMargin: number
    }
  >()

  for (const row of rows) {
    if (!row.playerDukeSlug) continue
    const bucket = aggregate.get(row.playerDukeSlug) ?? {
      games: 0,
      wins: 0,
      losses: 0,
      totalPlayerTotal: 0,
      totalDarkLordTotal: 0,
      totalMargin: 0,
    }
    bucket.games += 1
    bucket.totalPlayerTotal += row.playerTotal
    bucket.totalDarkLordTotal += row.darkLordTotal
    bucket.totalMargin += row.playerTotal - row.darkLordTotal
    if (row.winner === 'player') bucket.wins += 1
    else bucket.losses += 1
    aggregate.set(row.playerDukeSlug, bucket)
  }

  return [...aggregate.entries()].map(([dukeSlug, bucket]) => ({
    dukeSlug,
    games: bucket.games,
    wins: bucket.wins,
    losses: bucket.losses,
    winRate: roundRate(bucket.wins, bucket.games),
    avgPlayerTotal: averageRounded(bucket.totalPlayerTotal, bucket.games),
    avgDarkLordTotal: averageRounded(bucket.totalDarkLordTotal, bucket.games),
    avgMargin: averageRounded(bucket.totalMargin, bucket.games),
  }))
}

function buildSoloDarkLordThreatRows(rows: SoloGameResultRow[]) {
  const aggregate = new Map<
    string,
    {
      games: number
      wins: number
      losses: number
      totalPlayerTotal: number
      totalDarkLordTotal: number
      totalMargin: number
    }
  >()

  for (const row of rows) {
    if (!row.darkLordDukeSlug) continue
    const bucket = aggregate.get(row.darkLordDukeSlug) ?? {
      games: 0,
      wins: 0,
      losses: 0,
      totalPlayerTotal: 0,
      totalDarkLordTotal: 0,
      totalMargin: 0,
    }
    bucket.games += 1
    bucket.totalPlayerTotal += row.playerTotal
    bucket.totalDarkLordTotal += row.darkLordTotal
    bucket.totalMargin += row.playerTotal - row.darkLordTotal
    if (row.winner === 'player') bucket.wins += 1
    else bucket.losses += 1
    aggregate.set(row.darkLordDukeSlug, bucket)
  }

  return [...aggregate.entries()].map(([dukeSlug, bucket]) => ({
    dukeSlug,
    games: bucket.games,
    wins: bucket.wins,
    losses: bucket.losses,
    winRate: roundRate(bucket.wins, bucket.games),
    avgPlayerTotal: averageRounded(bucket.totalPlayerTotal, bucket.games),
    avgDarkLordTotal: averageRounded(bucket.totalDarkLordTotal, bucket.games),
    avgMargin: averageRounded(bucket.totalMargin, bucket.games),
  }))
}

function buildSoloConditionPerformanceRows(rows: SoloGameResultRow[]) {
  return Object.keys(EMPTY_CONDITION_COUNTS).map((condition) => {
    const typedCondition = condition as SoloVictoryCondition
    const scoped = rows.filter((row) => row.victoryCondition === typedCondition)
    const wins = scoped.filter((row) => row.winner === 'player').length
    const losses = scoped.length - wins

    return {
      victoryCondition: typedCondition,
      totalGames: scoped.length,
      wins,
      losses,
      winRate: roundRate(wins, scoped.length),
      avgMargin: averageRounded(
        scoped.reduce((sum, row) => sum + (row.playerTotal - row.darkLordTotal), 0),
        scoped.length
      ),
    }
  })
}

function buildRankedConditionRows(rows: SoloGameResultRow[]) {
  return buildSoloConditionRows(rows)
    .filter((row) => row.totalGames > 0)
    .sort((a, b) => {
      if (b.totalGames !== a.totalGames) return b.totalGames - a.totalGames
      if (b.wins !== a.wins) return b.wins - a.wins
      return a.victoryCondition.localeCompare(b.victoryCondition)
    })
}

export function normalizeSoloResultRows(rows: RawSoloRow[]): SoloGameResultRow[] {
  return rows
    .map((row) => {
      const normalizedRow = row as unknown as SoloGameResultRow
      if (
        typeof normalizedRow === 'object' &&
        normalizedRow !== null &&
        'victoryCondition' in normalizedRow &&
        'playerDukeSlug' in normalizedRow
      ) {
        return {
          id: normalizedRow.id ? String(normalizedRow.id) : null,
          ownerUserId: normalizedRow.ownerUserId ? String(normalizedRow.ownerUserId) : null,
          playerDukeSlug: normalizeText(normalizedRow.playerDukeSlug),
          darkLordDukeSlug: normalizeText(normalizedRow.darkLordDukeSlug),
          victoryCondition: normalizedRow.victoryCondition,
          winner: normalizedRow.winner,
          resolution: normalizedRow.resolution,
          playerTotal: toNumber(normalizedRow.playerTotal),
          darkLordTotal: toNumber(normalizedRow.darkLordTotal),
          playerInputs: normalizeScoreInputs(normalizedRow.playerInputs),
          darkLordInputs: normalizeScoreInputs(normalizedRow.darkLordInputs),
          createdAt: normalizedRow.createdAt ? String(normalizedRow.createdAt) : null,
          updatedAt: normalizedRow.updatedAt ? String(normalizedRow.updatedAt) : null,
        }
      }

      return {
        id: row.id ? String(row.id) : null,
        ownerUserId: row.owner_user_id ? String(row.owner_user_id) : null,
        playerDukeSlug: normalizeText(row.player_duke_slug),
        darkLordDukeSlug: normalizeText(row.dark_lord_duke_slug),
        victoryCondition: row.victory_condition,
        winner: row.winner,
        resolution: row.resolution,
        playerTotal: toNumber(row.player_total),
        darkLordTotal: toNumber(row.dark_lord_total),
        playerInputs: normalizeScoreInputs(
          row.player_inputs as Partial<Record<string, number>> | null | undefined
        ),
        darkLordInputs: normalizeScoreInputs(
          row.dark_lord_inputs as Partial<Record<string, number>> | null | undefined
        ),
        createdAt: row.created_at ? String(row.created_at) : null,
        updatedAt: row.updated_at ? String(row.updated_at) : null,
      }
    })
}

export function buildSoloStatsSummary(rows: RawSoloRow[] | SoloGameResultRow[]): SoloStatsSummary {
  const normalized = normalizeSoloResultRows(rows as RawSoloRow[])
  const totalGames = normalized.length
  const wins = normalized.filter((row) => row.winner === 'player').length
  const losses = totalGames - wins
  const autoWins = normalized.filter((row) => row.resolution === 'player_auto').length
  const autoLosses = normalized.filter((row) => row.resolution === 'dark_lord_auto').length
  const contestedWins = normalized.filter(
    (row) => row.resolution === 'contested' && row.winner === 'player'
  ).length
  const contestedLosses = normalized.filter(
    (row) => row.resolution === 'contested' && row.winner === 'dark_lord'
  ).length

  const conditionCounts = normalized.reduce<Record<SoloVictoryCondition, number>>(
    (acc, row) => {
      acc[row.victoryCondition] += 1
      return acc
    },
    { ...EMPTY_CONDITION_COUNTS }
  )

  return {
    totalGames,
    wins,
    losses,
    winRate: roundRate(wins, totalGames),
    lossRate: roundRate(losses, totalGames),
    avgPlayerTotal: averageRounded(
      normalized.reduce((sum, row) => sum + row.playerTotal, 0),
      totalGames
    ),
    avgDarkLordTotal: averageRounded(
      normalized.reduce((sum, row) => sum + row.darkLordTotal, 0),
      totalGames
    ),
    avgMargin: averageRounded(
      normalized.reduce((sum, row) => sum + (row.playerTotal - row.darkLordTotal), 0),
      totalGames
    ),
    autoWins,
    autoLosses,
    contestedWins,
    contestedLosses,
    conditionCounts,
  }
}

function buildSoloUsageRows(
  rows: RawSoloRow[] | SoloGameResultRow[],
  side: 'player' | 'dark_lord'
): SoloDukeUsageRow[] {
  const normalized = normalizeSoloResultRows(rows as RawSoloRow[])
  const aggregate = new Map<
    string,
    { games: number; wins: number; losses: number; totalScore: number }
  >()

  for (const row of normalized) {
    const dukeSlug = side === 'player' ? row.playerDukeSlug : row.darkLordDukeSlug
    if (!dukeSlug) continue
    const totalScore = side === 'player' ? row.playerTotal : row.darkLordTotal
    const didWin =
      side === 'player' ? row.winner === 'player' : row.winner === 'dark_lord'
    const bucket = aggregate.get(dukeSlug) ?? {
      games: 0,
      wins: 0,
      losses: 0,
      totalScore: 0,
    }
    bucket.games += 1
    bucket.totalScore += totalScore
    if (didWin) bucket.wins += 1
    else bucket.losses += 1
    aggregate.set(dukeSlug, bucket)
  }

  return [...aggregate.entries()]
    .map(([dukeSlug, bucket]) => ({
      dukeSlug,
      games: bucket.games,
      wins: bucket.wins,
      losses: bucket.losses,
      winRate: roundRate(bucket.wins, bucket.games),
      avgPlayerTotal: averageRounded(bucket.totalScore, bucket.games),
    }))
    .sort((a, b) => {
      if (b.games !== a.games) return b.games - a.games
      if (b.wins !== a.wins) return b.wins - a.wins
      return a.dukeSlug.localeCompare(b.dukeSlug)
    })
}

export function buildSoloDukeUsageRows(rows: RawSoloRow[] | SoloGameResultRow[]) {
  return buildSoloUsageRows(rows, 'player')
}

export function buildSoloDarkLordUsageRows(rows: RawSoloRow[] | SoloGameResultRow[]) {
  return buildSoloUsageRows(rows, 'dark_lord')
}

export function buildSoloCategoryStats(
  rows: RawSoloRow[] | SoloGameResultRow[],
  lookup: Record<string, (typeof cards)[number]> = cardsLookup
) {
  const normalized = normalizeSoloResultRows(rows as RawSoloRow[]).filter(
    (row) => row.playerDukeSlug.length > 0
  )
  return buildPlayerCategoryStats(
    normalized.map((row) => ({
      duke_slug: row.playerDukeSlug,
      inputs: row.playerInputs,
      is_winner: row.winner === 'player',
    })),
    lookup
  )
}

export function buildSoloStatsMeta(rows: RawSoloRow[] | SoloGameResultRow[]): SoloStatsMeta {
  const normalized = normalizeSoloResultRows(rows as RawSoloRow[])

  return {
    dukelessAutomaticResults: normalized.filter(
      (row) =>
        row.resolution !== 'contested' &&
        (row.playerDukeSlug.length === 0 || row.darkLordDukeSlug.length === 0)
    ).length,
  }
}

export function buildSoloConditionRows(rows: RawSoloRow[] | SoloGameResultRow[]) {
  const normalized = normalizeSoloResultRows(rows as RawSoloRow[])

  return Object.keys(EMPTY_CONDITION_COUNTS).map((condition) => {
    const typedCondition = condition as SoloVictoryCondition
    const scoped = normalized.filter((row) => row.victoryCondition === typedCondition)
    const wins = scoped.filter((row) => row.winner === 'player').length
    const totalGames = scoped.length
    const losses = totalGames - wins

    return {
      victoryCondition: typedCondition,
      totalGames,
      wins,
      losses,
      winRate: roundRate(wins, totalGames),
    }
  })
}

export function buildSoloMatchupRows(rows: RawSoloRow[] | SoloGameResultRow[]) {
  const normalized = normalizeSoloResultRows(rows as RawSoloRow[]).filter(
    (row) => row.playerDukeSlug.length > 0 && row.darkLordDukeSlug.length > 0
  )
  const aggregate = new Map<
    string,
    {
      playerDukeSlug: string
      darkLordDukeSlug: string
      games: number
      wins: number
      losses: number
      totalMargin: number
      totalPlayerTotal: number
      totalDarkLordTotal: number
      contested: number
      playerAuto: number
      darkLordAuto: number
      rows: SoloGameResultRow[]
    }
  >()

  for (const row of normalized) {
    const key = `${row.playerDukeSlug}__${row.darkLordDukeSlug}`
    const bucket = aggregate.get(key) ?? {
      playerDukeSlug: row.playerDukeSlug,
      darkLordDukeSlug: row.darkLordDukeSlug,
      games: 0,
      wins: 0,
      losses: 0,
      totalMargin: 0,
      totalPlayerTotal: 0,
      totalDarkLordTotal: 0,
      contested: 0,
      playerAuto: 0,
      darkLordAuto: 0,
      rows: [],
    }
    bucket.games += 1
    bucket.totalMargin += row.playerTotal - row.darkLordTotal
    bucket.totalPlayerTotal += row.playerTotal
    bucket.totalDarkLordTotal += row.darkLordTotal
    bucket.rows.push(row)
    if (row.winner === 'player') bucket.wins += 1
    else bucket.losses += 1
    if (row.resolution === 'contested') bucket.contested += 1
    if (row.resolution === 'player_auto') bucket.playerAuto += 1
    if (row.resolution === 'dark_lord_auto') bucket.darkLordAuto += 1
    aggregate.set(key, bucket)
  }

  return [...aggregate.values()].map((bucket) => ({
    playerDukeSlug: bucket.playerDukeSlug,
    darkLordDukeSlug: bucket.darkLordDukeSlug,
    games: bucket.games,
    wins: bucket.wins,
    losses: bucket.losses,
    winRate: roundRate(bucket.wins, bucket.games),
    avgMargin: averageRounded(bucket.totalMargin, bucket.games),
    avgPlayerTotal: averageRounded(bucket.totalPlayerTotal, bucket.games),
    avgDarkLordTotal: averageRounded(bucket.totalDarkLordTotal, bucket.games),
    conditionRows: buildRankedConditionRows(bucket.rows),
    resolutionSplit: {
      contested: bucket.contested,
      playerAuto: bucket.playerAuto,
      darkLordAuto: bucket.darkLordAuto,
    },
  }))
}

export function buildSoloStrategySections(
  rows: RawSoloRow[] | SoloGameResultRow[]
): SoloStrategySections {
  const normalized = normalizeSoloResultRows(rows as RawSoloRow[])
  const conditionPerformanceRows = buildSoloConditionPerformanceRows(normalized)
  const playerDukeRows = buildSoloPlayerDukePerformanceRows(normalized).filter((row) =>
    qualifiesForStrategyRanking(row.games)
  )
  const darkLordThreatRows = buildSoloDarkLordThreatRows(normalized).filter((row) =>
    qualifiesForStrategyRanking(row.games)
  )
  const contestedRows = normalized.filter((row) => row.resolution === 'contested')
  const contestedWins = contestedRows.filter((row) => row.winner === 'player').length
  const winningRows = normalized.filter(
    (row) => row.winner === 'player' && row.playerDukeSlug.length > 0
  )
  const losingRows = normalized.filter(
    (row) => row.winner === 'dark_lord' && row.playerDukeSlug.length > 0
  )
  const { breakdown: winAverageBreakdown, count: winningBreakdownCount } =
    averageBreakdownForRows(winningRows)
  const { breakdown: lossAverageBreakdown, count: losingBreakdownCount } =
    averageBreakdownForRows(losingRows)
  const lossTrapEntry = [...CATEGORY_KEYS]
    .map((key) => ({
      key,
      delta: winAverageBreakdown[key] - lossAverageBreakdown[key],
    }))
    .sort((a, b) => {
      if (b.delta !== a.delta) return b.delta - a.delta
      return a.key.localeCompare(b.key)
    })[0]
  const matchupRows = buildSoloMatchupRows(normalized)
  const qualifiedMatchups = matchupRows.filter((row) => qualifiesForStrategyRanking(row.games))

  return {
    winPatterns: {
      strongestDuke: rankByWinRate(playerDukeRows, 'best')[0] ?? null,
      bestVictoryCondition: rankConditionRows(
        conditionPerformanceRows.filter((row) => row.totalGames > 0),
        'best'
      )[0] ?? null,
      contestedConversion: {
        wins: contestedWins,
        total: contestedRows.length,
        winRate: roundRate(contestedWins, contestedRows.length),
      },
      winningCategories:
        winningBreakdownCount > 0 ? topCategoryLabels(winAverageBreakdown, 2) : [],
    },
    riskPatterns: {
      hardestVictoryCondition: rankConditionRows(
        conditionPerformanceRows.filter((row) => row.totalGames > 0),
        'worst'
      )[0] ?? null,
      toughestDarkLord: rankByWinRate(darkLordThreatRows, 'worst')[0] ?? null,
      lossTypeSplit: {
        autoLosses: normalized.filter((row) => row.resolution === 'dark_lord_auto').length,
        contestedLosses: normalized.filter(
          (row) => row.resolution === 'contested' && row.winner === 'dark_lord'
        ).length,
      },
      lossTrapCategory:
        losingBreakdownCount > 0 && winningBreakdownCount > 0 && lossTrapEntry && lossTrapEntry.delta > 0
          ? CATEGORY_LABEL[lossTrapEntry.key as CategoryKey]
          : null,
    },
    matchups: {
      best: rankMatchups(qualifiedMatchups, 'best').slice(0, 3),
      worst: rankMatchups(qualifiedMatchups, 'worst').slice(0, 3),
      mostPlayed:
        [...matchupRows].sort((a, b) => {
          if (b.games !== a.games) return b.games - a.games
          if (b.winRate !== a.winRate) return b.winRate - a.winRate
          const aLabel = `${a.playerDukeSlug}:${a.darkLordDukeSlug}`
          const bLabel = `${b.playerDukeSlug}:${b.darkLordDukeSlug}`
          return aLabel.localeCompare(bLabel)
        })[0] ?? null,
    },
  }
}

async function getAuthedUserId() {
  const { supabase } = await import('./supabase.ts')
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('User not authenticated')
  }

  return user.id
}

export async function loadSoloResults(ownerUserId?: string | null) {
  const { supabase } = await import('./supabase.ts')
  const safeOwnerUserId = ownerUserId ?? (await getAuthedUserId())

  const { data, error } = await supabase
    .from('solo_game_results')
    .select(
      'id, owner_user_id, player_duke_slug, dark_lord_duke_slug, victory_condition, winner, resolution, player_total, dark_lord_total, player_inputs, dark_lord_inputs, created_at, updated_at'
    )
    .eq('owner_user_id', safeOwnerUserId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return normalizeSoloResultRows((data ?? []) as RawSoloRow[])
}

export async function loadSoloResultById(
  soloGameId: string,
  ownerUserId?: string | null
) {
  const { supabase } = await import('./supabase.ts')
  const safeOwnerUserId = ownerUserId ?? (await getAuthedUserId())

  const { data, error } = await supabase
    .from('solo_game_results')
    .select(
      'id, owner_user_id, player_duke_slug, dark_lord_duke_slug, victory_condition, winner, resolution, player_total, dark_lord_total, player_inputs, dark_lord_inputs, created_at, updated_at'
    )
    .eq('owner_user_id', safeOwnerUserId)
    .eq('id', soloGameId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return normalizeSoloResultRows([data as RawSoloRow])[0] ?? null
}

export async function loadSoloStatsBundle(ownerUserId?: string | null): Promise<SoloStatsBundle> {
  const rows = await loadSoloResults(ownerUserId)

  return {
    rows,
    meta: buildSoloStatsMeta(rows),
    summary: buildSoloStatsSummary(rows),
    playerDukeRows: buildSoloDukeUsageRows(rows),
    darkLordRows: buildSoloDarkLordUsageRows(rows),
    categoryStats: buildSoloCategoryStats(rows),
    conditionRows: buildSoloConditionRows(rows),
    strategy: buildSoloStrategySections(rows),
  }
}

export async function saveSoloGameResult(input: {
  id?: string | null
  playerDukeSlug: string | null | undefined
  darkLordDukeSlug: string | null | undefined
  victoryCondition: SoloVictoryCondition
  winner: SoloWinner
  resolution: SoloResolution
  playerTotal: number
  darkLordTotal: number
  playerInputs: ScoreInputs
  darkLordInputs: ScoreInputs
}) {
  const { supabase } = await import('./supabase.ts')
  const ownerUserId = await getAuthedUserId()
  const payload = {
    owner_user_id: ownerUserId,
    player_duke_slug: normalizeText(input.playerDukeSlug),
    dark_lord_duke_slug: normalizeText(input.darkLordDukeSlug),
    victory_condition: input.victoryCondition,
    winner: input.winner,
    resolution: input.resolution,
    player_total: Math.max(0, Math.round(input.playerTotal)),
    dark_lord_total: Math.max(0, Math.round(input.darkLordTotal)),
    player_inputs: sanitizeSoloInputsForRole('player', input.playerInputs),
    dark_lord_inputs: sanitizeSoloInputsForRole('dark_lord', input.darkLordInputs),
    updated_at: new Date().toISOString(),
  }

  if (input.id) {
    const { data, error } = await supabase
      .from('solo_game_results')
      .update(payload)
      .eq('id', input.id)
      .select(
        'id, owner_user_id, player_duke_slug, dark_lord_duke_slug, victory_condition, winner, resolution, player_total, dark_lord_total, player_inputs, dark_lord_inputs, created_at, updated_at'
      )
      .single()

    if (error) throw error
    return normalizeSoloResultRows([data as RawSoloRow])[0]
  }

  const { data, error } = await supabase
    .from('solo_game_results')
    .insert(payload)
    .select(
      'id, owner_user_id, player_duke_slug, dark_lord_duke_slug, victory_condition, winner, resolution, player_total, dark_lord_total, player_inputs, dark_lord_inputs, created_at, updated_at'
    )
    .single()

  if (error) throw error
  return normalizeSoloResultRows([data as RawSoloRow])[0]
}

export async function deleteSoloGameResult(
  soloGameId: string,
  ownerUserId?: string | null
) {
  const { supabase } = await import('./supabase.ts')
  const safeOwnerUserId = ownerUserId ?? (await getAuthedUserId())

  const { error } = await supabase
    .from('solo_game_results')
    .delete()
    .eq('owner_user_id', safeOwnerUserId)
    .eq('id', soloGameId)

  if (error) throw error
}
