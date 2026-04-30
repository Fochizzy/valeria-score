export type VolatilityGameRow = {
  duke_slug: string
  total_score: number
}

export type DukeVolatilityEntry = {
  duke_slug: string
  games: number
  mean: number
  stddev: number
  min: number
  max: number
  // 0 = "rock-steady", 1 = "very swingy"; computed as stddev / mean clipped to [0,1].
  volatilityIndex: number
}

export type VolatilityLabel = 'Steady' | 'Moderate' | 'Swingy'

export function classifyVolatility(stddev: number, mean: number): VolatilityLabel {
  if (mean <= 0) return 'Steady'
  const cv = stddev / mean
  if (cv < 0.2) return 'Steady'
  if (cv < 0.4) return 'Moderate'
  return 'Swingy'
}

export function computeDukeVolatility(rows: VolatilityGameRow[]): DukeVolatilityEntry[] {
  type Bucket = {
    duke_slug: string
    scores: number[]
  }
  const buckets = new Map<string, Bucket>()

  for (const row of rows) {
    const slug = typeof row.duke_slug === 'string' ? row.duke_slug.trim() : ''
    if (!slug) continue
    const score = Number(row.total_score)
    if (!Number.isFinite(score)) continue

    let bucket = buckets.get(slug)
    if (!bucket) {
      bucket = { duke_slug: slug, scores: [] }
      buckets.set(slug, bucket)
    }
    bucket.scores.push(score)
  }

  return Array.from(buckets.values())
    .map((bucket) => {
      const games = bucket.scores.length
      const mean = games > 0 ? bucket.scores.reduce((s, v) => s + v, 0) / games : 0
      const variance =
        games > 1
          ? bucket.scores.reduce((s, v) => s + (v - mean) ** 2, 0) / (games - 1)
          : 0
      const stddev = Math.sqrt(variance)
      const min = games > 0 ? Math.min(...bucket.scores) : 0
      const max = games > 0 ? Math.max(...bucket.scores) : 0
      const volatilityIndex = mean > 0 ? Math.min(1, stddev / mean) : 0
      return {
        duke_slug: bucket.duke_slug,
        games,
        mean,
        stddev,
        min,
        max,
        volatilityIndex,
      }
    })
    .sort((a, b) => b.games - a.games || a.duke_slug.localeCompare(b.duke_slug))
}
