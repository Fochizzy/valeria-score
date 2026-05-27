export const EXPECTED_PLAYER_OPTIONS = [2, 3, 4, 5] as const

export type ExpectedPlayerOption = (typeof EXPECTED_PLAYER_OPTIONS)[number]

const MIN_EXPECTED_PLAYER_COUNT = EXPECTED_PLAYER_OPTIONS[0]
const MAX_EXPECTED_PLAYER_COUNT = EXPECTED_PLAYER_OPTIONS[EXPECTED_PLAYER_OPTIONS.length - 1]

export function clampExpectedPlayerCount(value: number | null | undefined) {
  const safeValue = Number(value)
  if (!Number.isFinite(safeValue)) return MIN_EXPECTED_PLAYER_COUNT
  return Math.min(
    MAX_EXPECTED_PLAYER_COUNT,
    Math.max(MIN_EXPECTED_PLAYER_COUNT, Math.round(safeValue))
  )
}

export function isExpectedPlayerOption(
  value: number | null | undefined
): value is ExpectedPlayerOption {
  return EXPECTED_PLAYER_OPTIONS.includes(Number(value) as ExpectedPlayerOption)
}

export function requireExpectedPlayerCount(
  value: number | null | undefined
): ExpectedPlayerOption {
  if (!isExpectedPlayerOption(value)) {
    throw new Error('Select how many players are expected before starting the game.')
  }

  return value
}
