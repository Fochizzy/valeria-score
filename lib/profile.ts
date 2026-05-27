import { supabase } from './supabase'

export type ProfileRow = {
  id: string
  display_name: string | null
  public_player_id: string | null
  created_at?: string
  updated_at?: string
}

type GuestProfileRow = {
  id: string
  display_name: string
  contact_email: string | null
  public_player_id: string
  linked_user_id: string | null
}

export type ClaimGuestProfileResult = {
  guest_id: string
  guest_display_name: string
  guest_public_player_id: string
  scores_transferred: number
}

export function normalizePlayerId(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 20)
}

export async function ensureProfileRow() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) throw new Error('You must be signed in.')

  const displayName =
    typeof user.user_metadata?.display_name === 'string'
      ? user.user_metadata.display_name.trim()
      : ''

  const { data: existing, error: existingError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) return

  const { error: insertError } = await supabase.from('profiles').insert({
    id: user.id,
    display_name: displayName || user.email || 'Player',
  })

  if (insertError) throw insertError
}

export async function getMyProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, public_player_id, created_at, updated_at')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw error
  return (data ?? null) as ProfileRow | null
}

export async function isPlayerIdAvailable(
  rawValue: string,
  options?: {
    excludeMyUserId?: boolean
    allowMatchingGuestForClaim?: boolean
  }
) {
  const value = normalizePlayerId(rawValue)

  if (!value || value.length < 3) {
    throw new Error('Player ID must be at least 3 characters.')
  }

  let myUserId: string | null = null
  if (options?.excludeMyUserId) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) throw userError
    myUserId = user?.id ?? null
  }

  const [{ data: profileRows, error: profileError }, { data: guestRows, error: guestError }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, public_player_id')
        .eq('public_player_id', value),
      supabase
        .from('guest_profiles')
        .select('id, public_player_id, linked_user_id')
        .eq('public_player_id', value),
    ])

  if (profileError) throw profileError
  if (guestError) throw guestError

  const safeProfileRows = profileRows ?? []
  const safeGuestRows = (guestRows ?? []) as Array<{
    id: string
    public_player_id: string
    linked_user_id: string | null
  }>

  const profileTaken = safeProfileRows.some((row: any) => row.id !== myUserId)

  const guestTaken = safeGuestRows.some((row) => {
    if (options?.allowMatchingGuestForClaim && !row.linked_user_id) {
      return false
    }
    if (myUserId && row.linked_user_id === myUserId) {
      return false
    }
    return true
  })

  return !profileTaken && !guestTaken
}

export async function claimGuestProfileForCurrentUser(rawValue: string) {
  const value = normalizePlayerId(rawValue)

  if (!value || value.length < 3) {
    throw new Error('Player ID must be at least 3 characters.')
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) throw new Error('You must be signed in.')

  const { data: guest, error: guestError } = await supabase
    .from('guest_profiles')
    .select('id, display_name, contact_email, public_player_id, linked_user_id')
    .eq('public_player_id', value)
    .maybeSingle()

  if (guestError) throw guestError

  const safeGuest = (guest ?? null) as GuestProfileRow | null
  if (!safeGuest) return null

  if (safeGuest.linked_user_id && safeGuest.linked_user_id !== user.id) {
    throw new Error('That guest profile is already linked to another account.')
  }

  const { data, error } = await supabase.rpc('claim_guest_profile', {
    p_public_player_id: value,
  })

  if (error) throw error

  return (data ?? null) as ClaimGuestProfileResult | null
}

export async function setMyPlayerId(rawValue: string) {
  const value = normalizePlayerId(rawValue)

  if (!value || value.length < 3) {
    throw new Error('Player ID must be at least 3 characters.')
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) throw userError
  if (!user) throw new Error('You must be signed in.')

  await ensureProfileRow()

  const available = await isPlayerIdAvailable(value, {
    excludeMyUserId: true,
    allowMatchingGuestForClaim: true,
  })

  if (!available) {
    throw new Error('That Player ID is already in use.')
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      public_player_id: value,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) throw error

  await claimGuestProfileForCurrentUser(value)
}
