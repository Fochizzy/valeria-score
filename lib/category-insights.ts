import {
  CATEGORY_LABEL,
  computeCategoryShare,
  type CategoryBreakdown,
  type CategoryKey,
  type PlayerCategoryStats,
} from './score-category-breakdown.ts'

export type CategoryInsight = {
  title: string
  body: string
  // Forward-compat with PlainLanguageInsight: category insights never set this,
  // but keeping the field optional lets callers union both kinds without casts.
  sessionId?: string
}

const CATEGORY_ORDER: readonly CategoryKey[] = [
  'resources',
  'symbols',
  'monsterSymbols',
  'counts',
  'points',
  'vp',
] as const

const CATEGORY_COUNT_COPY =
  CATEGORY_ORDER.length === 6 ? 'six' : String(CATEGORY_ORDER.length)

function findTopCategory(
  breakdown: CategoryBreakdown
): { key: CategoryKey; share: number } | null {
  if (breakdown.total <= 0) return null

  let bestKey: CategoryKey = CATEGORY_ORDER[0]
  let bestValue = breakdown[bestKey]

  for (const key of CATEGORY_ORDER) {
    if (breakdown[key] > bestValue) {
      bestKey = key
      bestValue = breakdown[key]
    }
  }

  return { key: bestKey, share: computeCategoryShare(breakdown, bestKey) }
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

export function buildPlayerCategoryInsights(
  stats: PlayerCategoryStats
): CategoryInsight[] {
  const insights: CategoryInsight[] = []

  if (stats.totalGames === 0 || stats.allGames.total <= 0) {
    return insights
  }

  const overall = findTopCategory(stats.allGames)
  if (overall) {
    insights.push({
      title: 'Where Your Points Come From',
      body: `${formatPercent(overall.share)} of your points come from ${CATEGORY_LABEL[overall.key]} — your biggest category.`,
    })
  }

  if (stats.totalWins > 0 && stats.winsOnly.total > 0) {
    const wins = findTopCategory(stats.winsOnly)
    if (wins) {
      const overallShare = computeCategoryShare(stats.allGames, wins.key)
      const delta = wins.share - overallShare

      if (delta >= 5) {
        insights.push({
          title: 'What Wins Look Like',
          body: `In your ${pluralize(stats.totalWins, 'winning game', 'winning games')}, you lean further into ${CATEGORY_LABEL[wins.key]} (${formatPercent(wins.share)} vs ${formatPercent(overallShare)} overall).`,
        })
      } else if (delta <= -5) {
        insights.push({
          title: 'What Wins Look Like',
          body: `In your ${pluralize(stats.totalWins, 'winning game', 'winning games')}, ${CATEGORY_LABEL[wins.key]} still leads but pulls back to ${formatPercent(wins.share)} (vs ${formatPercent(overallShare)} overall) — wins look more balanced.`,
        })
      } else {
        insights.push({
          title: 'What Wins Look Like',
          body: `Your ${pluralize(stats.totalWins, 'winning game', 'winning games')} mirror your usual mix — ${CATEGORY_LABEL[wins.key]} still leads at ${formatPercent(wins.share)}.`,
        })
      }
    }
  }

  const sortedShares = CATEGORY_ORDER.map((key) =>
    computeCategoryShare(stats.allGames, key)
  ).sort((a, b) => b - a)
  const topTwoShare = sortedShares[0] + sortedShares[1]

  if (topTwoShare >= 80) {
    insights.push({
      title: 'Scoring Style',
      body: `${formatPercent(topTwoShare)} of your points come from just two categories — you have a focused scoring style.`,
    })
  } else if (topTwoShare > 0 && topTwoShare <= 60) {
    insights.push({
      title: 'Scoring Style',
      body: `Your points spread evenly across all ${CATEGORY_COUNT_COPY} categories — you score from many angles.`, 
    })
  }

  return insights.slice(0, 3)
}
