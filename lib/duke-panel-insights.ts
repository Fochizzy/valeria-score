import type {
  DukeInputProfileRow,
  GlobalGameMarginRow,
  ScoreFamilyRow,
} from './duke-input-analytics.ts'

export type DukePanelInsight = {
  title: string
  body: string
}

function pickTopFamily(rows: ScoreFamilyRow[]): ScoreFamilyRow | null {
  if (rows.length === 0) return null
  return [...rows].sort((a, b) => b.points_share - a.points_share)[0] ?? null
}

function pickTopWinningContributor(rows: DukeInputProfileRow[]): DukeInputProfileRow | null {
  if (rows.length === 0) return null
  return [...rows].sort((a, b) => b.points_share - a.points_share)[0] ?? null
}

export function buildSelectedDukeInsights({
  dukeName,
  gamesPlayed,
  familyRows,
  winningRows,
  canShowWinningProfile,
}: {
  dukeName: string
  gamesPlayed: number
  familyRows: ScoreFamilyRow[]
  winningRows: DukeInputProfileRow[]
  canShowWinningProfile: boolean
}): DukePanelInsight[] {
  const insights: DukePanelInsight[] = []
  if (gamesPlayed === 0) return insights

  const topFamily = pickTopFamily(familyRows)
  if (topFamily && topFamily.points_share > 0) {
    insights.push({
      title: 'Strongest Family',
      body: `${topFamily.label} carries the most weight for ${dukeName} — ${topFamily.points_share.toFixed(
        1
      )}% of an average final score.`,
    })
  }

  if (canShowWinningProfile) {
    const topWin = pickTopWinningContributor(winningRows)
    if (topWin && topWin.share_delta_vs_global > 1) {
      insights.push({
        title: 'In Wins',
        body: `Wins lean further into ${topWin.label}: +${topWin.share_delta_vs_global.toFixed(
          1
        )} pt share over the global average.`,
      })
    }
  }

  return insights.slice(0, 2)
}

export function buildAcrossGamesInsights({
  familyRows,
  marginRows,
}: {
  familyRows: ScoreFamilyRow[]
  marginRows: GlobalGameMarginRow[]
}): DukePanelInsight[] {
  const insights: DukePanelInsight[] = []

  const topFamily = pickTopFamily(familyRows)
  if (topFamily && topFamily.points_share > 0) {
    insights.push({
      title: 'Biggest Family',
      body: `${topFamily.label} dominates scoring — ${topFamily.points_share.toFixed(
        1
      )}% of points across all tracked games.`,
    })
  }

  // Pick the lowest-margin bucket that has actual games to talk about close finishes.
  const closeBucket = [...marginRows]
    .filter((row) => row.tables_with_margin > 0)
    .sort((a, b) => {
      // Prefer the strictest bucket (lte_3 over lte_5) when both are non-empty.
      if (a.margin_bucket === b.margin_bucket) return 0
      return a.margin_bucket === 'lte_3' ? -1 : 1
    })[0]
  if (closeBucket) {
    insights.push({
      title: 'Close Finishes',
      body: `${closeBucket.share_percentage.toFixed(
        1
      )}% of tracked tables finish ${closeBucket.label} (${closeBucket.tables_with_margin} of ${closeBucket.tables_sample}).`,
    })
  }

  return insights.slice(0, 2)
}
