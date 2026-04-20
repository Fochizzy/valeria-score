import { supabase } from './supabase'
import { ensureProfileRow } from './profile'

export type InProgressSession = {
  id: string
  join_code: string
  created_at: string
  created_by: string
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

export const createGameSession = async () => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('User not authenticated')
  }

  await ensureProfileRow()

  const joinCode = await createUniqueJoinCode()

  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .insert({
      created_by: user.id,
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

export const getMyInProgressSessions = async (): Promise<InProgressSession[]> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('User not authenticated')
  }

  const { data: sessions, error: sessionsError } = await supabase
    .from('game_sessions')
    .select('id, join_code, created_at, created_by')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false })

  if (sessionsError) throw sessionsError

  const safeSessions =
    ((sessions ?? []) as Array<{
      id: string
      join_code: string
      created_at: string
      created_by: string
    }>) || []

  if (!safeSessions.length) return []

  const sessionIds = safeSessions.map((s) => s.id)

  const { data: scoreRows, error: scoreError } = await supabase
    .from('player_scores')
    .select('session_id, game_locked')
    .in('session_id', sessionIds)

  if (scoreError) throw scoreError

  const { data: playerRows, error: playerError } = await supabase
    .from('session_players')
    .select('session_id')
    .in('session_id', sessionIds)

  if (playerError) throw playerError

  const scoreMap = new Map<
    string,
    {
      total_entries: number
      locked_count: number
    }
  >()

  for (const row of (scoreRows ?? []) as Array<{ session_id: string; game_locked: boolean }>) {
    const current = scoreMap.get(row.session_id) ?? {
      total_entries: 0,
      locked_count: 0,
    }

    current.total_entries += 1
    if (row.game_locked) current.locked_count += 1

    scoreMap.set(row.session_id, current)
  }

  const playerCountMap = new Map<string, number>()
  for (const row of (playerRows ?? []) as Array<{ session_id: string }>) {
    playerCountMap.set(row.session_id, (playerCountMap.get(row.session_id) ?? 0) + 1)
  }

  const onlyInProgress = safeSessions.filter((session) => {
    const counts = scoreMap.get(session.id)
    if (!counts) return true
    if (counts.total_entries === 0) return true
    return counts.locked_count < counts.total_entries
  })

  return onlyInProgress.map((session) => {
    const counts = scoreMap.get(session.id) ?? {
      total_entries: 0,
      locked_count: 0,
    }

    return {
      ...session,
      player_count: playerCountMap.get(session.id) ?? 1,
      total_entries: counts.total_entries,
      locked_count: counts.locked_count,
    }
  })
}

export const deleteInProgressSession = async (sessionId: string) => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('User not authenticated')
  }

  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .select('id, created_by')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionError) throw sessionError
  if (!session) throw new Error('Session not found')

  if (session.created_by !== user.id) {
    throw new Error('Only the session creator can delete this in-progress session')
  }

  const { data: scores, error: scoreReadError } = await supabase
    .from('player_scores')
    .select('id, game_locked')
    .eq('session_id', sessionId)

  if (scoreReadError) throw scoreReadError

  const hasLockedScores = ((scores ?? []) as Array<{ id: string; game_locked: boolean }>).some(
    (row) => row.game_locked
  )

  if (hasLockedScores) {
    throw new Error(
      'This session already has locked scores. Use the game delete flow from Compare instead.'
    )
  }

  const { error: deleteScoresError } = await supabase
    .from('player_scores')
    .delete()
    .eq('session_id', sessionId)

  if (deleteScoresError) throw deleteScoresError

  const { error: deletePlayersError } = await supabase
    .from('session_players')
    .delete()
    .eq('session_id', sessionId)

  if (deletePlayersError) throw deletePlayersError

  const { error: deleteSessionError } = await supabase
    .from('game_sessions')
    .delete()
    .eq('id', sessionId)

  if (deleteSessionError) throw deleteSessionError
}