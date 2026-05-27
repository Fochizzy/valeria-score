import { supabase } from './supabase'
import { ensureProfileRow } from './profile'
import {
  buildSessionParticipationSummaries,
  filterInProgressSessions,
  mergeSessionIds,
  sortActiveSessionSummaries,
} from './session-participation-state.ts'
import { deleteInProgressSessionViaRpc } from './session-admin-flow.ts'
import { requireExpectedPlayerCount } from './expected-player-count'

export type InProgressSession = {
  id: string
  join_code: string
  created_at: string
  updated_at: string
  created_by: string
  expected_player_count: number | null
  is_host: boolean
  player_count: number
  locked_count: number
  total_entries: number
}

const generateJoinCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

const createUniqueJoinCode = async () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const joinCode = generateJoinCode()

    const { data: existing, error } = await supabase
      .from('game_sessions')
      .select('id')
      .eq('join_code', joinCode)
      .maybeSingle()

    if (error) throw error
    if (!existing) return joinCode
  }

  throw new Error('Could not generate a unique join code')
}

export const createGameSession = async (expectedPlayerCount: number | null | undefined) => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('User not authenticated')
  }

  await ensureProfileRow()

  const safeExpectedPlayerCount = requireExpectedPlayerCount(expectedPlayerCount)
  const joinCode = await createUniqueJoinCode()

  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .insert({
      created_by: user.id,
      expected_player_count: safeExpectedPlayerCount,
      join_code: joinCode,
    })
    .select()
    .single()

  if (sessionError) {
    console.error('Session error:', sessionError)
    throw new Error(sessionError.message)
  }

  const { data: existingSessionPlayer, error: existingPlayerReadError } = await supabase
    .from('session_players')
    .select('id, session_id, user_id')
    .eq('session_id', session.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingPlayerReadError) {
    console.error('Existing player read error:', existingPlayerReadError)
    throw new Error(existingPlayerReadError.message)
  }

  let player = existingSessionPlayer

  if (!player) {
    const { data: insertedPlayer, error: playerError } = await supabase
      .from('session_players')
      .insert({
        session_id: session.id,
        user_id: user.id,
      })
      .select()
      .single()

    if (playerError) {
      console.error('Player error:', playerError)
      throw new Error(playerError.message)
    }

    player = insertedPlayer
  }

  return {
    session,
    player,
  }
}

export const getMyActiveTables = async (): Promise<InProgressSession[]> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('User not authenticated')
  }

  const { data: hostedRows, error: hostedError } = await supabase
    .from('game_sessions')
    .select('id')
    .eq('created_by', user.id)

  if (hostedError) throw hostedError

  const { data: membershipRows, error: membershipError } = await supabase
    .from('session_players')
    .select('session_id')
    .eq('user_id', user.id)

  if (membershipError) throw membershipError

  const hostedSessionIds = ((hostedRows ?? []) as { id: string }[]).map((row) => row.id)
  const memberSessionIds = ((membershipRows ?? []) as { session_id: string }[]).map(
    (row) => row.session_id
  )
  const activeSessionIds = mergeSessionIds(hostedSessionIds, memberSessionIds)

  if (!activeSessionIds.length) return []

  const { data: sessions, error: sessionsError } = await supabase
    .from('game_sessions')
    .select('id, join_code, created_at, created_by, expected_player_count')
    .in('id', activeSessionIds)

  if (sessionsError) throw sessionsError

  const safeSessions =
    ((sessions ?? []) as {
      id: string
      join_code: string
      created_at: string
      created_by: string
      expected_player_count: number | null
    }[]) || []

  if (!safeSessions.length) return []

  const sessionIds = safeSessions.map((session) => session.id)

  const { data: scoreRows, error: scoreError } = await supabase
    .from('session_scores')
    .select('session_id, game_locked, updated_at')
    .in('session_id', sessionIds)

  if (scoreError) throw scoreError

  const { data: playerRows, error: playerError } = await supabase
    .from('session_players')
    .select('session_id')
    .in('session_id', sessionIds)

  if (playerError) throw playerError

  return sortActiveSessionSummaries(
    filterInProgressSessions(
      buildSessionParticipationSummaries({
        sessions: safeSessions,
        scoreRows: (scoreRows ?? []) as {
          session_id: string
          game_locked: boolean | null
          updated_at: string | null
        }[],
        playerRows: (playerRows ?? []) as { session_id: string }[],
        currentUserId: user.id,
      })
    )
  )
}

export const getMyInProgressSessions = async (): Promise<InProgressSession[]> => {
  return getMyActiveTables()
}

export const deleteInProgressSession = async (sessionId: string) => {
  await deleteInProgressSessionViaRpc(sessionId, {
    invokeRpc: async (fn, args) => supabase.rpc(fn, args),
  })
}
