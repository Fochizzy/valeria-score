export const TURN_TRACKER_MIN_SEATS = 2
export const TURN_TRACKER_MAX_SEATS = 5
export const TURN_TRACKER_DEFAULT_SEATS = 4

export type TurnTrackerState = {
  round: number
  firstSeat: number
  seatCount: number
}

export function buildTurnTrackerStorageKey(sessionId: string): string {
  return `turn-tracker:${sessionId}`
}

export function createInitialTurnTrackerState(
  seatCount = TURN_TRACKER_DEFAULT_SEATS
): TurnTrackerState {
  return {
    round: 1,
    firstSeat: 1,
    seatCount: clampSeatCount(seatCount),
  }
}

export function clampSeatCount(count: number): number {
  if (!Number.isFinite(count)) return TURN_TRACKER_DEFAULT_SEATS

  return Math.min(TURN_TRACKER_MAX_SEATS, Math.max(TURN_TRACKER_MIN_SEATS, Math.floor(count)))
}

/**
 * A new round passes the first-player token to the left.
 */
export function advanceRound(state: TurnTrackerState): TurnTrackerState {
  return {
    ...state,
    round: state.round + 1,
    firstSeat: (state.firstSeat % state.seatCount) + 1,
  }
}

export function rewindRound(state: TurnTrackerState): TurnTrackerState {
  if (state.round <= 1) {
    return state
  }

  return {
    ...state,
    round: state.round - 1,
    firstSeat: ((state.firstSeat - 2 + state.seatCount) % state.seatCount) + 1,
  }
}

export function cycleSeatCount(state: TurnTrackerState): TurnTrackerState {
  const nextCount =
    state.seatCount >= TURN_TRACKER_MAX_SEATS
      ? TURN_TRACKER_MIN_SEATS
      : state.seatCount + 1

  return {
    ...state,
    seatCount: nextCount,
    firstSeat: Math.min(state.firstSeat, nextCount),
  }
}

export function parseTurnTrackerState(raw: string | null): TurnTrackerState | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)

    if (
      typeof parsed?.round !== 'number' ||
      typeof parsed?.firstSeat !== 'number' ||
      typeof parsed?.seatCount !== 'number'
    ) {
      return null
    }

    const seatCount = clampSeatCount(parsed.seatCount)

    return {
      round: Math.max(1, Math.floor(parsed.round)),
      firstSeat: Math.min(seatCount, Math.max(1, Math.floor(parsed.firstSeat))),
      seatCount,
    }
  } catch {
    return null
  }
}
