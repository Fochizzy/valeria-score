import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  buildFinishedGamePushes,
  chunkPushes,
  EXPO_PUSH_ENDPOINT,
  selectRecipientUserIds,
} from './notify-service.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
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
      return jsonResponse({ error: 'Missing Authorization header' }, 401)
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
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const { sessionId } = await req.json().catch(() => ({}))

    if (typeof sessionId !== 'string' || !sessionId) {
      return jsonResponse({ error: 'Missing sessionId' }, 400)
    }

    const admin = createClient(supabaseUrl, supabaseServiceRoleKey)

    const { data: session, error: sessionError } = await admin
      .from('game_sessions')
      .select('id, join_code, created_by')
      .eq('id', sessionId)
      .maybeSingle()

    if (sessionError || !session) {
      return jsonResponse({ error: 'Session not found' }, 404)
    }

    const { data: seatRows, error: seatError } = await admin
      .from('session_scores')
      .select('owner_user_id, scored_by_user_id, game_locked')
      .eq('session_id', sessionId)

    if (seatError) {
      return jsonResponse({ error: seatError.message }, 500)
    }

    // Only players at this table (or its creator) may trigger notifications.
    const callerIsParticipant =
      session.created_by === user.id ||
      (seatRows ?? []).some(
        (row) =>
          row.owner_user_id === user.id || row.scored_by_user_id === user.id
      )

    if (!callerIsParticipant) {
      return jsonResponse({ error: 'Not a participant of this session' }, 403)
    }

    // The game must actually be finished before anyone can push about it.
    const gameIsFinished = (seatRows ?? []).some((row) => row.game_locked)

    if (!gameIsFinished) {
      return jsonResponse({ error: 'Game is not finished' }, 409)
    }

    // Idempotency: the first caller claims notified_at atomically; every
    // repeat call (double-tap, direct endpoint hit) becomes a no-op.
    const { data: claimed, error: claimError } = await admin
      .from('game_sessions')
      .update({ notified_at: new Date().toISOString() })
      .eq('id', sessionId)
      .is('notified_at', null)
      .select('id')

    if (claimError) {
      return jsonResponse({ error: claimError.message }, 500)
    }

    if (!claimed || claimed.length === 0) {
      return jsonResponse({ sent: 0, alreadyNotified: true }, 200)
    }

    const recipients = selectRecipientUserIds(
      (seatRows ?? []).map((row) => row.owner_user_id),
      user.id
    )

    if (recipients.length === 0) {
      return jsonResponse({ sent: 0 }, 200)
    }

    const { data: tokenRows, error: tokenError } = await admin
      .from('push_tokens')
      .select('token, user_id')
      .in('user_id', recipients)

    if (tokenError) {
      return jsonResponse({ error: tokenError.message }, 500)
    }

    const pushes = buildFinishedGamePushes(tokenRows ?? [], {
      sessionId,
      joinCode: String(session.join_code ?? ''),
    })

    let sent = 0

    for (const chunk of chunkPushes(pushes)) {
      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      })

      if (response.ok) {
        sent += chunk.length
      }
    }

    return jsonResponse({ sent }, 200)
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
})
