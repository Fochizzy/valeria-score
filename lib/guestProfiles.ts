import { supabase } from './supabase'
import { normalizePlayerId } from './profile'

export type GuestProfile = {
  id: string
  display_name: string
  public_player_id: string
  owner_user_id: string
  created_at?: string
}

type CreateSharedGuestProfileArgs = {
  displayName: string
  publicPlayerId: string
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

export async function createSharedGuestProfile(
  args: CreateSharedGuestProfileArgs
): Promise<GuestProfile> {
  const displayName = args.displayName.trim()
  const publicPlayerId = normalizePlayerId(args.publicPlayerId)

  if (!displayName) {
    throw new Error('Missing player name')
  }

  if (!publicPlayerId) {
    throw new Error('Missing Player ID')
  }

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