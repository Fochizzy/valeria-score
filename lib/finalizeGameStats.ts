import { supabase } from './supabase'

type PlayerScoreRow = {
  id: string
  total_score: number | null
}

export async function finalizeGameStats(sessionId: string) {
  if (!sessionId) {
    throw new Error('Missing session ID')
  }

  const { data, error } = await supabase
    .from('player_scores')
    .select('id, total_score')
    .eq('session_id', sessionId)

  if (error) throw error

  const rows = ((data ?? []) as PlayerScoreRow[])
    .map((row) => ({
      id: row.id,
      total_score: Number(row.total_score ?? 0),
    }))
    .sort((a, b) => b.total_score - a.total_score)

  if (rows.length === 0) {
    throw new Error('No scores found for this session')
  }

  let currentPlacement = 1

  for (let i = 0; i < rows.length; i += 1) {
    if (i > 0 && rows[i].total_score < rows[i - 1].total_score) {
      currentPlacement = i + 1
    }

    const { error: updateError } = await supabase
      .from('player_scores')
      .update({
        placement: currentPlacement,
        is_winner: currentPlacement === 1,
        game_locked: true,
        included_in_stats: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rows[i].id)

    if (updateError) throw updateError
  }
}