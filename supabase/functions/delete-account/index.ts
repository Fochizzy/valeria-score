import { createClient } from 'npm:@supabase/supabase-js@2'
import { deleteAccountAndData } from './delete-account-service.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = user.id
    const admin = createClient(supabaseUrl, supabaseServiceRoleKey)

    await deleteAccountAndData(userId, {
      getOwnedInProgressSessionIds: async (safeUserId) => {
        const { data, error } = await admin.from('game_sessions').select('id').eq('created_by', safeUserId)

        if (error) throw error

        const sessionIds = (data ?? []).map((row: { id: string }) => row.id)

        if (sessionIds.length === 0) {
          return []
        }

        const { data: lockedRows, error: lockedError } = await admin
          .from('session_scores')
          .select('session_id')
          .in('session_id', sessionIds)
          .eq('game_locked', true)

        if (lockedError) throw lockedError

        const lockedSessionIds = new Set(
          (lockedRows ?? []).map((row: { session_id: string }) => row.session_id)
        )

        return sessionIds.filter((sessionId) => !lockedSessionIds.has(sessionId))
      },
      getOwnedGuestProfileIds: async (safeUserId) => {
        const { data, error } = await admin
          .from('guest_profiles')
          .select('id')
          .eq('owner_user_id', safeUserId)

        if (error) throw error

        return (data ?? []).map((row: { id: string }) => row.id)
      },
      deletePlayerScoresBySessionIds: async (sessionIds) => {
        const { error } = await admin.from('player_scores').delete().in('session_id', sessionIds)
        if (error) throw error
      },
      deleteSessionScoresBySessionIds: async (sessionIds) => {
        const { error } = await admin.from('session_scores').delete().in('session_id', sessionIds)
        if (error) throw error
      },
      deleteSessionPlayersBySessionIds: async (sessionIds) => {
        const { error } = await admin.from('session_players').delete().in('session_id', sessionIds)
        if (error) throw error
      },
      deleteGameSessionsByIds: async (sessionIds) => {
        const { error } = await admin.from('game_sessions').delete().in('id', sessionIds)
        if (error) throw error
      },
      deletePlayerScoresByGuestIds: async (guestIds) => {
        const { error } = await admin.from('player_scores').delete().in('guest_profile_id', guestIds)
        if (error) throw error
      },
      detachLockedSessionScoresByGuestIds: async (guestIds) => {
        const { error } = await admin
          .from('session_scores')
          .update({
            guest_profile_id: null,
            included_in_stats: false,
            updated_at: new Date().toISOString(),
          })
          .in('guest_profile_id', guestIds)
          .eq('game_locked', true)

        if (error) throw error
      },
      deleteUnlockedSessionScoresByGuestIds: async (guestIds) => {
        const { error } = await admin
          .from('session_scores')
          .delete()
          .in('guest_profile_id', guestIds)
          .or('game_locked.is.false,game_locked.is.null')

        if (error) throw error
      },
      deletePlayerScoresByUserId: async (safeUserId) => {
        const { error } = await admin.from('player_scores').delete().eq('user_id', safeUserId)
        if (error) throw error
      },
      deletePlayerScoresByOwnerUserId: async (safeUserId) => {
        const { error } = await admin.from('player_scores').delete().eq('owner_user_id', safeUserId)
        if (error) throw error
      },
      anonymizeLockedSessionScoresByOwnerUserId: async (safeUserId) => {
        const { error } = await admin
          .from('session_scores')
          .update({
            owner_user_id: null,
            player_name: null,
            recap_player_name: 'Mx. Doe',
            recap_player_id: 'Mx. Doe',
            included_in_stats: false,
            updated_at: new Date().toISOString(),
          })
          .eq('owner_user_id', safeUserId)
          .is('guest_profile_id', null)
          .is('guest_entry_id', null)
          .is('player_name', null)
          .eq('game_locked', true)

        if (error) throw error
      },
      deleteUnlockedSessionScoresByOwnerUserId: async (safeUserId) => {
        const { error } = await admin
          .from('session_scores')
          .delete()
          .eq('owner_user_id', safeUserId)
          .is('guest_profile_id', null)
          .is('guest_entry_id', null)
          .is('player_name', null)
          .or('game_locked.is.false,game_locked.is.null')

        if (error) throw error
      },
      deleteSessionPlayersByUserId: async (safeUserId) => {
        const { error } = await admin.from('session_players').delete().eq('user_id', safeUserId)
        if (error) throw error
      },
      unlinkGuestProfilesByLinkedUserId: async (safeUserId) => {
        const { error } = await admin
          .from('guest_profiles')
          .update({
            linked_user_id: null,
          })
          .eq('linked_user_id', safeUserId)

        if (error) throw error
      },
      deleteGuestProfilesByOwnerUserId: async (safeUserId) => {
        const { error } = await admin.from('guest_profiles').delete().eq('owner_user_id', safeUserId)
        if (error) throw error
      },
      deleteProfileById: async (safeUserId) => {
        const { error } = await admin.from('profiles').delete().eq('id', safeUserId)
        if (error) throw error
      },
      deleteAuthUserById: async (safeUserId) => {
        const { error } = await admin.auth.admin.deleteUser(safeUserId)
        if (error) throw error
      },
    })

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error'

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
