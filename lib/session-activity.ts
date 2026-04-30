export type SessionActivityRealtimeSpec = {
  event: '*'
  schema: 'public'
  table: 'session_scores' | 'session_players' | 'game_sessions'
  filter: string
}

export function buildSessionActivityRealtimeSpecs(sessionId: string) {
  const safeSessionId = String(sessionId ?? '').trim()

  if (!safeSessionId) {
    return [] as SessionActivityRealtimeSpec[]
  }

  return [
    {
      event: '*',
      schema: 'public',
      table: 'session_scores',
      filter: `session_id=eq.${safeSessionId}`,
    },
    {
      event: '*',
      schema: 'public',
      table: 'session_players',
      filter: `session_id=eq.${safeSessionId}`,
    },
    {
      event: '*',
      schema: 'public',
      table: 'game_sessions',
      filter: `id=eq.${safeSessionId}`,
    },
  ] satisfies SessionActivityRealtimeSpec[]
}
