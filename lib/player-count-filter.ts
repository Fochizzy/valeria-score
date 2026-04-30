export type PlayerCountFilter = 'all' | '2' | '3' | '4plus'

export const PLAYER_COUNT_FILTERS: readonly PlayerCountFilter[] = [
  'all',
  '2',
  '3',
  '4plus',
] as const

export const PLAYER_COUNT_FILTER_LABEL: Record<PlayerCountFilter, string> = {
  all: 'Any',
  '2': '2P',
  '3': '3P',
  '4plus': '4P+',
}

export function matchesPlayerCountFilter(
  playerCount: number | null | undefined,
  filter: PlayerCountFilter
): boolean {
  if (filter === 'all') return true
  const count = Number(playerCount)
  if (!Number.isFinite(count) || count <= 0) return false
  if (filter === '2') return count === 2
  if (filter === '3') return count === 3
  if (filter === '4plus') return count >= 4
  return true
}
