import {
  aggregateFrequentOpponents,
  type FrequentOpponent,
  type SessionParticipantRow,
} from './frequent-opponents.ts'
import { supabase } from './supabase.ts'

type RawScoreRow = {
  session_id: string | null
  owner_user_id: string | null
  guest_profile_id: string | null
  player_name: string | null
  game_locked: boolean | null
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

function normalizeText(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizePublicPlayerId(value: string | null | undefined): string | null {
  const normalized = normalizeText(value).toUpperCase()
  return normalized || null
}

function buildPlayerKey(
  ownerUserId: string | null,
  guestProfileId: string | null
): string | null {
  if (guestProfileId) return `guest:${guestProfileId}`
  if (ownerUserId) return `user:${ownerUserId}`
  return null
}

export async function loadFrequentOpponents(
  viewerUserId: string,
  limit = 5
): Promise<FrequentOpponent[]> {
  if (!viewerUserId) return []
  const viewerPlayerKey = `user:${viewerUserId}`

  // Sessions the viewer locked a score in.
  const { data: viewerRowsRaw, error: viewerErr } = await supabase
    .from('session_scores')
    .select('session_id, game_locked')
    .eq('owner_user_id', viewerUserId)
    .is('guest_profile_id', null)
    .eq('game_locked', true)

  if (viewerErr) throw viewerErr
  const viewerRows = (viewerRowsRaw ?? []) as RawScoreRow[]

  const sessionIds = Array.from(
    new Set(viewerRows.map((row) => row.session_id ?? '').filter(Boolean))
  )
  if (sessionIds.length === 0) return []

  const { data: peerRowsRaw, error: peerErr } = await supabase
    .from('session_scores')
    .select(
      'session_id, owner_user_id, guest_profile_id, player_name, game_locked'
    )
    .in('session_id', sessionIds)
    .eq('game_locked', true)

  if (peerErr) throw peerErr
  const peerRows = (peerRowsRaw ?? []) as RawScoreRow[]

  // Look up display names + public ids for the player keys we'll show.
  const userIds = new Set<string>()
  const guestIds = new Set<string>()
  for (const row of peerRows) {
    if (row.guest_profile_id) {
      guestIds.add(row.guest_profile_id)
    } else if (row.owner_user_id) {
      userIds.add(row.owner_user_id)
    }
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

  const participants: SessionParticipantRow[] = []
  for (const row of peerRows) {
    const sessionId = row.session_id ?? ''
    if (!sessionId) continue
    const playerKey = buildPlayerKey(row.owner_user_id, row.guest_profile_id)
    if (!playerKey) continue

    let playerName = ''
    let publicPlayerId: string | null = null
    if (row.guest_profile_id) {
      const profile = guestById.get(row.guest_profile_id)
      playerName =
        normalizeText(profile?.display_name) ||
        normalizePublicPlayerId(profile?.public_player_id) ||
        normalizeText(row.player_name) ||
        ''
      publicPlayerId = normalizePublicPlayerId(profile?.public_player_id)
    } else if (row.owner_user_id) {
      const profile = userById.get(row.owner_user_id)
      playerName =
        normalizeText(profile?.display_name) ||
        normalizePublicPlayerId(profile?.public_player_id) ||
        ''
      publicPlayerId = normalizePublicPlayerId(profile?.public_player_id)
    }

    participants.push({
      sessionId,
      playerKey,
      playerName,
      playerType: row.guest_profile_id ? 'guest' : 'user',
      publicPlayerId,
    })
  }

  return aggregateFrequentOpponents(participants, viewerPlayerKey, limit)
}
