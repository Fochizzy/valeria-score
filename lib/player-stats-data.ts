export type PlayerStatsTimeWindow = 'all' | '30d'

type NumericValue = number | string | null | undefined

export type PlayerStatsViewName =
  | 'player_global_stats'
  | 'player_global_stats_30d'
  | 'player_duke_stats'
  | 'player_duke_stats_30d'

export type PlayerStatsViewSource = {
  leaderboardView: Extract<PlayerStatsViewName, 'player_global_stats' | 'player_global_stats_30d'>
  dukeView: Extract<PlayerStatsViewName, 'player_duke_stats' | 'player_duke_stats_30d'>
}

export type RawPlayerLeaderboardRow = {
  player_key: string
  player_name: string | null
  public_player_id: string | null
  player_type: string | null
  games_played: NumericValue
  wins: NumericValue
  podiums?: NumericValue
  second_places?: NumericValue
  third_places?: NumericValue
  avg_score: NumericValue
  avg_finish: NumericValue
  avg_finish_percentile?: NumericValue
  win_rate?: NumericValue
  podium_rate?: NumericValue
}

export type PlayerLeaderboardRow = {
  player_key: string
  player_name: string
  public_player_id: string | null
  player_type: 'user' | 'guest'
  games_played: number
  wins: number
  podiums: number
  second_places: number
  third_places: number
  avg_score: number
  avg_finish: number
  avg_finish_percentile: number
  win_rate: number
  podium_rate: number
}

export type RawPlayerDukeRow = RawPlayerLeaderboardRow & {
  duke_slug: string | null
}

export type PlayerDukeRow = PlayerLeaderboardRow & {
  duke_slug: string
}

function toNumber(value: NumericValue) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function normalizeText(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizePublicPlayerId(value: string | null | undefined) {
  const normalized = normalizeText(value).toUpperCase()
  return normalized || null
}

function normalizePlayerType(value: string | null | undefined): 'user' | 'guest' {
  return value === 'guest' ? 'guest' : 'user'
}

function fallbackPlayerName(playerType: 'user' | 'guest') {
  return playerType === 'guest' ? 'Guest Player' : 'Player'
}

function compareLeaderboardRows(
  a: Pick<PlayerLeaderboardRow, 'wins' | 'avg_score' | 'avg_finish'>,
  b: Pick<PlayerLeaderboardRow, 'wins' | 'avg_score' | 'avg_finish'>
) {
  if (b.wins !== a.wins) return b.wins - a.wins
  if (b.avg_score !== a.avg_score) return b.avg_score - a.avg_score
  return a.avg_finish - b.avg_finish
}

function compareDukeRows(
  a: Pick<
    PlayerDukeRow,
    'wins' | 'win_rate' | 'avg_finish_percentile' | 'avg_score' | 'duke_slug'
  >,
  b: Pick<
    PlayerDukeRow,
    'wins' | 'win_rate' | 'avg_finish_percentile' | 'avg_score' | 'duke_slug'
  >
) {
  if (b.wins !== a.wins) return b.wins - a.wins
  if (b.win_rate !== a.win_rate) return b.win_rate - a.win_rate
  if (b.avg_finish_percentile !== a.avg_finish_percentile) {
    return b.avg_finish_percentile - a.avg_finish_percentile
  }
  if (b.avg_score !== a.avg_score) return b.avg_score - a.avg_score
  return a.duke_slug.localeCompare(b.duke_slug)
}

export function getPlayerStatsViewNames(timeWindow: PlayerStatsTimeWindow): PlayerStatsViewSource {
  if (timeWindow === '30d') {
    return {
      leaderboardView: 'player_global_stats_30d',
      dukeView: 'player_duke_stats_30d',
    }
  }

  return {
    leaderboardView: 'player_global_stats',
    dukeView: 'player_duke_stats',
  }
}

export function resolvePlayerLeaderboardRows(
  rows: RawPlayerLeaderboardRow[]
): PlayerLeaderboardRow[] {
  return rows
    .map((row) => {
      const playerType = normalizePlayerType(row.player_type)
      const playerName = normalizeText(row.player_name) || fallbackPlayerName(playerType)

      return {
        player_key: row.player_key,
        player_name: playerName,
        public_player_id: normalizePublicPlayerId(row.public_player_id),
        player_type: playerType,
        games_played: toNumber(row.games_played),
        wins: toNumber(row.wins),
        podiums: toNumber(row.podiums),
        second_places: toNumber(row.second_places),
        third_places: toNumber(row.third_places),
        avg_score: toNumber(row.avg_score),
        avg_finish: toNumber(row.avg_finish),
        avg_finish_percentile: toNumber(row.avg_finish_percentile),
        win_rate: toNumber(row.win_rate),
        podium_rate: toNumber(row.podium_rate),
      }
    })
    .sort(compareLeaderboardRows)
}

export function resolvePlayerDukeRows(rows: RawPlayerDukeRow[]): PlayerDukeRow[] {
  return rows
    .map((row) => ({
      ...resolvePlayerLeaderboardRows([row])[0],
      duke_slug: normalizeText(row.duke_slug),
    }))
    .filter((row) => row.duke_slug.length > 0)
    .sort(compareDukeRows)
}
