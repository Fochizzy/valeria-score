import { prepareGuestProfileCreationInput } from './guest-profile-creation'
import { normalizePlayerId } from './player-id'
import { supabase } from './supabase'

export type GuestProfile = {
  id: string
  display_name: string
  public_player_id: string
  owner_user_id: string
  created_at?: string
}

type CreateSharedGuestProfileArgs = {
  displayName?: string | null
  publicPlayerId: string
}

type LegacyCreateGuestProfileArgs = {
  display_name?: string | null
  player_id: string
}

export async function getGuestProfileByPlayerId(
  playerId: string
): Promise<GuestProfile | null> {
  const normalized = normalizePlayerId(playerId)

  if (!normalized) return null

  const { data, error } = await supabase
    .from('guest_profiles')
    .select('id, display_name, public_player_id, owner_user_id, created_at')
    .eq('public_player_id', normalized)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data as GuestProfile | null) ?? null
}

export async function searchGuestProfiles(query: string): Promise<{
  id: string
  display_name: string
  player_id: string | null
}[]> {
  const normalizedQuery = query.trim()

  if (!normalizedQuery) return []

  const normalizedPlayerId = normalizePlayerId(normalizedQuery)

  let request = supabase
    .from('guest_profiles')
    .select('id, display_name, public_player_id')
    .order('display_name', { ascending: true })
    .limit(12)

  if (normalizedPlayerId) {
    request = request.or(
      `display_name.ilike.%${normalizedQuery}%,public_player_id.ilike.%${normalizedPlayerId}%`
    )
  } else {
    request = request.ilike('display_name', `%${normalizedQuery}%`)
  }

  const { data, error } = await request

  if (error) throw error

  return ((data ?? []) as {
    id: string
    display_name: string
    public_player_id: string | null
  }[]).map((row) => ({
    id: row.id,
    display_name: row.display_name,
    player_id: row.public_player_id,
  }))
}

export async function createSharedGuestProfile(
  args: CreateSharedGuestProfileArgs
): Promise<GuestProfile> {
  const { displayName, playerId: publicPlayerId } = prepareGuestProfileCreationInput({
    displayName: args.displayName,
    playerId: args.publicPlayerId,
  })

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('User not authenticated')
  }

  const existing = await getGuestProfileByPlayerId(publicPlayerId)
  if (existing) {
    throw new Error('That Player ID is already in use')
  }

  const { data, error } = await supabase
    .from('guest_profiles')
    .insert({
      display_name: displayName,
      public_player_id: publicPlayerId,
      owner_user_id: user.id,
    })
    .select('id, display_name, public_player_id, owner_user_id, created_at')
    .single()

  if (error) {
    throw error
  }

  return data as GuestProfile
}

export async function createGuestProfile(
  args: LegacyCreateGuestProfileArgs
): Promise<{
  id: string
  display_name: string
  player_id: string
}> {
  const prepared = prepareGuestProfileCreationInput({
    displayName: args.display_name ?? null,
    playerId: args.player_id,
  })

  const created = await createSharedGuestProfile({
    displayName: prepared.displayName,
    publicPlayerId: prepared.playerId,
  })

  return {
    id: created.id,
    display_name: created.display_name,
    player_id: created.public_player_id,
  }
}
