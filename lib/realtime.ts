import { supabase } from './supabase'

type Unsubscribe = () => void

function removeChannelSafe(channel: any) {
  try {
    supabase.removeChannel(channel)
  } catch {
    // ignore
  }
}

export function subscribeToPlayerScores(
  sessionId: string,
  onChange: () => void
): Unsubscribe {
  if (!sessionId) {
    return () => {}
  }

  const channel = supabase
    .channel(`player_scores:${sessionId}:${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'player_scores',
        filter: `session_id=eq.${sessionId}`,
      },
      () => {
        onChange()
      }
    )
    .subscribe()

  return () => {
    removeChannelSafe(channel)
  }
}