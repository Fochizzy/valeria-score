// supabase/functions/delete-account/index.ts
import { createClient } from 'npm:@supabase/supabase-js@2'

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

    // Client scoped to caller JWT
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

    // Admin client
    const admin = createClient(supabaseUrl, supabaseServiceRoleKey)

    // 1) Find sessions created by this user
    const { data: ownedSessions, error: ownedSessionsError } = await admin
      .from('game_sessions')
      .select('id')
      .eq('created_by', userId)

    if (ownedSessionsError) throw ownedSessionsError

    const ownedSessionIds = (ownedSessions ?? []).map((row: { id: string }) => row.id)

    // 2) Delete scores tied to those owned sessions
    if (ownedSessionIds.length > 0) {
      const { error: ownedScoresDeleteError } = await admin
        .from('player_scores')
        .delete()
        .in('session_id', ownedSessionIds)

      if (ownedScoresDeleteError) throw ownedScoresDeleteError

      const { error: ownedPlayersDeleteError } = await admin
        .from('session_players')
        .delete()
        .in('session_id', ownedSessionIds)

      if (ownedPlayersDeleteError) throw ownedPlayersDeleteError

      const { error: ownedSessionsDeleteError } = await admin
        .from('game_sessions')
        .delete()
        .in('id', ownedSessionIds)

      if (ownedSessionsDeleteError) throw ownedSessionsDeleteError
    }

    // 3) Delete user scores and guest-created scores
    const { error: userScoresError } = await admin
      .from('player_scores')
      .delete()
      .eq('user_id', userId)

    if (userScoresError) throw userScoresError

    const { error: guestScoresError } = await admin
      .from('player_scores')
      .delete()
      .eq('owner_user_id', userId)

    if (guestScoresError) throw guestScoresError

    // 4) Delete joined player rows
    const { error: sessionPlayersError } = await admin
      .from('session_players')
      .delete()
      .eq('user_id', userId)

    if (sessionPlayersError) throw sessionPlayersError

    // 5) Delete guest profiles owned by this user
    const { error: guestProfilesError } = await admin
      .from('guest_profiles')
      .delete()
      .eq('owner_user_id', userId)

    if (guestProfilesError) throw guestProfilesError

    // 6) Delete profile row
    const { error: profileError } = await admin
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) throw profileError

    // 7) Delete auth user
    const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId)
    if (deleteUserError) throw deleteUserError

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: err?.message ?? 'Unknown server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})