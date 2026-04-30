import { CATEGORY_LABEL, type CategoryKey } from './score-category-breakdown.ts'
import { formatDukeName } from './duke-names.ts'
import type {
  MetaSnapshot,
  ShapeMonthEntry,
  TierEntry,
} from './global-trends.ts'

export type GlobalTrendsInsight = {
  title: string
  body: string
}

function dukeLabel(slug: string): string {
  return formatDukeName(slug, { emptyLabel: slug })
}

function pluralizeGames(count: number): string {
  return `${count} ${count === 1 ? 'game' : 'games'}`
}

function findTopShareCategory(
  shares: Record<CategoryKey, number>
): { key: CategoryKey; share: number } | null {
  const entries = (Object.entries(shares) as [CategoryKey, number][]).filter(
    ([, share]) => Number.isFinite(share) && share > 0
  )
  if (entries.length === 0) return null

  let bestKey: CategoryKey = entries[0][0]
  let bestShare = entries[0][1]
  for (const [key, share] of entries) {
    if (share > bestShare) {
      bestKey = key
      bestShare = share
    }
  }
  return { key: bestKey, share: bestShare }
}

function buildActivityInsight(meta: MetaSnapshot): GlobalTrendsInsight | null {
  if (meta.totalGames <= 0) return null

  const dukeFragment =
    meta.uniqueDukes > 0
      ? ` across ${meta.uniqueDukes} duke${meta.uniqueDukes === 1 ? '' : 's'}`
      : ''

  return {
    title: 'Recent Activity',
    body: `${pluralizeGames(meta.totalGames)} tracked in the last ${meta.windowDays} day${
      meta.windowDays === 1 ? '' : 's'
    }${dukeFragment}.`,
  }
}

function buildMostPlayedInsight(meta: MetaSnapshot): GlobalTrendsInsight | null {
  if (!meta.topPlayed || meta.topPlayed.games <= 0) return null

  return {
    title: 'Most Played',
    body: `${dukeLabel(meta.topPlayed.duke_slug)} leads the ${
      meta.windowDays
    }-day window with ${pluralizeGames(meta.topPlayed.games)}.`,
  }
}

function buildTopScoringInsight(meta: MetaSnapshot): GlobalTrendsInsight | null {
  if (!meta.topScoring || meta.topScoring.avg_score <= 0) return null

  return {
    title: 'Top Average Score',
    body: `${dukeLabel(meta.topScoring.duke_slug)} is averaging ${meta.topScoring.avg_score.toFixed(
      1
    )} points across ${pluralizeGames(meta.topScoring.games)} this window.`,
  }
}

function buildTierInsight(tierList: TierEntry[]): GlobalTrendsInsight | null {
  if (tierList.length === 0) return null

  const sTier = tierList.filter((entry) => entry.tier === 'S')
  if (sTier.length > 0) {
    const topS = [...sTier].sort((a, b) => b.win_percentage - a.win_percentage)[0]
    if (sTier.length === 1) {
      return {
        title: 'S-Tier',
        body: `${dukeLabel(topS.duke_slug)} stands alone at S-tier with a ${topS.win_percentage.toFixed(
          1
        )}% win rate over ${pluralizeGames(topS.games_played)}.`,
      }
    }
    return {
      title: 'S-Tier',
      body: `${sTier.length} dukes hit S-tier — ${dukeLabel(
        topS.duke_slug
      )} leads at ${topS.win_percentage.toFixed(1)}% wins.`,
    }
  }

  // No S-tier yet — fall back to whoever leads on win %.
  const ranked = tierList.filter((entry) => entry.tier !== 'Unranked')
  if (ranked.length === 0) return null
  const topRanked = [...ranked].sort((a, b) => b.win_percentage - a.win_percentage)[0]
  if (!topRanked || topRanked.win_percentage <= 0) return null

  return {
    title: 'Tier Leader',
    body: `No duke has cracked S-tier yet — ${dukeLabel(topRanked.duke_slug)} leads at ${topRanked.win_percentage.toFixed(
      1
    )}% wins (${topRanked.tier}-tier).`,
  }
}

function buildShapeInsight(shape: ShapeMonthEntry[]): GlobalTrendsInsight | null {
  if (shape.length === 0) return null

  // ShapeMonthEntry list is already chronological in the source. Use the
  // most recent month with games to call out the dominant scoring style.
  const recent = [...shape].reverse().find((entry) => entry.games > 0)
  if (!recent) return null

  const top = findTopShareCategory(recent.shares)
  if (!top) return null

  // If we have at least two months, frame it as a shift; otherwise just
  // describe the current shape.
  const earlier = shape
    .filter((entry) => entry.monthIso !== recent.monthIso && entry.games > 0)
    .pop()

  if (earlier) {
    const earlierShare = earlier.shares[top.key] ?? 0
    const delta = top.share - earlierShare
    if (Math.abs(delta) >= 5) {
      const direction = delta > 0 ? 'up from' : 'down from'
      return {
        title: 'Game Shape',
        body: `${recent.monthLabel}: ${CATEGORY_LABEL[top.key]} is the dominant scoring category at ${top.share.toFixed(
          1
        )}% — ${direction} ${earlierShare.toFixed(1)}% in ${earlier.monthLabel}.`,
      }
    }
  }

  return {
    title: 'Game Shape',
    body: `In ${recent.monthLabel}, ${CATEGORY_LABEL[top.key]} drives ${top.share.toFixed(
      1
    )}% of an average final score.`,
  }
}

export function buildGlobalTrendsInsights({
  meta,
  tierList,
  shapeOverTime,
}: {
  meta: MetaSnapshot
  tierList: TierEntry[]
  shapeOverTime: ShapeMonthEntry[]
}): GlobalTrendsInsight[] {
  const candidates = [
    buildActivityInsight(meta),
    buildMostPlayedInsight(meta),
    buildTopScoringInsight(meta),
    buildTierInsight(tierList),
    buildShapeInsight(shapeOverTime),
  ]

  return candidates.filter((insight): insight is GlobalTrendsInsight => insight !== null).slice(0, 4)
}
