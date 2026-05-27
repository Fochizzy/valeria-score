const BLOCKED_ACTIVE_SESSION_VICTORY_PATHS = [
  '/login',
  '/create-user',
  '/reset-password',
  '/choose-player-id',
  '/create-session',
  '/join-game',
  '/victory',
] as const

type ActiveSessionVictoryPathInput = {
  pathname: string | null | undefined
  sessionId: string | null | undefined
  alreadyRoutedSessionId?: string | null | undefined
}

type ActiveSessionVictoryRouteInput = ActiveSessionVictoryPathInput & {
  totalEntries: number | null | undefined
  lockedEntries: number | null | undefined
}

export function shouldAllowActiveSessionVictoryRoute({
  pathname,
  sessionId,
  alreadyRoutedSessionId = null,
}: ActiveSessionVictoryPathInput) {
  const safePathname = String(pathname ?? '').trim()
  const safeSessionId = String(sessionId ?? '').trim()
  const safeAlreadyRoutedSessionId = String(alreadyRoutedSessionId ?? '').trim()

  if (!safeSessionId) return false
  if (safeAlreadyRoutedSessionId && safeAlreadyRoutedSessionId === safeSessionId) {
    return false
  }
  if (!safePathname || safePathname === '/') {
    return false
  }

  return !BLOCKED_ACTIVE_SESSION_VICTORY_PATHS.some((blockedPath) =>
    safePathname.startsWith(blockedPath)
  )
}

export function shouldAutoRouteActiveSessionToVictory({
  pathname,
  sessionId,
  totalEntries,
  lockedEntries,
  alreadyRoutedSessionId = null,
}: ActiveSessionVictoryRouteInput) {
  if (
    !shouldAllowActiveSessionVictoryRoute({
      pathname,
      sessionId,
      alreadyRoutedSessionId,
    })
  ) {
    return false
  }

  const safeTotalEntries = Number.isFinite(totalEntries) ? Number(totalEntries) : 0
  const safeLockedEntries = Number.isFinite(lockedEntries) ? Number(lockedEntries) : 0

  return safeTotalEntries > 0 && safeLockedEntries >= safeTotalEntries
}
