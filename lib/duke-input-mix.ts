import type { DukeCard, StatKey } from '../data/cards'
import {
  CATEGORY_KEYS,
  computeCategoryShare,
  computeGameCategoryBreakdown,
  type CategoryKey,
} from './score-category-breakdown.ts'
import { normalizeScoreInputs } from './scoring.ts'

export type DukeMixGameRow = {
  duke_slug: string
  inputs: unknown
}

export type DukeInputMixEntry = {
  duke_slug: string
  games: number
  shares: Record<CategoryKey, number>  // 0-100, summed = 100 (when total > 0)
}

function emptyShares(): Record<CategoryKey, number> {
  return {
    resources: 0,
    symbols: 0,
    monsterSymbols: 0,
    counts: 0,
    points: 0,
    vp: 0,
  }
}

export function computeDukeInputMix(
  games: DukeMixGameRow[],
  cardsLookup: Record<string, DukeCard>
): DukeInputMixEntry[] {
  type Bucket = {
    duke_slug: string
    games: number
    shareSums: Record<CategoryKey, number>
  }
  const buckets = new Map<string, Bucket>()

  for (const game of games) {
    const slug = typeof game.duke_slug === 'string' ? game.duke_slug.trim() : ''
    if (!slug) continue
    const card = cardsLookup[slug]
    if (!card) continue

    const inputs = normalizeScoreInputs(
      (game.inputs ?? {}) as Partial<Record<StatKey, number>>
    )
    const breakdown = computeGameCategoryBreakdown(card, inputs)
    if (breakdown.total <= 0) continue

    let bucket = buckets.get(slug)
    if (!bucket) {
      bucket = {
        duke_slug: slug,
        games: 0,
        shareSums: emptyShares(),
      }
      buckets.set(slug, bucket)
    }
    bucket.games += 1
    for (const key of CATEGORY_KEYS) {
      bucket.shareSums[key] += computeCategoryShare(breakdown, key)
    }
  }

  return Array.from(buckets.values())
    .map((bucket) => {
      const shares = emptyShares()
      if (bucket.games > 0) {
        for (const key of CATEGORY_KEYS) {
          shares[key] = bucket.shareSums[key] / bucket.games
        }
      }
      return { duke_slug: bucket.duke_slug, games: bucket.games, shares }
    })
    .sort((a, b) => b.games - a.games || a.duke_slug.localeCompare(b.duke_slug))
}
