export type PlayerDukeRowSlim = {
  duke_slug: string
  games_played: number
  wins: number
  win_rate: number
  avg_score: number
}

export type GlobalDukeRowSlim = {
  duke_slug: string
  games_played: number
  win_percentage: number
  avg_score: number
}

export type DukeVsGlobalRow = {
  duke_slug: string
  player_games: number
  player_win_rate: number
  player_avg_score: number
  global_games: number
  global_win_rate: number
  global_avg_score: number
  win_rate_delta: number
  avg_score_delta: number
}

export function buildDukeVsGlobalRows(
  playerRows: PlayerDukeRowSlim[],
  globalRows: GlobalDukeRowSlim[]
): DukeVsGlobalRow[] {
  const globalBySlug = new Map<string, GlobalDukeRowSlim>()
  for (const g of globalRows) {
    if (g.duke_slug) globalBySlug.set(g.duke_slug, g)
  }

  return playerRows
    .filter((row) => row.duke_slug)
    .map((row) => {
      const global = globalBySlug.get(row.duke_slug)
      const globalWinRate = Number(global?.win_percentage ?? 0)
      const globalAvgScore = Number(global?.avg_score ?? 0)
      const globalGames = Number(global?.games_played ?? 0)

      return {
        duke_slug: row.duke_slug,
        player_games: Number(row.games_played ?? 0),
        player_win_rate: Number(row.win_rate ?? 0),
        player_avg_score: Number(row.avg_score ?? 0),
        global_games: globalGames,
        global_win_rate: globalWinRate,
        global_avg_score: globalAvgScore,
        win_rate_delta: Number(row.win_rate ?? 0) - globalWinRate,
        avg_score_delta: Number(row.avg_score ?? 0) - globalAvgScore,
      }
    })
    .sort((a, b) => {
      if (b.win_rate_delta !== a.win_rate_delta)
        return b.win_rate_delta - a.win_rate_delta
      return b.avg_score_delta - a.avg_score_delta
    })
}
