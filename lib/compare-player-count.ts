export const MIN_COMPARE_PLAYER_COUNT = 2
export const MAX_COMPARE_PLAYER_COUNT = 5

export function clampComparePlayerCount(value: number) {
  return Math.min(
    MAX_COMPARE_PLAYER_COUNT,
    Math.max(MIN_COMPARE_PLAYER_COUNT, Math.floor(value))
  )
}

export function normalizeComparePlayerCount(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null
  }

  return clampComparePlayerCount(value)
}
