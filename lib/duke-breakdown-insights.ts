import type { DukeInputMixEntry } from './duke-input-mix.ts'
import type { DukeVolatilityEntry } from './duke-volatility.ts'
import { CATEGORY_KEYS, CATEGORY_LABEL, type CategoryKey } from './score-category-breakdown.ts'
import { formatDukeName } from './duke-names.ts'

export type DukeBreakdownInsight = {
  title: string
  body: string
}

function dukeLabel(slug: string): string {
  return formatDukeName(slug, { emptyLabel: slug })
}

function aggregateGlobalCategoryShare(entries: DukeInputMixEntry[]) {
  // Weight each duke's category share by its sample size so dukes with more
  // games carry more weight in the global "what wins" picture.
  const totalGames = entries.reduce((sum, entry) => sum + entry.games, 0)
  if (totalGames === 0) return null

  const weighted: Record<CategoryKey, number> = {
    resources: 0,
    symbols: 0,
    monsterSymbols: 0,
    counts: 0,
    points: 0,
    vp: 0,
  }
  for (const entry of entries) {
    if (entry.games <= 0) continue
    const weight = entry.games / totalGames
    for (const key of CATEGORY_KEYS) {
      weighted[key] += (entry.shares[key] ?? 0) * weight
    }
  }

  let topKey: CategoryKey = CATEGORY_KEYS[0]
  for (const key of CATEGORY_KEYS) {
    if (weighted[key] > weighted[topKey]) topKey = key
  }

  return { share: weighted[topKey], key: topKey, totalGames }
}

function pickMostPlayedDuke(entries: DukeInputMixEntry[]): DukeInputMixEntry | null {
  if (entries.length === 0) return null
  return [...entries].sort((a, b) => b.games - a.games)[0] ?? null
}

function pickSteadiestDuke(entries: DukeVolatilityEntry[]): DukeVolatilityEntry | null {
  // "Steadiest" = lowest stddev among dukes with at least 2 games (otherwise stddev is 0 trivially).
  const eligible = entries.filter((entry) => entry.games >= 2)
  if (eligible.length === 0) return null
  return [...eligible].sort((a, b) => a.stddev - b.stddev)[0] ?? null
}

function pickSwingiestDuke(entries: DukeVolatilityEntry[]): DukeVolatilityEntry | null {
  const eligible = entries.filter((entry) => entry.games >= 2)
  if (eligible.length === 0) return null
  return [...eligible].sort((a, b) => b.stddev - a.stddev)[0] ?? null
}

export function buildDukeBreakdownInsights({
  inputMix,
  volatility,
}: {
  inputMix: DukeInputMixEntry[]
  volatility: DukeVolatilityEntry[]
}): DukeBreakdownInsight[] {
  const insights: DukeBreakdownInsight[] = []

  const mostPlayed = pickMostPlayedDuke(inputMix)
  if (mostPlayed) {
    insights.push({
      title: 'Most Played',
      body: `${dukeLabel(mostPlayed.duke_slug)} leads the table with ${mostPlayed.games} tracked game${
        mostPlayed.games === 1 ? '' : 's'
      }.`,
    })
  }

  const aggregate = aggregateGlobalCategoryShare(inputMix)
  if (aggregate && aggregate.share > 0) {
    insights.push({
      title: 'Where Points Come From',
      body: `Across all dukes, ${CATEGORY_LABEL[aggregate.key]} is the dominant scoring category — about ${aggregate.share.toFixed(
        1
      )}% of an average final score.`,
    })
  }

  const steady = pickSteadiestDuke(volatility)
  const swingy = pickSwingiestDuke(volatility)
  if (steady && swingy && steady.duke_slug !== swingy.duke_slug) {
    insights.push({
      title: 'Steady vs Swingy',
      body: `${dukeLabel(steady.duke_slug)} is the steadiest pick (σ ${steady.stddev.toFixed(
        1
      )}); ${dukeLabel(swingy.duke_slug)} is the swingiest (σ ${swingy.stddev.toFixed(1)}).`,
    })
  } else if (steady) {
    insights.push({
      title: 'Steadiest Duke',
      body: `${dukeLabel(steady.duke_slug)} is the steadiest pick — scores hold within σ ${steady.stddev.toFixed(
        1
      )} across ${steady.games} tracked game${steady.games === 1 ? '' : 's'}.`,
    })
  }

  return insights.slice(0, 3)
}
