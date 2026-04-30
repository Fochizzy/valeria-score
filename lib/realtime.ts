import { supabase } from './supabase.ts'
import { buildSessionActivityRealtimeSpecs } from './session-activity.ts'
import {
  didSessionScoreLock,
  shouldAutoRouteToVictoryOnLock,
  type SessionScoreChangePayload,
} from './session-score-lock.ts'

type Unsubscribe = () => void

function removeChannelSafe(channel: any) {
  try {
    supabase.removeChannel(channel)
  } catch {
    // ignore
  }
}

export function subscribeToSessionScores(
  sessionId: string,
  onChange: (payload: SessionScoreChangePayload) => void
): Unsubscribe {
  if (!sessionId) {
    return () => {}
  }

  const channel = supabase
    .channel(`session_scores:${sessionId}:${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'session_scores',
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => {
        onChange(payload as SessionScoreChangePayload)
      }
    )
    .subscribe()

  return () => {
    removeChannelSafe(channel)
  }
}

export function subscribeToPlayerScores(
  sessionId: string,
  onChange: () => void
): Unsubscribe {
  return subscribeToSessionScores(sessionId, () => {
    onChange()
  })
}

export function subscribeToSessionActivity(
  sessionId: string,
  onChange: () => void
): Unsubscribe {
  const specs = buildSessionActivityRealtimeSpecs(sessionId)

  if (specs.length === 0) {
    return () => {}
  }

  const channel = supabase.channel(`session_activity:${sessionId}:${Date.now()}`)

  for (const spec of specs) {
    channel.on('postgres_changes', spec, () => {
      onChange()
    })
  }

  channel.subscribe()

  return () => {
    removeChannelSafe(channel)
  }
}

export {
  didSessionScoreLock,
  shouldAutoRouteToVictoryOnLock,
  type SessionScoreChangePayload,
}
