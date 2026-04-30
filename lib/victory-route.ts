export function buildVictoryRoute(sessionId: string, joinCode = '') {
  return {
    pathname: '/victory' as const,
    params: {
      sessionId,
      joinCode,
    },
  }
}
