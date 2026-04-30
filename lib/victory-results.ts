import type { CompareEntry } from './compare-entries.ts'

export function resolveVictoryWinner(entries: CompareEntry[]) {
  const scoredEntries = entries.filter((entry) => entry.hasScore)

  return (
    scoredEntries.find((entry) => entry.isWinner) ??
    scoredEntries.find((entry) => entry.placement === 1) ??
    scoredEntries[0] ??
    null
  )
}

export function buildResultsShareMessage(entries: CompareEntry[]) {
  const lines = entries
    .filter((entry) => entry.hasScore)
    .map((entry, index) => {
      const crown = entry.isWinner || index === 0 ? '👑 ' : ''
      const idText = entry.playerId ? ` (${entry.playerId})` : ''
      const rankText = entry.placement ? `${entry.placement}. ` : `${index + 1}. `

      return `${rankText}${crown}${entry.label}${idText} - ${entry.totalScore} - ${entry.dukeName}`
    })

  return ['Valeria Results', '', ...lines].join('\n')
}
