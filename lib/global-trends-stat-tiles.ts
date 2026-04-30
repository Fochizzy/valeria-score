import { CATEGORY_LABEL, type CategoryKey } from './score-category-breakdown.ts'
import { formatDukeName } from './duke-names.ts'
import type { ShapeMonthEntry, TierEntry } from './global-trends.ts'

export type GlobalTrendsStatTile = {
  label: string
  value: string
  helper?: string
}

function dukeLabel(slug: string): string {
  return formatDukeName(slug, { emptyLabel: slug })
}

function findTopShareCategory(
  shares: Record<CategoryKey, number>
): { key: CategoryKey; share: number } | null {
  const entries = (Object.entries(shares) as [CategoryKey, number][]).filter(
    ([, share]) => Number.isFinite(share) && share > 0
  )
  if (entries.length === 0) return null
  return entries.reduce(
    (best, [key, share]) => (share > best.share ? { key, share } : best),
    { key: entries[0][0], share: entries[0][1] }
  )
}

// Builds the four "Across All Tracked Games" stat tiles that replace the
// previous prose insight block on the Global Trends overview.
export function buildGlobalTrendsStatTiles({
  tierList,
  shapeOverTime,
}: {
  tierList: TierEntry[]
  shapeOverTime: ShapeMonthEntry[]
}): GlobalTrendsStatTile[] {
  const tiles: GlobalTrendsStatTile[] = []

  // Tile 1 — total tracked games across all dukes (lifetime).
  const totalGames = tierList.reduce(
    (sum, entry) => sum + (Number.isFinite(entry.games_played) ? entry.games_played : 0),
    0
  )
  if (totalGames > 0) {
    tiles.push({
      label: 'Tracked Games',
      value: String(totalGames),
      helper: 'lifetime',
    })
  }

  // Tile 2 — number of distinct dukes with at least one tracked game.
  const dukesPlayed = tierList.filter((entry) => entry.games_played > 0).length
  if (dukesPlayed > 0) {
    tiles.push({
      label: 'Dukes Played',
      value: String(dukesPlayed),
      helper: dukesPlayed === 1 ? 'duke' : 'unique dukes',
    })
  }

  // Tile 3 — tier leader (top S-tier duke or top win% if no one is S-tier).
  const ranked = tierList.filter((entry) => entry.tier !== 'Unranked')
  if (ranked.length > 0) {
    const leader = [...ranked].sort((a, b) => b.win_percentage - a.win_percentage)[0]
    if (leader && leader.win_percentage > 0) {
      tiles.push({
        label: 'Tier Leader',
        value: dukeLabel(leader.duke_slug),
        helper: `${leader.win_percentage.toFixed(0)}% wins · ${leader.games_played}g`,
      })
    }
  }

  // Tile 4 — dominant scoring category in the most recent month with data.
  const recent = [...shapeOverTime].reverse().find((entry) => entry.games > 0)
  if (recent) {
    const top = findTopShareCategory(recent.shares)
    if (top) {
      tiles.push({
        label: 'Top Category',
        value: `${top.share.toFixed(0)}%`,
        helper: `${CATEGORY_LABEL[top.key]} · ${recent.monthLabel}`,
      })
    }
  }

  // Always return an even count for the 2x2 grid — drop the last tile if odd.
  if (tiles.length % 2 === 1) {
    tiles.pop()
  }

  return tiles.slice(0, 4)
}
