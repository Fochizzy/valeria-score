import { formatDukeName } from './duke-names.ts'

export type DukeStatsPlayerType = 'user' | 'guest' | null

export type DukeStatsRow = {
  duke_slug: string
  games_played: number
  avg_score: number
  avg_score_per_player: number
  win_percentage: number
  second_percentage: number
  third_percentage: number
  best_score: number
  most_wins_player_type: DukeStatsPlayerType
  most_wins_player_key: string | null
  most_wins_player_name?: string | null
  wins_with_duke: number | null
  best_avg_player_type: DukeStatsPlayerType
  best_avg_player_key: string | null
  best_avg_player_name?: string | null
  avg_with_duke: number | null
  top_input_stat_key?: string | null
  top_input_points_share?: number | null
  winning_edge_stat_key?: string | null
  winning_edge_share_delta?: number | null
}

export type ResolvedDukeStatsRow = DukeStatsRow & {
  most_wins_player_name: string
  best_avg_player_name: string
  duke_name: string
  scores_through_summary: string
  winning_edge_summary: string
}

function normalizeName(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : ''
}

const teaserLabelByKey: Record<string, string> = {
  gold: 'Gold',
  magic: 'Mana',
  fight: 'Fight',
  vp: 'Victory Points',
  hammer: 'Hammer Symbols',
  helmet: 'Helmet Symbols',
  key: 'Key Symbols',
  holy: 'Holy Symbols',
  citizenCount: 'Citizens',
  monstersCount: 'Monsters',
  monsterPoints: 'Monster Points',
  bossCount: 'Boss',
  lieutenantCount: 'Lieutenant',
  beastCount: 'Beast',
  minionCount: 'Minion',
  domainCount: 'Domains',
  domainPoints: 'Domain Points',
}

function resolvePlayerName(name: string | null | undefined, playerType: DukeStatsPlayerType) {
  const normalizedName = normalizeName(name)
  if (normalizedName) return normalizedName

  if (playerType === 'guest') return 'Unknown Guest'
  if (playerType === 'user') return 'Unknown Player'
  return '-'
}

function toFiniteNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function getTeaserLabel(statKey: string | null | undefined) {
  if (typeof statKey !== 'string') return ''
  return teaserLabelByKey[statKey] ?? ''
}

function resolveScoresThroughSummary(
  statKey: string | null | undefined,
  pointsShare: number | null | undefined
) {
  const label = getTeaserLabel(statKey)
  const safeShare = toFiniteNumber(pointsShare)
  if (!label || safeShare === null) return 'No input scoring data yet'
  return `${label} ${safeShare.toFixed(1)}% of points`
}

function resolveWinningEdgeSummary(
  statKey: string | null | undefined,
  shareDelta: number | null | undefined
) {
  const label = getTeaserLabel(statKey)
  const safeDelta = toFiniteNumber(shareDelta)
  if (!label || safeDelta === null || safeDelta <= 0) {
    return 'Not enough winning data yet'
  }

  return `${label} +${safeDelta.toFixed(1)} pts share in wins`
}

export function resolveDukeStatsRows(rows: DukeStatsRow[]): ResolvedDukeStatsRow[] {
  return rows.map((row) => ({
    ...row,
    most_wins_player_name: resolvePlayerName(
      row.most_wins_player_name,
      row.most_wins_player_type
    ),
    best_avg_player_name: resolvePlayerName(
      row.best_avg_player_name,
      row.best_avg_player_type
    ),
    duke_name: formatDukeName(row.duke_slug, { emptyLabel: 'No Duke Selected' }),
    scores_through_summary: resolveScoresThroughSummary(
      row.top_input_stat_key,
      row.top_input_points_share
    ),
    winning_edge_summary: resolveWinningEdgeSummary(
      row.winning_edge_stat_key,
      row.winning_edge_share_delta
    ),
  }))
}
