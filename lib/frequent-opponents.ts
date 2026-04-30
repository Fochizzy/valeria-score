export type SessionParticipantRow = {
  sessionId: string
  playerKey: string
  playerName: string
  playerType: 'user' | 'guest'
  publicPlayerId?: string | null
}

export type FrequentOpponent = {
  playerKey: string
  playerName: string
  playerType: 'user' | 'guest'
  publicPlayerId: string | null
  sharedGames: number
}

export function aggregateFrequentOpponents(
  participants: SessionParticipantRow[],
  viewerPlayerKey: string,
  limit = 5
): FrequentOpponent[] {
  if (!viewerPlayerKey) return []

  const viewerSessions = new Set<string>()
  for (const row of participants) {
    if (row.playerKey === viewerPlayerKey && row.sessionId) {
      viewerSessions.add(row.sessionId)
    }
  }
  if (viewerSessions.size === 0) return []

  type Bucket = {
    playerKey: string
    playerName: string
    playerType: 'user' | 'guest'
    publicPlayerId: string | null
    sharedSessions: Set<string>
  }
  const byKey = new Map<string, Bucket>()

  for (const row of participants) {
    if (!row.playerKey || row.playerKey === viewerPlayerKey) continue
    if (!viewerSessions.has(row.sessionId)) continue

    const existing = byKey.get(row.playerKey)
    if (existing) {
      existing.sharedSessions.add(row.sessionId)
      // Prefer the most informative name we've seen.
      if (!existing.playerName && row.playerName) {
        existing.playerName = row.playerName
      }
      if (!existing.publicPlayerId && row.publicPlayerId) {
        existing.publicPlayerId = row.publicPlayerId
      }
    } else {
      byKey.set(row.playerKey, {
        playerKey: row.playerKey,
        playerName: row.playerName ?? '',
        playerType: row.playerType,
        publicPlayerId: row.publicPlayerId ?? null,
        sharedSessions: new Set([row.sessionId]),
      })
    }
  }

  return Array.from(byKey.values())
    .map((bucket) => ({
      playerKey: bucket.playerKey,
      playerName: bucket.playerName || (bucket.playerType === 'guest' ? 'Guest Player' : 'Player'),
      playerType: bucket.playerType,
      publicPlayerId: bucket.publicPlayerId,
      sharedGames: bucket.sharedSessions.size,
    }))
    .sort((a, b) => {
      if (b.sharedGames !== a.sharedGames) return b.sharedGames - a.sharedGames
      return a.playerName.localeCompare(b.playerName)
    })
    .slice(0, Math.max(0, limit))
}
