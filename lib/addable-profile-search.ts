// Phase 2 wrapper around the search_addable_profiles + add_player_to_session
// RPCs. Both run SECURITY DEFINER on the server because regular users can't
// freely scan other profiles via RLS.

import { supabase } from './supabase'

export type AddableProfileKind = 'guest' | 'player'

export type AddableProfile = {
  kind: AddableProfileKind
  refId: string
  displayName: string
  publicPlayerId: string | null
}

type RawSearchRow = {
  kind: AddableProfileKind
  ref_id: string
  display_name: string | null
  public_player_id: string | null
}

export async function searchAddableProfiles(
  query: string,
  sessionId: string
): Promise<AddableProfile[]> {
  const trimmed = query.trim()
  if (!trimmed) return []
  if (!sessionId) return []

  const { data, error } = await supabase.rpc('search_addable_profiles', {
    p_query: trimmed,
    p_session_id: sessionId,
  })

  if (error) throw error

  return ((data ?? []) as RawSearchRow[]).map((row) => ({
    kind: row.kind,
    refId: row.ref_id,
    displayName: row.display_name?.trim() || '',
    publicPlayerId: row.public_player_id ?? null,
  }))
}

export type AddPlayerToSessionResult = {
  scoreId: string
  sessionId: string
  targetUserId: string
  displayName: string
  publicPlayerId: string | null
}

type RawAddPlayerResult = {
  score_id: string
  session_id: string
  target_user_id: string
  display_name: string | null
  public_player_id: string | null
}

/**
 * Adds a registered player profile to a session, but only after the target
 * player verifies their identity by entering their password. The password
 * is bcrypt-checked server-side against auth.users.encrypted_password — it
 * never establishes a session for the target user.
 */
export async function addPlayerToSession(
  sessionId: string,
  targetUserId: string,
  targetPassword: string
): Promise<AddPlayerToSessionResult> {
  if (!sessionId) throw new Error('Missing session id')
  if (!targetUserId) throw new Error('Missing target player')
  if (!targetPassword) throw new Error('Password is required to add this player.')

  const { data, error } = await supabase.rpc('add_player_to_session_verified', {
    p_session_id: sessionId,
    p_target_user_id: targetUserId,
    p_target_password: targetPassword,
  })

  if (error) throw error
  if (!data) throw new Error('Add player returned no payload')

  const result = data as RawAddPlayerResult
  return {
    scoreId: result.score_id,
    sessionId: result.session_id,
    targetUserId: result.target_user_id,
    displayName: result.display_name?.trim() || '',
    publicPlayerId: result.public_player_id ?? null,
  }
}
