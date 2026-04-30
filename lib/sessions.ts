import AsyncStorage from '@react-native-async-storage/async-storage'
import { removeGuestCompareEntryWithAccessCheck } from './compare-guest-removal'
import { buildGuestSessionEntryPayload } from './guest-session-entry'
import { ensureProfileRow } from './profile'
import {
  addGuestPlayerToSessionWithAccessCheck,
  type AddGuestPlayerArgs,
  type GuestSessionEntry,
} from './session-guest-access'
import { supabase } from './supabase'

const ACTIVE_SESSION_ID_KEY = 'active_session_id'
const ACTIVE_JOIN_CODE_KEY = 'active_join_code'

export type GameSessionLookup = {
  id: string
  join_code: string
  created_by: string
}

export async function setActiveSessionId(sessionId: string) {
  await AsyncStorage.setItem(ACTIVE_SESSION_ID_KEY, sessionId)
}

export async function getActiveSessionId() {
  return AsyncStorage.getItem(ACTIVE_SESSION_ID_KEY)
}

export async function clearActiveSessionId() {
  await AsyncStorage.removeItem(ACTIVE_SESSION_ID_KEY)
}

export async function setActiveJoinCode(joinCode: string) {
  await AsyncStorage.setItem(ACTIVE_JOIN_CODE_KEY, joinCode)
}

export async function getActiveJoinCode() {
  return AsyncStorage.getItem(ACTIVE_JOIN_CODE_KEY)
}

export async function clearActiveJoinCode() {
  await AsyncStorage.removeItem(ACTIVE_JOIN_CODE_KEY)
}

export async function clearActiveSessionState() {
  await Promise.all([
    AsyncStorage.removeItem(ACTIVE_SESSION_ID_KEY),
    AsyncStorage.removeItem(ACTIVE_JOIN_CODE_KEY),
  ])
}

/**
 * Convenience: if the locally-saved active session id no longer points at a
 * row in `game_sessions`, wipe the local active state so the user isn't
 * stuck pointing at a dead session. Returns the (now-known-good) session id
 * if the row still exists, or null if it was missing and we cleared it.
 *
 * Callers that don't care about the difference between "no active session"
 * and "had one but it's gone" can just treat null as "no active session".
 */
export async function clearActiveSessionStateIfMissing(): Promise<string | null> {
  const storedSessionId = await getActiveSessionId()
  if (!storedSessionId) return null

  const stillLive = await doesSessionExist(storedSessionId)
  if (stillLive) return storedSessionId

  await clearActiveSessionState()
  return null
}

/**
 * Returns true if the session id still exists in the `game_sessions` table.
 * Used as a guard before insert paths whose FK to game_sessions(id) would
 * otherwise fail with a cryptic constraint error if the session was deleted
 * out from under us.
 *
 * Treats network/db errors as "exists" (we don't want a transient blip to
 * wipe the user's local state). Only a confirmed `null` row counts as gone.
 */
export async function doesSessionExist(sessionId: string): Promise<boolean> {
  const trimmed = sessionId.trim()
  if (!trimmed) return false

  const { data, error } = await supabase
    .from('game_sessions')
    .select('id')
    .eq('id', trimmed)
    .maybeSingle()

  if (error) {
    // Don't silently nuke local state on a transient error.
    return true
  }
  return data != null
}

export async function findSessionByJoinCode(joinCode: string): Promise<GameSessionLookup | null> {
  const normalizedCode = joinCode.trim().toUpperCase()

  if (!normalizedCode || normalizedCode.length !== 6) {
    throw new Error('Enter the 6-character join code.')
  }

  const { data, error } = await supabase
    .from('game_sessions')
    .select('id, join_code, created_by')
    .eq('join_code', normalizedCode)
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as GameSessionLookup | null
}

export async function ensureCurrentUserInSession(sessionId: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('User not authenticated')
  }

  await ensureProfileRow()

  const { data: existing, error: existingError } = await supabase
    .from('session_players')
    .select('id')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) return existing

  const { data, error } = await supabase
    .from('session_players')
    .insert({
      session_id: sessionId,
      user_id: user.id,
    })
    .select('id')
    .single()

  if (error) throw error
  return data
}

export async function joinSessionByCode(joinCode: string) {
  const session = await findSessionByJoinCode(joinCode)

  if (!session) {
    return null
  }

  await ensureCurrentUserInSession(session.id)

  await Promise.all([
    setActiveSessionId(session.id),
    setActiveJoinCode(session.join_code),
  ])

  return session
}

export async function addGuestPlayerToSession(
  sessionId: string,
  args: AddGuestPlayerArgs
) {
  return addGuestPlayerToSessionWithAccessCheck(sessionId, args, {
    getCurrentUserId: async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      return user?.id ?? null
    },
    isCurrentUserInSession: async (safeSessionId, currentUserId) => {
      const { data, error } = await supabase
        .from('session_players')
        .select('id')
        .eq('session_id', safeSessionId)
        .eq('user_id', currentUserId)
        .maybeSingle()

      if (error) {
        throw error
      }

      if (data) {
        return true
      }

      const { data: ownedSession, error: ownedSessionError } = await supabase
        .from('game_sessions')
        .select('id')
        .eq('id', safeSessionId)
        .eq('created_by', currentUserId)
        .maybeSingle()

      if (ownedSessionError) {
        throw ownedSessionError
      }

      return Boolean(ownedSession)
    },
    hasGuestProfileInSession: async (safeSessionId, guestProfileId) => {
      const { data, error } = await supabase
        .from('session_scores')
        .select('id')
        .eq('session_id', safeSessionId)
        .eq('guest_profile_id', guestProfileId)
        .limit(1)

      if (error) {
        throw error
      }

      return Array.isArray(data) && data.length > 0
    },
    getSessionParticipantCount: async (safeSessionId) => {
      const [sessionPlayersResult, guestScoresResult] = await Promise.all([
        supabase
          .from('session_players')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', safeSessionId),
        supabase
          .from('session_scores')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', safeSessionId)
          .not('guest_entry_id', 'is', null),
      ])

      if (sessionPlayersResult.error) {
        throw sessionPlayersResult.error
      }

      if (guestScoresResult.error) {
        throw guestScoresResult.error
      }

      return Number(sessionPlayersResult.count ?? 0) + Number(guestScoresResult.count ?? 0)
    },
    insertGuestEntry: async (payload) => {
      const { data, error } = await supabase
        .from('session_scores')
        .insert(
          buildGuestSessionEntryPayload({
            sessionId: payload.sessionId,
            ownerUserId: payload.ownerUserId,
            guestProfileId: payload.guestProfileId,
            displayName: payload.displayName,
          })
        )
        .select('id, guest_profile_id, guest_entry_id, player_name')
        .single()

      if (error) throw error
      return data as GuestSessionEntry
    },
  })
}

export async function removeGuestPlayerFromSession(
  sessionId: string,
  args: {
    scoreId: string
    removalMode: 'guest-entry' | 'added-player-entry'
    guestEntryId?: string | null
    ownerUserId?: string | null
    nextExpectedPlayerCount: number
  }
) {
  return removeGuestCompareEntryWithAccessCheck(
    {
      sessionId,
      scoreId: args.scoreId,
      removalMode: args.removalMode,
      guestEntryId: args.guestEntryId ?? null,
      ownerUserId: args.ownerUserId ?? null,
      nextExpectedPlayerCount: args.nextExpectedPlayerCount,
    },
    {
      getCurrentUserId: async () => {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error) {
          throw error
        }

        return user?.id ?? null
      },
      assertSessionCreatorAccess: async (safeSessionId, currentUserId) => {
        const { data, error } = await supabase
          .from('game_sessions')
          .select('id')
          .eq('id', safeSessionId)
          .eq('created_by', currentUserId)
          .maybeSingle()

        if (error) {
          throw error
        }

        if (!data) {
          throw new Error('Only the host can remove guests from this game.')
        }
      },
      deleteGuestScoreRow: async (filters) => {
        const { removalMode, sessionId: safeSessionId, scoreId } = filters
        const deleteQuery = supabase
          .from('session_scores')
          .delete()
          .eq('id', scoreId)
          .eq('session_id', safeSessionId)

        const scopedDeleteQuery =
          removalMode === 'guest-entry'
            ? deleteQuery.eq('guest_entry_id', filters.guestEntryId)
            : deleteQuery
                .eq('owner_user_id', filters.ownerUserId)
                .is('guest_entry_id', null)
                .is('guest_profile_id', null)
                .not('player_name', 'is', null)
                .neq('scored_by_user_id', filters.ownerUserId)

        const { data, error } = await scopedDeleteQuery.select('id').maybeSingle()

        if (error) {
          throw error
        }

        if (!data) {
          throw new Error('Unable to remove this guest from the game.')
        }
      },
      updateExpectedPlayerCount: async ({
        sessionId: safeSessionId,
        expectedPlayerCount,
        creatorUserId,
      }) => {
        const { data, error } = await supabase
          .from('game_sessions')
          .update({ expected_player_count: expectedPlayerCount })
          .eq('id', safeSessionId)
          .eq('created_by', creatorUserId)
          .select('expected_player_count')
          .maybeSingle()

        if (error) {
          throw error
        }

        if (!data) {
          throw new Error('Guest removed, but the table size could not be updated.')
        }
      },
    }
  )
}
