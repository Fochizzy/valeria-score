export type HeadToHeadParticipantRow = {
  sessionId: string
  playerKey: string
  playerName: string
  playerType: 'user' | 'guest'
  publicPlayerId?: string | null
  totalScore: number
  updatedAt?: string | null
}

export type HeadToHeadRecord = {
  playerKey: string
  playerName: string
  playerType: 'user' | 'guest'
  publicPlayerId: string | null
  wins: number
  losses: number
  ties: number
  meetings: number
  avgMargin: number
  lastPlayedIso: string | null
}

function compareNumbers(a: number, b: number) {
  return a - b
}

export function aggregateHeadToHead(
  participants: HeadToHeadParticipantRow[],
  viewerPlayerKey: string
): HeadToHeadRecord[] {
  if (!viewerPlayerKey) return []

  // Group rows by sessionId
  const sessions = new Map<string, HeadToHeadParticipantRow[]>()
  for (const row of participants) {
    if (!row.sessionId || !row.playerKey) continue
    let bucket = sessions.get(row.sessionId)
    if (!bucket) {
      bucket = []
      sessions.set(row.sessionId, bucket)
    }
    bucket.push(row)
  }

  type Bucket = {
    playerKey: string
    playerName: string
    playerType: 'user' | 'guest'
    publicPlayerId: string | null
    wins: number
    losses: number
    ties: number
    marginSum: number
    lastPlayed: number
  }
  const opponents = new Map<string, Bucket>()

  sessions.forEach((rows) => {
    const viewerRow = rows.find((row) => row.playerKey === viewerPlayerKey)
    if (!viewerRow) return

    const viewerScore = Number(viewerRow.totalScore ?? 0)

    rows.forEach((other) => {
      if (other.playerKey === viewerPlayerKey) return

      const otherScore = Number(other.totalScore ?? 0)
      const margin = viewerScore - otherScore
      const updated = other.updatedAt ? Date.parse(other.updatedAt) : NaN

      let bucket = opponents.get(other.playerKey)
      if (!bucket) {
        bucket = {
          playerKey: other.playerKey,
          playerName:
            other.playerName ||
            (other.playerType === 'guest' ? 'Guest Player' : 'Player'),
          playerType: other.playerType,
          publicPlayerId: other.publicPlayerId ?? null,
          wins: 0,
          losses: 0,
          ties: 0,
          marginSum: 0,
          lastPlayed: 0,
        }
        opponents.set(other.playerKey, bucket)
      }

      if (other.playerName && !bucket.playerName) {
        bucket.playerName = other.playerName
      }
      if (other.publicPlayerId && !bucket.publicPlayerId) {
        bucket.publicPlayerId = other.publicPlayerId
      }

      if (margin > 0) bucket.wins += 1
      else if (margin < 0) bucket.losses += 1
      else bucket.ties += 1

      bucket.marginSum += margin

      if (Number.isFinite(updated) && updated > bucket.lastPlayed) {
        bucket.lastPlayed = updated
      }
    })
  })

  return Array.from(opponents.values())
    .map((bucket) => {
      const meetings = bucket.wins + bucket.losses + bucket.ties
      return {
        playerKey: bucket.playerKey,
        playerName: bucket.playerName,
        playerType: bucket.playerType,
        publicPlayerId: bucket.publicPlayerId,
        wins: bucket.wins,
        losses: bucket.losses,
        ties: bucket.ties,
        meetings,
        avgMargin: meetings > 0 ? bucket.marginSum / meetings : 0,
        lastPlayedIso:
          bucket.lastPlayed > 0 ? new Date(bucket.lastPlayed).toISOString() : null,
      }
    })
    .sort((a, b) => {
      if (b.meetings !== a.meetings) return compareNumbers(b.meetings, a.meetings)
      if (b.wins !== a.wins) return compareNumbers(b.wins, a.wins)
      return a.playerName.localeCompare(b.playerName)
    })
}
