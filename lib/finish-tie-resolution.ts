import type { CompareEntry } from './compare-entries.ts'

export type TiebreakPlacementMap = Record<string, number>

function getScoredEntries(entries: CompareEntry[]) {
  return entries.filter((entry) => entry.hasScore)
}

export function getTopScoreTiedEntries(entries: CompareEntry[]) {
  const scoredEntries = getScoredEntries(entries)

  if (scoredEntries.length < 2) {
    return []
  }

  const topScore = Math.max(...scoredEntries.map((entry) => entry.totalScore))
  const tiedEntries = scoredEntries.filter((entry) => entry.totalScore === topScore)

  return tiedEntries.length > 1 ? tiedEntries : []
}

export function hasTopScoreTie(entries: CompareEntry[]) {
  return getTopScoreTiedEntries(entries).length > 1
}

export function isCompleteTiebreakSelection(
  tiedEntries: Pick<CompareEntry, 'scoreId'>[],
  placements: TiebreakPlacementMap
) {
  const tiedCount = tiedEntries.length

  if (tiedCount < 2) {
    return false
  }

  const selectedPlacements = tiedEntries.map((entry) => placements[entry.scoreId] ?? 0)

  if (selectedPlacements.some((value) => value < 1 || value > tiedCount)) {
    return false
  }

  return new Set(selectedPlacements).size === tiedCount
}

export function buildOrderedTiebreakScoreIds(placements: TiebreakPlacementMap) {
  return Object.entries(placements)
    .sort((left, right) => left[1] - right[1] || left[0].localeCompare(right[0]))
    .map(([scoreId]) => scoreId)
}
