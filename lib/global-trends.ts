import type { DukeCard, StatKey } from '../data/cards'
import {
  CATEGORY_KEYS,
  computeCategoryShare,
  computeGameCategoryBreakdown,
  type CategoryKey,
} from './score-category-breakdown.ts'
import { normalizeScoreInputs } from './scoring.ts'

// ---------- Meta snapshot ----------

export type MetaSnapshotGameRow = {
  duke_slug: string
  total_score: number
  updated_at: string
}

export type MetaSnapshot = {
  windowDays: number
  totalGames: number
  uniqueDukes: number
  topPlayed: { duke_slug: string; games: number } | null
  topScoring: { duke_slug: string; avg_score: number; games: number } | null
}

export function buildMetaSnapshot(
  rows: MetaSnapshotGameRow[],
  options: { windowDays?: number; nowIso?: string } = {}
): MetaSnapshot {
  const windowDays = options.windowDays ?? 7
  const now = options.nowIso ? Date.parse(options.nowIso) : Date.now()
  const cutoff = now - windowDays * 24 * 60 * 60 * 1000

  type Bucket = { games: number; scoreSum: number }
  const byDuke = new Map<string, Bucket>()

  let totalGames = 0
  for (const row of rows) {
    const updated = Date.parse(row.updated_at ?? '')
    if (!Number.isFinite(updated) || updated < cutoff) continue
    const slug = typeof row.duke_slug === 'string' ? row.duke_slug.trim() : ''
    if (!slug) continue

    const score = Number(row.total_score)
    if (!Number.isFinite(score)) continue

    const existing = byDuke.get(slug)
    if (existing) {
      existing.games += 1
      existing.scoreSum += score
    } else {
      byDuke.set(slug, { games: 1, scoreSum: score })
    }
    totalGames += 1
  }

  let topPlayed: MetaSnapshot['topPlayed'] = null
  let topScoring: MetaSnapshot['topScoring'] = null

  byDuke.forEach((bucket, slug) => {
    if (!topPlayed || bucket.games > topPlayed.games) {
      topPlayed = { duke_slug: slug, games: bucket.games }
    }
    const avg = bucket.scoreSum / bucket.games
    if (
      bucket.games >= 2 &&
      (!topScoring || avg > topScoring.avg_score)
    ) {
      topScoring = { duke_slug: slug, avg_score: avg, games: bucket.games }
    }
  })

  return {
    windowDays,
    totalGames,
    uniqueDukes: byDuke.size,
    topPlayed,
    topScoring,
  }
}

// ---------- Tier list ----------

export type TierListInputRow = {
  duke_slug: string
  games_played: number
  win_percentage: number
  avg_score: number
}

export type TierBucket = 'S' | 'A' | 'B' | 'C' | 'Unranked'

export type TierEntry = {
  duke_slug: string
  tier: TierBucket
  games_played: number
  win_percentage: number
  avg_score: number
}

export type TierListOptions = {
  // Below this sample, dukes go to "Unranked".
  minGames?: number
  // Win % thresholds (lower bound inclusive).
  thresholds?: { S: number; A: number; B: number }
}

const DEFAULT_TIER_OPTIONS: Required<TierListOptions> = {
  minGames: 5,
  thresholds: { S: 50, A: 35, B: 20 },
}

export function buildTierList(
  rows: TierListInputRow[],
  options: TierListOptions = {}
): TierEntry[] {
  const opts = { ...DEFAULT_TIER_OPTIONS, ...options }
  const thresholds = { ...DEFAULT_TIER_OPTIONS.thresholds, ...(options.thresholds ?? {}) }

  const tierOrder: Record<TierBucket, number> = {
    S: 0,
    A: 1,
    B: 2,
    C: 3,
    Unranked: 4,
  }

  return rows
    .filter((row) => typeof row.duke_slug === 'string' && row.duke_slug.length > 0)
    .map((row) => {
      const games = Number(row.games_played ?? 0)
      const winPct = Number(row.win_percentage ?? 0)
      const avgScore = Number(row.avg_score ?? 0)

      let tier: TierBucket
      if (games < opts.minGames) tier = 'Unranked'
      else if (winPct >= thresholds.S) tier = 'S'
      else if (winPct >= thresholds.A) tier = 'A'
      else if (winPct >= thresholds.B) tier = 'B'
      else tier = 'C'

      return {
        duke_slug: row.duke_slug,
        tier,
        games_played: games,
        win_percentage: winPct,
        avg_score: avgScore,
      }
    })
    .sort((a, b) => {
      const tierDelta = tierOrder[a.tier] - tierOrder[b.tier]
      if (tierDelta !== 0) return tierDelta
      if (b.win_percentage !== a.win_percentage)
        return b.win_percentage - a.win_percentage
      return b.avg_score - a.avg_score
    })
}

// ---------- Average game shape over time (monthly) ----------

export type ShapeGameRow = {
  duke_slug: string
  inputs: unknown
  updated_at: string
}

export type ShapeMonthEntry = {
  monthIso: string                    // '2026-04-01'
  monthLabel: string                  // 'Apr 2026'
  games: number
  shares: Record<CategoryKey, number> // 0-100
}

function monthIsoStart(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function monthLabel(date: Date): string {
  return `${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

export function buildAverageShapeOverTime(
  rows: ShapeGameRow[],
  cardsLookup: Record<string, DukeCard>
): ShapeMonthEntry[] {
  type Bucket = {
    monthIso: string
    monthLabel: string
    games: number
    shareSums: Record<CategoryKey, number>
  }
  const buckets = new Map<string, Bucket>()

  for (const row of rows) {
    const slug = typeof row.duke_slug === 'string' ? row.duke_slug.trim() : ''
    if (!slug) continue
    const card = cardsLookup[slug]
    if (!card) continue

    const updatedMs = Date.parse(row.updated_at ?? '')
    if (!Number.isFinite(updatedMs)) continue

    const inputs = normalizeScoreInputs(
      (row.inputs ?? {}) as Partial<Record<StatKey, number>>
    )
    const breakdown = computeGameCategoryBreakdown(card, inputs)
    if (breakdown.total <= 0) continue

    const date = new Date(updatedMs)
    const iso = monthIsoStart(date)

    let bucket = buckets.get(iso)
    if (!bucket) {
      bucket = {
        monthIso: iso,
        monthLabel: monthLabel(date),
        games: 0,
        shareSums: {
          resources: 0,
          symbols: 0,
          monsterSymbols: 0,
          counts: 0,
          points: 0,
          vp: 0,
        },
      }
      buckets.set(iso, bucket)
    }
    bucket.games += 1
    for (const key of CATEGORY_KEYS) {
      bucket.shareSums[key] += computeCategoryShare(breakdown, key)
    }
  }

  return Array.from(buckets.values())
    .map((bucket) => {
        const shares: Record<CategoryKey, number> = {
          resources: 0,
          symbols: 0,
          monsterSymbols: 0,
          counts: 0,
          points: 0,
          vp: 0,
        }
      if (bucket.games > 0) {
        for (const key of CATEGORY_KEYS) {
          shares[key] = bucket.shareSums[key] / bucket.games
        }
      }
      return {
        monthIso: bucket.monthIso,
        monthLabel: bucket.monthLabel,
        games: bucket.games,
        shares,
      }
    })
    .sort((a, b) => a.monthIso.localeCompare(b.monthIso))
}
