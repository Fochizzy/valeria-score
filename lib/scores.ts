import { supabase } from './supabase'
import type { StatKey } from '../data/cards'

export type ScoreInputs = Record<StatKey, number>

export type ExistingScoreRow = {
  id: string
  duke_slug: string | null
  total_score: number
  inputs: Partial<Record<StatKey, number>> | null
  updated_at: string
  guest_name: string | null
  is_guest: boolean
  guest_profile_id: string | null
  game_locked: boolean
}

export type SaveScoreOptions = {
  lockScore?: boolean
  guestMode?: boolean
  guestName?: string | null
  guestProfileId?: string | null
  guestEntryId?: string | null
  ownerUserId?: string | null
  includedInStats?: boolean
}

async function getAuthenticatedUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) throw new Error('No authenticated user')
  return user.id
}

export async function saveMyScore(
  sessionId: string,
  dukeSlug: string,
  inputs: ScoreInputs,
  totalScore: number,
  options?: SaveScoreOptions
) {
  const userId = await getAuthenticatedUserId()

  if (!sessionId) throw new Error('Missing session ID')
  if (!dukeSlug) throw new Error('Missing duke selection')

  const guestMode = Boolean(options?.guestMode)

  const basePayload = {
    session_id: sessionId,
    duke_slug: dukeSlug,
    inputs,
    total_score: totalScore,
    game_locked: Boolean(options?.lockScore), // IMPORTANT: only locks when finish game
    included_in_stats: Boolean(options?.includedInStats),
    updated_at: new Date().toISOString(),
    placement: null,
    is_winner: false,
  }

  // =========================
  // GUEST MODE
  // =========================
  if (guestMode) {
    const guestProfileId = options?.guestProfileId ?? null
    const guestName = options?.guestName?.trim() || null
    const ownerUserId = options?.ownerUserId ?? userId
    const guestEntryId = options?.guestEntryId ?? null

    if (!guestProfileId && !guestName) {
      throw new Error('Guest score requires a guest player.')
    }

    const payload = {
      ...basePayload,
      user_id: null,
      owner_user_id: ownerUserId,
      is_guest: true,
      guest_name: guestName,
      guest_profile_id: guestProfileId,
    }

    // Update by explicit entry
    if (guestEntryId) {
      const { error } = await supabase
        .from('player_scores')
        .update(payload)
        .eq('id', guestEntryId)
        .eq('owner_user_id', ownerUserId)

      if (error) throw error
      return
    }

    // Try find existing row
    if (guestProfileId) {
      const { data: existing, error } = await supabase
        .from('player_scores')
        .select('id')
        .eq('session_id', sessionId)
        .eq('guest_profile_id', guestProfileId)
        .eq('owner_user_id', ownerUserId)
        .maybeSingle()

      if (error) throw error

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from('player_scores')
          .update(payload)
          .eq('id', existing.id)

        if (updateError) throw updateError
        return
      }
    }

    // Insert new
    const { error } = await supabase.from('player_scores').insert(payload)
    if (error) throw error

    return
  }

  // =========================
  // NORMAL USER MODE
  // =========================
  const payload = {
    ...basePayload,
    user_id: userId,
    owner_user_id: null,
    is_guest: false,
    guest_name: null,
    guest_profile_id: null,
  }

  const { data: existing, error } = await supabase
    .from('player_scores')
    .select('id')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from('player_scores')
      .update(payload)
      .eq('id', existing.id)

    if (updateError) throw updateError
    return
  }

  const { error: insertError } = await supabase
    .from('player_scores')
    .insert(payload)

  if (insertError) throw insertError
}

export async function setMyScoreLocked(
  sessionId: string,
  locked: boolean,
  options?: {
    guestProfileId?: string | null
    guestEntryId?: string | null
    guestMode?: boolean
  }
) {
  const userId = await getAuthenticatedUserId()

  let query = supabase
    .from('player_scores')
    .update({
      game_locked: locked,
      updated_at: new Date().toISOString(),
    })
    .eq('session_id', sessionId)

  if (options?.guestMode) {
    if (options.guestEntryId) {
      query = query.eq('id', options.guestEntryId).eq('owner_user_id', userId)
    } else {
      query = query
        .eq('guest_profile_id', options?.guestProfileId)
        .eq('owner_user_id', userId)
    }
  } else {
    query = query.eq('user_id', userId)
  }

  const { error } = await query
  if (error) throw error
}

export async function loadMyExistingScore(
  sessionId: string,
  options?: {
    guestProfileId?: string | null
    guestEntryId?: string | null
    guestMode?: boolean
  }
) {
  const userId = await getAuthenticatedUserId()

  let query = supabase
    .from('player_scores')
    .select(
      'id, duke_slug, total_score, inputs, updated_at, guest_name, is_guest, guest_profile_id, game_locked'
    )
    .eq('session_id', sessionId)
    .limit(1)

  if (options?.guestMode) {
    if (options.guestEntryId) {
      query = query.eq('id', options.guestEntryId).eq('owner_user_id', userId)
    } else {
      query = query
        .eq('guest_profile_id', options?.guestProfileId)
        .eq('owner_user_id', userId)
    }
  } else {
    query = query.eq('user_id', userId)
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw error

  return (data ?? null) as ExistingScoreRow | null
}

export async function deleteMyScore(
  sessionId: string,
  options?: {
    guestProfileId?: string | null
    guestEntryId?: string | null
    guestMode?: boolean
  }
) {
  const userId = await getAuthenticatedUserId()

  let query = supabase
    .from('player_scores')
    .delete()
    .eq('session_id', sessionId)

  if (options?.guestMode) {
    if (options.guestEntryId) {
      query = query.eq('id', options.guestEntryId).eq('owner_user_id', userId)
    } else {
      query = query
        .eq('guest_profile_id', options?.guestProfileId)
        .eq('owner_user_id', userId)
    }
  } else {
    query = query.eq('user_id', userId)
  }

  const { error } = await query
  if (error) throw error
}