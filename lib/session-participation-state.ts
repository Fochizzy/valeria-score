export type SessionMembershipBaseRow = {
  id: string
  join_code: string
  created_at: string
  created_by: string
  expected_player_count?: number | null
}

export type SessionParticipationScoreRow = {
  session_id: string
  game_locked: boolean | null
  updated_at: string | null
}

export type SessionParticipationPlayerRow = {
  session_id: string
}

export type SessionParticipationSummary = {
  id: string
  join_code: string
  created_at: string
  updated_at: string
  created_by: string
  expected_player_count: number | null
  is_host: boolean
  player_count: number
  total_entries: number
  locked_count: number
}

export function mergeSessionIds(hostedSessionIds: string[], joinedSessionIds: string[]) {
  return [...new Set([...hostedSessionIds, ...joinedSessionIds].filter(Boolean))]
}

export function buildSessionParticipationSummaries(input: {
  sessions: SessionMembershipBaseRow[]
  scoreRows: SessionParticipationScoreRow[]
  playerRows: SessionParticipationPlayerRow[]
  currentUserId: string
}) {
  const scoreMap = new Map<
    string,
    {
      total_entries: number
      locked_count: number
      updated_at: string | null
    }
  >()

  for (const row of input.scoreRows) {
    const current = scoreMap.get(row.session_id) ?? {
      total_entries: 0,
      locked_count: 0,
      updated_at: null,
    }

    current.total_entries += 1
    if (row.game_locked) current.locked_count += 1

    if (row.updated_at && (!current.updated_at || row.updated_at > current.updated_at)) {
      current.updated_at = row.updated_at
    }

    scoreMap.set(row.session_id, current)
  }

  const playerCountMap = new Map<string, number>()
  for (const row of input.playerRows) {
    playerCountMap.set(row.session_id, (playerCountMap.get(row.session_id) ?? 0) + 1)
  }

  return input.sessions
    .map((session) => {
      const counts = scoreMap.get(session.id) ?? {
        total_entries: 0,
        locked_count: 0,
        updated_at: null,
      }

      return {
        ...session,
        expected_player_count: session.expected_player_count ?? null,
        updated_at: counts.updated_at ?? session.created_at,
        is_host: session.created_by === input.currentUserId,
        player_count: playerCountMap.get(session.id) ?? 1,
        total_entries: counts.total_entries,
        locked_count: counts.locked_count,
      }
    })
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
}

export function sortActiveSessionSummaries(rows: SessionParticipationSummary[]) {
  return [...rows].sort((left, right) => {
    if (left.is_host !== right.is_host) {
      return left.is_host ? -1 : 1
    }

    return right.updated_at.localeCompare(left.updated_at)
  })
}

export function filterInProgressSessions(rows: SessionParticipationSummary[]) {
  return rows.filter((row) => row.total_entries === 0 || row.locked_count < row.total_entries)
}

export function filterCompletedSessions(rows: SessionParticipationSummary[]) {
  return rows.filter((row) => row.total_entries > 0 && row.locked_count === row.total_entries)
}
