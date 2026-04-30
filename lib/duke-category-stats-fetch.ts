import { cards } from '../data/cards.ts'
import {
  matchesPlayerCountFilter,
  type PlayerCountFilter,
} from './player-count-filter.ts'
import {
  buildCardsLookup,
  buildPlayerCategoryStats,
  type GameCategorySource,
  type PlayerCategoryStats,
} from './score-category-breakdown.ts'
import { supabase } from './supabase.ts'

const cardsLookup = buildCardsLookup(cards)

type RawScoreRow = {
  id: string
  session_id: string | null
  duke_slug: string | null
  inputs: unknown
  score_total: number | null
  owner_user_id: string | null
  guest_profile_id: string | null
  updated_at: string | null
}

type PeerRow = {
  id: string
  session_id: string | null
  score_total: number | null
  owner_user_id: string | null
  guest_profile_id: string | null
  updated_at: string | null
}

function emptyStats(): PlayerCategoryStats {
  return buildPlayerCategoryStats([], cardsLookup)
}

export async function loadDukeCategoryStats(
  dukeSlug: string,
  filter: PlayerCountFilter = 'all'
): Promise<PlayerCategoryStats> {
  if (!dukeSlug) return emptyStats()

  const { data: rowsRaw, error } = await supabase
    .from('session_scores')
    .select(
      'id, session_id, duke_slug, inputs, score_total, owner_user_id, guest_profile_id, updated_at'
    )
    .eq('game_locked', true)
    .eq('duke_slug', dukeSlug)
    .neq('duke_slug', 'no-duke-selected')

  if (error) throw error
  const rows = (rowsRaw ?? []) as RawScoreRow[]
  if (rows.length === 0) return emptyStats()

  const sessionIds = Array.from(
    new Set(rows.map((row) => row.session_id ?? '').filter(Boolean))
  )

  const peerLookup = new Map<string, PeerRow[]>()
  if (sessionIds.length > 0) {
    const { data: peerRowsRaw, error: peerErr } = await supabase
      .from('session_scores')
      .select(
        'id, session_id, score_total, owner_user_id, guest_profile_id, updated_at'
      )
      .in('session_id', sessionIds)
      .eq('game_locked', true)
    if (peerErr) throw peerErr
    const peerRows = (peerRowsRaw ?? []) as PeerRow[]

    for (const peer of peerRows) {
      const sessionId = peer.session_id ?? ''
      if (!sessionId) continue
      let bucket = peerLookup.get(sessionId)
      if (!bucket) {
        bucket = []
        peerLookup.set(sessionId, bucket)
      }
      bucket.push(peer)
    }
  }

  const games: GameCategorySource[] = []
  for (const row of rows) {
    const sessionId = row.session_id ?? ''
    const peers = peerLookup.get(sessionId) ?? []

    // Distinct participant count by player_key for player-count filter.
    const distinctKeys = new Set<string>()
    for (const peer of peers) {
      const key = peer.guest_profile_id
        ? `guest:${peer.guest_profile_id}`
        : peer.owner_user_id
        ? `user:${peer.owner_user_id}`
        : null
      if (key) distinctKeys.add(key)
    }
    const playerCount = distinctKeys.size
    if (!matchesPlayerCountFilter(playerCount, filter)) continue

    // Determine win: viewer's row had the highest total score in its session
    // (using the same tiebreaker as session_score_results: lower updated_at wins ties).
    const sorted = [...peers].sort((a, b) => {
      const sa = Number(a.score_total ?? 0)
      const sb = Number(b.score_total ?? 0)
      if (sb !== sa) return sb - sa
      const ua = a.updated_at ? Date.parse(a.updated_at) : 0
      const ub = b.updated_at ? Date.parse(b.updated_at) : 0
      return ua - ub
    })
    const isWinner = sorted.length > 0 && sorted[0].id === row.id

    games.push({
      duke_slug: row.duke_slug ?? '',
      inputs: row.inputs as never,
      is_winner: isWinner,
    })
  }

  return buildPlayerCategoryStats(games, cardsLookup)
}
