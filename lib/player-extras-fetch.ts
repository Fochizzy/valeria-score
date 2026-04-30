import { aggregateHeadToHead, type HeadToHeadParticipantRow, type HeadToHeadRecord } from './head-to-head.ts'
import { computeFinishDistribution, type FinishDistribution } from './finish-distribution.ts'
import { matchesPlayerCountFilter, type PlayerCountFilter } from './player-count-filter.ts'
import { parsePlayerKey } from './player-key.ts'
import { supabase } from './supabase.ts'

type RawScoreRow = {
  id: string
  session_id: string
  duke_slug: string | null
  score_total: number | null
  owner_user_id: string | null
  guest_profile_id: string | null
  player_name: string | null
  updated_at: string | null
}

type ProfileRow = {
  id: string
  display_name: string | null
  public_player_id: string | null
}

type GuestProfileRow = {
  id: string
  display_name: string | null
  public_player_id: string | null
}

type PlayerGame = {
  sessionId: string
  finishRank: number
  playerCount: number
}

export type PlayerExtras = {
  finishDistribution: FinishDistribution
  headToHead: HeadToHeadRecord[]
  totalGames: number
}

function normalizeText(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizePublicPlayerId(value: string | null | undefined): string | null {
  const upper = normalizeText(value).toUpperCase()
  return upper || null
}

function buildPlayerKey(
  ownerUserId: string | null,
  guestProfileId: string | null
): string | null {
  if (guestProfileId) return `guest:${guestProfileId}`
  if (ownerUserId) return `user:${ownerUserId}`
  return null
}

function isViewerRow(row: RawScoreRow, playerKey: string): boolean {
  return buildPlayerKey(row.owner_user_id, row.guest_profile_id) === playerKey
}

export async function loadPlayerExtras(
  playerKey: string | null | undefined,
  filter: PlayerCountFilter = 'all'
): Promise<PlayerExtras> {
  const empty: PlayerExtras = {
    finishDistribution: { '1st': 0, '2nd': 0, '3rd': 0, '4th+': 0, total: 0 },
    headToHead: [],
    totalGames: 0,
  }

  const parts = parsePlayerKey(playerKey)
  if (!parts) return empty

  // Step 1: viewer's locked rows
  let myQuery = supabase
    .from('session_scores')
    .select(
      'id, session_id, duke_slug, score_total, owner_user_id, guest_profile_id, player_name, updated_at'
    )
    .eq('game_locked', true)
    .not('duke_slug', 'is', null)
    .neq('duke_slug', 'no-duke-selected')

  if (parts.type === 'user') {
    myQuery = myQuery.eq('owner_user_id', parts.userId).is('guest_profile_id', null)
  } else {
    myQuery = myQuery.eq('guest_profile_id', parts.guestProfileId)
  }

  const { data: myRowsRaw, error: myErr } = await myQuery
  if (myErr) throw myErr
  const myRows = (myRowsRaw ?? []) as RawScoreRow[]
  if (myRows.length === 0) return empty

  // Step 2: all rows in those sessions
  const sessionIds = Array.from(
    new Set(myRows.map((row) => row.session_id).filter(Boolean))
  )
  const { data: peerRowsRaw, error: peerErr } = await supabase
    .from('session_scores')
    .select(
      'id, session_id, duke_slug, score_total, owner_user_id, guest_profile_id, player_name, updated_at'
    )
    .in('session_id', sessionIds)
    .eq('game_locked', true)
  if (peerErr) throw peerErr
  const peerRows = (peerRowsRaw ?? []) as RawScoreRow[]

  // Step 3: profile lookups
  const userIds = new Set<string>()
  const guestIds = new Set<string>()
  for (const row of peerRows) {
    if (row.guest_profile_id) guestIds.add(row.guest_profile_id)
    else if (row.owner_user_id) userIds.add(row.owner_user_id)
  }
  const [profilesRes, guestRes] = await Promise.all([
    userIds.size > 0
      ? supabase
          .from('profiles')
          .select('id, display_name, public_player_id')
          .in('id', Array.from(userIds))
      : Promise.resolve({ data: [] as ProfileRow[], error: null }),
    guestIds.size > 0
      ? supabase
          .from('guest_profiles')
          .select('id, display_name, public_player_id')
          .in('id', Array.from(guestIds))
      : Promise.resolve({ data: [] as GuestProfileRow[], error: null }),
  ])
  if (profilesRes.error) throw profilesRes.error
  if (guestRes.error) throw guestRes.error

  const userById = new Map<string, ProfileRow>()
  for (const row of (profilesRes.data ?? []) as ProfileRow[]) {
    userById.set(row.id, row)
  }
  const guestById = new Map<string, GuestProfileRow>()
  for (const row of (guestRes.data ?? []) as GuestProfileRow[]) {
    guestById.set(row.id, row)
  }

  // Step 4: group peer rows by session, compute rank for viewer, filter by player_count
  const peersBySession = new Map<string, RawScoreRow[]>()
  for (const peer of peerRows) {
    let bucket = peersBySession.get(peer.session_id)
    if (!bucket) {
      bucket = []
      peersBySession.set(peer.session_id, bucket)
    }
    bucket.push(peer)
  }

  const playerGames: PlayerGame[] = []
  const includedSessions = new Set<string>()
  for (const myRow of myRows) {
    const sessionRows = peersBySession.get(myRow.session_id) ?? []
    if (sessionRows.length === 0) continue
    const sorted = [...sessionRows].sort((a, b) => {
      const sa = Number(a.score_total ?? 0)
      const sb = Number(b.score_total ?? 0)
      if (sb !== sa) return sb - sa
      const ua = a.updated_at ? Date.parse(a.updated_at) : 0
      const ub = b.updated_at ? Date.parse(b.updated_at) : 0
      return ua - ub
    })
    const idx = sorted.findIndex((row) => row.id === myRow.id)
    if (idx === -1) continue
    const finishRank = idx + 1
    const playerCount = sortedDistinctPlayerCount(sortedDistinctParticipants(sessionRows))
    if (!matchesPlayerCountFilter(playerCount, filter)) continue
    playerGames.push({
      sessionId: myRow.session_id,
      finishRank,
      playerCount,
    })
    includedSessions.add(myRow.session_id)
  }

  // Step 5: build head-to-head participants, only for sessions kept by the filter
  const h2hParticipants: HeadToHeadParticipantRow[] = []
  for (const peer of peerRows) {
    if (!includedSessions.has(peer.session_id)) continue
    const peerKey = buildPlayerKey(peer.owner_user_id, peer.guest_profile_id)
    if (!peerKey) continue

    let playerName = ''
    let publicPlayerId: string | null = null
    if (peer.guest_profile_id) {
      const profile = guestById.get(peer.guest_profile_id)
      playerName =
        normalizeText(profile?.display_name) ||
        normalizePublicPlayerId(profile?.public_player_id) ||
        normalizeText(peer.player_name) ||
        ''
      publicPlayerId = normalizePublicPlayerId(profile?.public_player_id)
    } else if (peer.owner_user_id) {
      const profile = userById.get(peer.owner_user_id)
      playerName =
        normalizeText(profile?.display_name) ||
        normalizePublicPlayerId(profile?.public_player_id) ||
        ''
      publicPlayerId = normalizePublicPlayerId(profile?.public_player_id)
    }

    h2hParticipants.push({
      sessionId: peer.session_id,
      playerKey: peerKey,
      playerName,
      playerType: peer.guest_profile_id ? 'guest' : 'user',
      publicPlayerId,
      totalScore: Number(peer.score_total ?? 0),
      updatedAt: peer.updated_at,
    })
  }

  // Suppress unused-variable warnings on isViewerRow (kept for future use).
  void isViewerRow

  return {
    finishDistribution: computeFinishDistribution(playerGames.map((g) => g.finishRank)),
    headToHead: aggregateHeadToHead(h2hParticipants, playerKey ?? ''),
    totalGames: playerGames.length,
  }
}

// Distinct participants based on player_key (so duplicate rows for one player don't double-count player_count).
function sortedDistinctParticipants(rows: RawScoreRow[]): RawScoreRow[] {
  const seen = new Set<string>()
  const out: RawScoreRow[] = []
  for (const row of rows) {
    const key = buildPlayerKey(row.owner_user_id, row.guest_profile_id)
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(row)
  }
  return out
}

function sortedDistinctPlayerCount(rows: RawScoreRow[]): number {
  return rows.length
}
