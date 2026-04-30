export type SessionScoreLockRow = {
  game_locked?: boolean | null
} | null

export type SessionScoreChangePayload = {
  old?: SessionScoreLockRow
  new?: SessionScoreLockRow
}

type ShouldAutoRouteToVictoryOnLockInput = {
  sessionId: string | null | undefined
  payload: SessionScoreChangePayload
  alreadyRouted?: boolean
}

export function didSessionScoreLock(payload: SessionScoreChangePayload) {
  return Boolean(payload.new?.game_locked) && !Boolean(payload.old?.game_locked)
}

export function shouldAutoRouteToVictoryOnLock({
  sessionId,
  payload,
  alreadyRouted = false,
}: ShouldAutoRouteToVictoryOnLockInput) {
  const safeSessionId = String(sessionId ?? '').trim()

  return Boolean(safeSessionId) && didSessionScoreLock(payload) && !alreadyRouted
}
