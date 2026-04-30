type ResolveSessionRouteContextInput = {
  routeSessionId?: string | null
  storedSessionId?: string | null
  routeJoinCode?: string | null
  storedJoinCode?: string | null
}

function normalizeValue(value: string | null | undefined) {
  return String(value ?? '').trim()
}

export function resolveSessionRouteContext(input: ResolveSessionRouteContextInput) {
  const routeSessionId = normalizeValue(input.routeSessionId)
  const storedSessionId = normalizeValue(input.storedSessionId)
  const routeJoinCode = normalizeValue(input.routeJoinCode).toUpperCase()
  const storedJoinCode = normalizeValue(input.storedJoinCode).toUpperCase()

  return {
    sessionId: routeSessionId || storedSessionId || '',
    joinCode: routeJoinCode || storedJoinCode || '',
  }
}
