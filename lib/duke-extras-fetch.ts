import { cards } from '../data/cards.ts'
import { computeDukeInputMix, type DukeInputMixEntry } from './duke-input-mix.ts'
import { computeDukeVolatility, type DukeVolatilityEntry } from './duke-volatility.ts'
import {
  matchesPlayerCountFilter,
  type PlayerCountFilter,
} from './player-count-filter.ts'
import { buildCardsLookup } from './score-category-breakdown.ts'
import { supabase } from './supabase.ts'

const cardsLookup = buildCardsLookup(cards)

type RawScoreRow = {
  session_id: string | null
  duke_slug: string | null
  inputs: unknown
  score_total: number | null
  owner_user_id: string | null
  guest_profile_id: string | null
}

type SessionRow = { session_id: string }

export type DukeExtras = {
  inputMix: DukeInputMixEntry[]
  volatility: DukeVolatilityEntry[]
  totalGames: number
}

export async function loadDukeExtras(
  filter: PlayerCountFilter = 'all'
): Promise<DukeExtras> {
  const { data: rowsRaw, error } = await supabase
    .from('session_scores')
    .select(
      'session_id, duke_slug, inputs, score_total, owner_user_id, guest_profile_id'
    )
    .eq('game_locked', true)
    .not('duke_slug', 'is', null)
    .neq('duke_slug', 'no-duke-selected')

  if (error) throw error
  const rows = (rowsRaw ?? []) as RawScoreRow[]
  if (rows.length === 0) {
    return { inputMix: [], volatility: [], totalGames: 0 }
  }

  // Compute distinct participant count per session for player_count filtering.
  const participantsBySession = new Map<string, Set<string>>()
  for (const row of rows) {
    const sessionId = row.session_id ?? ''
    if (!sessionId) continue
    const key = row.guest_profile_id
      ? `guest:${row.guest_profile_id}`
      : row.owner_user_id
      ? `user:${row.owner_user_id}`
      : null
    if (!key) continue
    let bucket = participantsBySession.get(sessionId)
    if (!bucket) {
      bucket = new Set()
      participantsBySession.set(sessionId, bucket)
    }
    bucket.add(key)
  }

  const filteredRows = rows.filter((row) => {
    const sessionId = row.session_id ?? ''
    const count = participantsBySession.get(sessionId)?.size ?? 0
    return matchesPlayerCountFilter(count, filter)
  })

  const inputMix = computeDukeInputMix(
    filteredRows.map((row) => ({
      duke_slug: row.duke_slug ?? '',
      inputs: row.inputs,
    })),
    cardsLookup
  )

  const volatility = computeDukeVolatility(
    filteredRows.map((row) => ({
      duke_slug: row.duke_slug ?? '',
      total_score: Number(row.score_total ?? 0),
    }))
  )

  return {
    inputMix,
    volatility,
    totalGames: filteredRows.length,
  }
}

// Tiny helper exported for tests of unrelated code that only needs participant count.
export function _participantCountByRow(rows: RawScoreRow[]): Map<string, number> {
  const out = new Map<string, number>()
  const buckets = new Map<string, Set<string>>()
  for (const row of rows) {
    const sessionId = row.session_id ?? ''
    if (!sessionId) continue
    const key = row.guest_profile_id
      ? `guest:${row.guest_profile_id}`
      : row.owner_user_id
      ? `user:${row.owner_user_id}`
      : null
    if (!key) continue
    let bucket = buckets.get(sessionId)
    if (!bucket) {
      bucket = new Set()
      buckets.set(sessionId, bucket)
    }
    bucket.add(key)
  }
  buckets.forEach((set, sessionId) => out.set(sessionId, set.size))
  return out
}

void ({} as SessionRow)
