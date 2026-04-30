import type { PlayerDukeRow, PlayerLeaderboardRow } from './player-stats-data.ts'

export type PlayerDukeInsight = {
  dukeSlug: string
  gamesPlayed: number
  wins: number
  winRate: number
  podiumRate: number
  avgFinishPercentile: number
  avgScore: number
}

export type SelectedPlayerInsights = {
  favoriteDuke: PlayerDukeInsight | null
  bestDuke: PlayerDukeInsight | null
}

function toInsight(row: PlayerDukeRow): PlayerDukeInsight {
  return {
    dukeSlug: row.duke_slug,
    gamesPlayed: row.games_played,
    wins: row.wins,
    winRate: row.win_rate,
    podiumRate: row.podium_rate,
    avgFinishPercentile: row.avg_finish_percentile,
    avgScore: row.avg_score,
  }
}

function compareFavorite(left: PlayerDukeRow, right: PlayerDukeRow) {
  if (right.games_played !== left.games_played) return right.games_played - left.games_played
  if (right.win_rate !== left.win_rate) return right.win_rate - left.win_rate
  if (right.avg_finish_percentile !== left.avg_finish_percentile) {
    return right.avg_finish_percentile - left.avg_finish_percentile
  }
  if (right.avg_score !== left.avg_score) return right.avg_score - left.avg_score
  return left.duke_slug.localeCompare(right.duke_slug)
}

function compareBest(left: PlayerDukeRow, right: PlayerDukeRow) {
  if (right.win_rate !== left.win_rate) return right.win_rate - left.win_rate
  if (right.avg_finish_percentile !== left.avg_finish_percentile) {
    return right.avg_finish_percentile - left.avg_finish_percentile
  }
  if (right.avg_score !== left.avg_score) return right.avg_score - left.avg_score
  if (right.games_played !== left.games_played) return right.games_played - left.games_played
  return left.duke_slug.localeCompare(right.duke_slug)
}

export function deriveSelectedPlayerInsights(rows: PlayerDukeRow[]): SelectedPlayerInsights {
  if (rows.length === 0) {
    return {
      favoriteDuke: null,
      bestDuke: null,
    }
  }

  const favoriteDuke = [...rows].sort(compareFavorite)[0] ?? null
  const bestCandidates = rows.filter((row) => row.games_played >= 3)
  const bestDuke = bestCandidates.length > 0 ? [...bestCandidates].sort(compareBest)[0] : null

  return {
    favoriteDuke: favoriteDuke ? toInsight(favoriteDuke) : null,
    bestDuke: bestDuke ? toInsight(bestDuke) : null,
  }
}

export function formatPlayerLeaderboardSummary(
  player: Pick<PlayerLeaderboardRow, 'wins' | 'podiums' | 'avg_finish_percentile'>
) {
  return `${player.wins} wins · ${player.podiums} podiums · Norm finish ${player.avg_finish_percentile.toFixed(1)}`
}

export function formatPlayerDukeSummary(
  row: Pick<PlayerDukeRow, 'games_played' | 'wins' | 'win_rate' | 'avg_finish_percentile'>
) {
  return `${row.games_played} games · ${row.wins} wins · WR ${row.win_rate.toFixed(1)}% · Norm ${row.avg_finish_percentile.toFixed(1)}`
}
