export type PercentileMetricKey = 'win_rate' | 'avg_score' | 'podium_rate'

export type PercentileResult = {
  rank: number              // 1-indexed: 1 = best
  total: number
  topPercent: number        // e.g. 18 means "top 18%"
}

type ScorableRow = {
  player_key: string
  win_rate: number
  avg_score: number
  podium_rate: number
}

const TIE_BREAKERS: Record<PercentileMetricKey, (a: ScorableRow, b: ScorableRow) => number> = {
  win_rate: (a, b) => b.avg_score - a.avg_score,
  avg_score: (a, b) => b.win_rate - a.win_rate,
  podium_rate: (a, b) => b.win_rate - a.win_rate,
}

export function computePercentileResult(
  rows: ScorableRow[],
  viewerPlayerKey: string,
  metric: PercentileMetricKey,
  options: { minPlayers?: number } = {}
): PercentileResult | null {
  const minPlayers = options.minPlayers ?? 2
  if (rows.length < minPlayers || !viewerPlayerKey) return null

  const sorted = [...rows].sort((a, b) => {
    const primary = b[metric] - a[metric]
    if (primary !== 0) return primary
    return TIE_BREAKERS[metric](a, b)
  })

  const idx = sorted.findIndex((row) => row.player_key === viewerPlayerKey)
  if (idx === -1) return null

  const rank = idx + 1
  const total = sorted.length
  const topPercent = Math.round((rank / total) * 100)

  return { rank, total, topPercent }
}

export function formatPercentileLabel(result: PercentileResult | null): string {
  if (!result) return 'Not ranked yet'
  if (result.rank === 1) return `#1 of ${result.total}`
  return `Top ${result.topPercent}% (${result.rank} of ${result.total})`
}
