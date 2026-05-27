import { supabase } from './supabase'
import { normalizeScoreInputs, type ScoreInputs } from './scoring'
import {
  buildScoreCommitPayload,
  buildScoreDraftPayload,
} from './score-save-payload'
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
  draft_duke_slug: string | null
  draft_score_total: number | null
  draft_inputs: ScoreInputs
  draft_updated_at: string | null
  game_locked: boolean
  included_in_stats: boolean
  confirmed_revision: number | null
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

type SessionScoreRow = {
  id: string | number
  session_id: string | number
  duke_slug?: string | null
  score_total?: number | null
  inputs?: unknown
  updated_at?: string | null
  draft_duke_slug?: string | null
  draft_score_total?: number | null
  draft_inputs?: unknown
  draft_updated_at?: string | null
  game_locked?: boolean | null
  included_in_stats?: boolean | null
  confirmed_revision?: number | null
  guest_profile_id?: string | null
  guest_entry_id?: string | null
  player_name?: string | null
  owner_user_id?: string | null
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

function mapExistingScoreRecord(data: SessionScoreRow): ExistingScoreRecord {
  return {
    id: String(data.id),
    session_id: String(data.session_id),
    duke_slug: data.duke_slug ?? null,
    score_total: typeof data.score_total === 'number' ? data.score_total : null,
    inputs: normalizeInputsFromDb(data.inputs),
    updated_at: data.updated_at ?? null,
    draft_duke_slug: data.draft_duke_slug ?? null,
    draft_score_total:
      typeof data.draft_score_total === 'number' ? data.draft_score_total : null,
    draft_inputs: normalizeInputsFromDb(data.draft_inputs),
    draft_updated_at: data.draft_updated_at ?? null,
    game_locked: Boolean(data.game_locked),
    included_in_stats: Boolean(data.included_in_stats),
    confirmed_revision:
      typeof data.confirmed_revision === 'number' ? data.confirmed_revision : 1,
    guest_profile_id: data.guest_profile_id ?? null,
    guest_entry_id: data.guest_entry_id ?? null,
    player_name: data.player_name ?? null,
    owner_user_id: data.owner_user_id ?? null,
  }
}

async function getAuthedUserId(): Promise<string | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return null
  return user.id
}

export async function loadSessionScoreRevision(sessionId: string): Promise<number> {
  const { data, error } = await supabase
    .from('game_sessions')
    .select('score_revision')
    .eq('id', sessionId)
    .maybeSingle()

  if (error) {
    if (
      error.message?.includes('score_revision') ||
      error.message?.includes('column score_revision does not exist')
    ) {
      return 1
    }

    throw error
  }

  return Math.max(1, Number((data as { score_revision?: number | null } | null)?.score_revision ?? 1))
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

async function resolveSaveLookup(
  options: SaveScoreOptions
): Promise<{
  guestMode: boolean
  lookup: ScoreRowLookup
  ownerUserId: string | null
}> {
  const guestMode = Boolean(options.guestMode)

  if (guestMode) {
    const lookup = buildScoreRowLookup({
      guestMode: true,
      guestEntryId: options.guestEntryId,
      guestProfileId: options.guestProfileId,
    })

    if (!lookup) {
      throw new Error('Missing guest identifier')
    }

    return {
      guestMode: true,
      lookup,
      ownerUserId: options.ownerUserId ?? null,
    }
  }

  const ownerUserId = options.ownerUserId ?? (await getAuthedUserId())

  if (!ownerUserId) {
    throw new Error('User not authenticated')
  }

  const lookup = buildScoreRowLookup({
    ownerUserId,
  })

  if (!lookup) {
    throw new Error('User not authenticated')
  }

  return {
    guestMode: false,
    lookup,
    ownerUserId,
  }
}

async function updateSessionScoreRow(rowId: string, payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('session_scores')
    .update(payload)
    .eq('id', rowId)
    .select()
    .single()

  if (error) throw error
  return data
}

async function insertSessionScoreRow(payload: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('session_scores')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function loadMyExistingScore(
  sessionId: string,
  options: LoadScoreOptions = {}
): Promise<ExistingScoreRecord | null> {
  if (!sessionId) return null

  let lookup: ScoreRowLookup | null = null

  if (options.guestMode) {
    lookup = buildScoreRowLookup({
      guestMode: true,
      guestEntryId: options.guestEntryId,
      guestProfileId: options.guestProfileId,
    })
  } else if (options.addedUserId) {
    // Phase 3 added-player mode: the caller is scoring on behalf of a
    // registered player they added. Look up the row by owner_user_id rather
    // than auth.uid().
    lookup = buildScoreRowLookup({ ownerUserId: options.addedUserId })
  } else {
    const userId = await getAuthedUserId()
    if (!userId) return null

    lookup = buildScoreRowLookup({
      ownerUserId: userId,
    })
  }

  if (!lookup) return null

  const data = await loadLatestScoreRow(sessionId, lookup)
  if (!data) return null

  return mapExistingScoreRecord(data as SessionScoreRow)
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

export async function saveMyScoreDraft(
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

  const normalizedInputs = normalizeScoreInputs(inputs)
  const { lookup } = await resolveSaveLookup(options)
  const existingId = await findExistingScoreId(sessionId, lookup)

  if (!existingId) {
    throw new Error('Missing seat row for draft autosave.')
  }

  const payload = buildScoreDraftPayload({
    sessionId,
    dukeSlug,
    inputs: normalizedInputs,
    totalScore,
  })

  return updateSessionScoreRow(existingId, payload)
}

export async function saveMyScoreCommit(
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

  const normalizedInputs = normalizeScoreInputs(inputs)
  const confirmedRevision = await loadSessionScoreRevision(sessionId)
  const { guestMode, lookup, ownerUserId } = await resolveSaveLookup(options)
  const payload = buildScoreCommitPayload({
    sessionId,
    dukeSlug,
    inputs: normalizedInputs,
    totalScore,
    guestMode,
    guestName: options.guestName,
    guestProfileId: options.guestProfileId,
    guestEntryId: options.guestEntryId,
    ownerUserId,
    // Phase 3: when scoring on behalf of an added player, the caller is
    // not the row's owner_user_id. Explicitly stamp scored_by_user_id with
    // the editor so RLS lets the write through and the editor stays the
    // adder for future updates.
    scoredByUserId: guestMode ? null : options.scoredByUserId ?? null,
    addedPlayerName: guestMode ? null : options.addedPlayerName ?? null,
    lockScore: options.lockScore,
    includedInStats: options.includedInStats,
    confirmedRevision,
  })
  const existingId = await findExistingScoreId(sessionId, lookup)

  if (existingId) {
    return updateSessionScoreRow(existingId, payload)
  }

  return insertSessionScoreRow(payload)
}

export const saveMyScore = saveMyScoreCommit

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
