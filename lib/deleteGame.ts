import { supabase } from './supabase'

export async function deleteEntireSession(sessionId: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('No authenticated user')
  }

  const { data: session, error: sessionError } = await supabase
    .from('game_sessions')
    .select('id, created_by')
    .eq('id', sessionId)
    .maybeSingle()

  if (sessionError) throw sessionError
  if (!session) throw new Error('Session not found')

  if (session.created_by !== user.id) {
    throw new Error('Only the session creator can delete the entire game')
  }

  const { error } = await supabase
    .from('game_sessions')
    .delete()
    .eq('id', sessionId)

  if (error) throw error
}

export async function deleteMyParticipation(sessionId: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('No authenticated user')
  }

  const { error: scoresError } = await supabase
    .from('player_scores')
    .delete()
    .eq('session_id', sessionId)
    .or(`user_id.eq.${user.id},owner_user_id.eq.${user.id}`)

  if (scoresError) throw scoresError

  const { error: sessionPlayersError } = await supabase
    .from('session_players')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_id', user.id)

  if (sessionPlayersError) throw sessionPlayersError
}