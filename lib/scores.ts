import { supabase } from './supabase'
import { normalizeScoreInputs, type ScoreInputs } from './scoring'
import { buildScoreSavePayload } from './score-save-payload'
import {
  applyScoreRowLookup,
  buildScoreRowLookup,
  type ScoreRowLookup,
} from './score-row-identity'

export type ExistingScoreRecord = {
  id: string
  session_id: string
  duke_slug: string | null
  score_total: number | null
  inputs: ScoreInputs
  updated_at: string | null
  game_locked: boolean
  included_in_stats: boolean
  guest_profile_id: string | null
  guest_entry_id: string | null
  player_name: string | null
  owner_user_id: string | null
}

type LoadScoreOptions = {
  guestMode?: boolean
  guestProfileId?: string | null
  guestEntryId?: string | null
  // Phase 3: load-on-behalf-of-an-added-player. When set the lookup keys
  // on owner_user_id = addedUserId (and guest_profile_id IS NULL).
  addedUserId?: string | null
}

type SaveScoreOptions = {
  guestMode?: boolean
  guestName?: string | null
  guestProfileId?: string | null
  guestEntryId?: string | null
  ownerUserId?: string | null
  // Phase 3: explicit editor identity. When set, the row is inserted /
  // updated with scored_by_user_id = scoredByUserId so the adder retains
  // edit rights even when owner_user_id is the added player.
  scoredByUserId?: string | null
  // Display name for the added-player row. Used as player_name for human
  // copy on compare and recap cards.
  addedPlayerName?: string | null
  lockScore?: boolean
  includedInStats?: boolean
}

export type SessionLockState = {
  totalEntries: number
  lockedEntries: number
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeInputsFromDb(value: unknown): ScoreInputs {
  if (!isObject(value)) {
    return normalizeScoreInputs({})
  }

  return normalizeScoreInputs(value as Partial<ScoreInputs>)
}

async function getAuthedUserId(): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null
  return user.id
}

async function loadLatestScoreRow(
  sessionId: string,
  lookup: ScoreRowLookup
) {
  const query = applyScoreRowLookup(
    supabase.from('session_scores').select('*').eq('session_id', sessionId),
    lookup
  )

  const { data, error } = await query
    .order('updated_at', { ascending: false })
    .limit(1)

  if (error) throw error
  return Array.isArray(data) ? data[0] ?? null : null
}

async function findExistingScoreId(
  sessionId: string,
  lookup: ScoreRowLookup
) {
  const query = applyScoreRowLookup(
    supabase.from('session_scores').select('id').eq('session_id', sessionId),
    lookup
  )

  const { data, error } = await query
    .order('updated_at', { ascending: false })
    .limit(1)

  if (error) throw error

  const row = Array.isArray(data) ? data[0] ?? null : null
  return row?.id ? String(row.id) : null
}

export async function loadMyExistingScore(
  sessionId: string,
  options: LoadScoreOptions = {}
): Promise<ExistingScoreRecord | null> {
  if (!sessionId) return null

  const guestMode = Boolean(options.guestMode)

  if (guestMode) {
    const lookup = buildScoreRowLookup({
      guestMode: true,
      guestEntryId: options.guestEntryId,
      guestProfileId: options.guestProfileId,
    })

    if (!lookup) {
      return null
    }

    const data = await loadLatestScoreRow(sessionId, lookup)
    if (!data) return null

    return {
      id: String(data.id),
      session_id: String(data.session_id),
      duke_slug: data.duke_slug ?? null,
      score_total: typeof data.score_total === 'number' ? data.score_total : null,
      inputs: normalizeInputsFromDb(data.inputs),
      updated_at: data.updated_at ?? null,
      game_locked: Boolean(data.game_locked),
      included_in_stats: Boolean(data.included_in_stats),
      guest_profile_id: data.guest_profile_id ?? null,
      guest_entry_id: data.guest_entry_id ?? null,
      player_name: data.player_name ?? null,
      owner_user_id: data.owner_user_id ?? null,
    }
  }

  // Phase 3 added-player mode: the caller is scoring on behalf of a
  // registered player they added. Look up the row by owner_user_id rather
  // than auth.uid().
  if (options.addedUserId) {
    const lookup = buildScoreRowLookup({ ownerUserId: options.addedUserId })
    if (!lookup) return null

    const data = await loadLatestScoreRow(sessionId, lookup)
    if (!data) return null

    return {
      id: String(data.id),
      session_id: String(data.session_id),
      duke_slug: data.duke_slug ?? null,
      score_total: typeof data.score_total === 'number' ? data.score_total : null,
      inputs: normalizeInputsFromDb(data.inputs),
      updated_at: data.updated_at ?? null,
      game_locked: Boolean(data.game_locked),
      included_in_stats: Boolean(data.included_in_stats),
      guest_profile_id: data.guest_profile_id ?? null,
      guest_entry_id: data.guest_entry_id ?? null,
      player_name: data.player_name ?? null,
      owner_user_id: data.owner_user_id ?? null,
    }
  }

  const userId = await getAuthedUserId()
  if (!userId) return null

  const lookup = buildScoreRowLookup({
    ownerUserId: userId,
  })

  if (!lookup) return null

  const data = await loadLatestScoreRow(sessionId, lookup)
  if (!data) return null

  return {
    id: String(data.id),
    session_id: String(data.session_id),
    duke_slug: data.duke_slug ?? null,
    score_total: typeof data.score_total === 'number' ? data.score_total : null,
    inputs: normalizeInputsFromDb(data.inputs),
    updated_at: data.updated_at ?? null,
    game_locked: Boolean(data.game_locked),
    included_in_stats: Boolean(data.included_in_stats),
    guest_profile_id: data.guest_profile_id ?? null,
    guest_entry_id: data.guest_entry_id ?? null,
    player_name: data.player_name ?? null,
    owner_user_id: data.owner_user_id ?? null,
  }
}

export async function loadSessionLockState(
  sessionId: string
): Promise<SessionLockState> {
  if (!sessionId) {
    return {
      totalEntries: 0,
      lockedEntries: 0,
    }
  }

  const { data, error } = await supabase
    .from('session_scores')
    .select('id, game_locked')
    .eq('session_id', sessionId)

  if (error) throw error

  const rows = (data ?? []) as {
    id: string
    game_locked: boolean | null
  }[]

  return {
    totalEntries: rows.length,
    lockedEntries: rows.filter((row) => Boolean(row.game_locked)).length,
  }
}

export async function saveMyScore(
  sessionId: string,
  dukeSlug: string,
  inputs: ScoreInputs,
  totalScore: number,
  options: SaveScoreOptions = {}
) {
  if (!sessionId) {
    throw new Error('Missing session id')
  }

  if (!dukeSlug) {
    throw new Error('Missing duke slug')
  }

  const guestMode = Boolean(options.guestMode)
  const normalizedInputs = normalizeScoreInputs(inputs)

  if (guestMode) {
    const payload = buildScoreSavePayload({
      sessionId,
      dukeSlug,
      inputs: normalizedInputs,
      totalScore,
      guestMode: true,
      guestName: options.guestName,
      guestProfileId: options.guestProfileId,
      guestEntryId: options.guestEntryId,
      ownerUserId: options.ownerUserId,
      lockScore: options.lockScore,
      includedInStats: options.includedInStats,
    })

    const lookup = buildScoreRowLookup({
      guestMode: true,
      guestEntryId: options.guestEntryId,
      guestProfileId: options.guestProfileId,
    })

    if (!lookup) {
      throw new Error('Missing guest identifier')
    }

    const existingId = await findExistingScoreId(sessionId, lookup)

    if (existingId) {
      const { data, error } = await supabase
        .from('session_scores')
        .update(payload)
        .eq('id', existingId)
        .select()
        .single()

      if (error) throw error
      return data
    }

    const { data, error } = await supabase
      .from('session_scores')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const userId = options.ownerUserId ?? (await getAuthedUserId())
  if (!userId) {
    throw new Error('User not authenticated')
  }

  const payload = buildScoreSavePayload({
    sessionId,
    dukeSlug,
    inputs: normalizedInputs,
    totalScore,
    ownerUserId: userId,
    // Phase 3: when scoring on behalf of an added player, the caller is
    // not the row's owner_user_id. Explicitly stamp scored_by_user_id with
    // the editor so RLS lets the write through and the editor stays the
    // adder for future updates.
    scoredByUserId: options.scoredByUserId ?? null,
    addedPlayerName: options.addedPlayerName ?? null,
    lockScore: options.lockScore,
    includedInStats: options.includedInStats,
  })

  const lookup = buildScoreRowLookup({
    ownerUserId: userId,
  })

  if (!lookup) {
    throw new Error('User not authenticated')
  }

  const existingId = await findExistingScoreId(sessionId, lookup)

  if (existingId) {
    const { data, error } = await supabase
      .from('session_scores')
      .update(payload)
      .eq('id', existingId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('session_scores')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function setMyScoreLocked(
  sessionId: string,
  lockScore: boolean,
  options: LoadScoreOptions & { ownerUserId?: string | null } = {}
) {
  if (!sessionId) {
    throw new Error('Missing session id')
  }

  const guestMode = Boolean(options.guestMode)
  let lookup: ScoreRowLookup | null = null

  if (guestMode) {
    lookup = buildScoreRowLookup({
      guestMode: true,
      guestEntryId: options.guestEntryId,
      guestProfileId: options.guestProfileId,
    })

    if (!lookup) {
      throw new Error('Missing guest identifier')
    }
  } else {
    const userId = options.ownerUserId ?? (await getAuthedUserId())

    if (!userId) {
      throw new Error('User not authenticated')
    }

    lookup = buildScoreRowLookup({
      ownerUserId: userId,
    })
  }

  if (!lookup) {
    throw new Error('User not authenticated')
  }

  const rowId = await findExistingScoreId(sessionId, lookup)

  if (!rowId) {
    return []
  }

  const { data, error } = await supabase
    .from('session_scores')
    .update({
      game_locked: lockScore,
      updated_at: new Date().toISOString(),
    })
    .eq('id', rowId)
    .select()

  if (error) throw error
  return data
}
