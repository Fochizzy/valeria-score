import { cards } from '../data/cards.ts'
import {
  buildCardsLookup,
  buildPlayerCategoryStats,
  type GameCategorySource,
  type PlayerCategoryStats,
} from './score-category-breakdown.ts'
import { supabase } from './supabase.ts'

import { parsePlayerKey, type PlayerKeyParts } from './player-key.ts'

export { parsePlayerKey, type PlayerKeyParts }

type PlayerScoreRow = {
  session_id: string
  duke_slug: string | null
  score_total: number | null
  inputs: unknown
  owner_user_id: string | null
  guest_profile_id: string | null
}

type PeerScoreRow = {
  session_id: string
  score_total: number | null
}

const cardsLookup = buildCardsLookup(cards)

function emptyStats(): PlayerCategoryStats {
  return buildPlayerCategoryStats([], cardsLookup)
}

export async function loadPlayerCategoryStats(
  playerKey: string | null | undefined
): Promise<PlayerCategoryStats> {
  const parts = parsePlayerKey(playerKey)
  if (!parts) return emptyStats()

  let playerQuery = supabase
    .from('session_scores')
    .select(
      'session_id, duke_slug, score_total, inputs, owner_user_id, guest_profile_id'
    )
    .eq('game_locked', true)
    .not('duke_slug', 'is', null)
    .neq('duke_slug', 'no-duke-selected')

  if (parts.type === 'user') {
    playerQuery = playerQuery
      .eq('owner_user_id', parts.userId)
      .is('guest_profile_id', null)
  } else {
    playerQuery = playerQuery.eq('guest_profile_id', parts.guestProfileId)
  }

  const { data: playerRowsRaw, error: playerErr } = await playerQuery
  if (playerErr) throw playerErr

  const playerRows = (playerRowsRaw ?? []) as PlayerScoreRow[]
  if (playerRows.length === 0) return emptyStats()

  const sessionIds = Array.from(
    new Set(playerRows.map((row) => row.session_id).filter(Boolean))
  )

  const { data: peerRowsRaw, error: peerErr } = await supabase
    .from('session_scores')
    .select('session_id, score_total')
    .in('session_id', sessionIds)
    .eq('game_locked', true)

  if (peerErr) throw peerErr

  const peerRows = (peerRowsRaw ?? []) as PeerScoreRow[]
  const maxScoreBySession = new Map<string, number>()
  for (const peer of peerRows) {
    const sessionId = String(peer.session_id ?? '')
    if (!sessionId) continue
    const score = Number(peer.score_total ?? 0)
    const current = maxScoreBySession.get(sessionId)
    if (current === undefined || score > current) {
      maxScoreBySession.set(sessionId, score)
    }
  }

  const games: GameCategorySource[] = []
  for (const row of playerRows) {
    const dukeSlug = typeof row.duke_slug === 'string' ? row.duke_slug.trim() : ''
    if (!dukeSlug) continue

    const myScore = Number(row.score_total ?? 0)
    const sessionMax = maxScoreBySession.get(String(row.session_id)) ?? myScore
    const isWinner = myScore > 0 && myScore >= sessionMax

    games.push({
      duke_slug: dukeSlug,
      inputs: (row.inputs ?? {}) as Partial<Record<string, number>> as never,
      is_winner: isWinner,
    })
  }

  return buildPlayerCategoryStats(games, cardsLookup)
}
