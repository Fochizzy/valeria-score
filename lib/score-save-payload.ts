type ScoreInputs = Record<string, number>

type BuildScoreSavePayloadInput = {
  sessionId: string
  dukeSlug: string
  inputs: ScoreInputs
  totalScore: number
  guestMode?: boolean
  guestName?: string | null
  guestProfileId?: string | null
  guestEntryId?: string | null
  ownerUserId?: string | null
  // Phase 3: when scoring on behalf of an added registered player, the
  // adder needs to be persisted as scored_by_user_id (the editor) while
  // owner_user_id stays as the added player. Self-played and guest paths
  // can leave this undefined and the DB trigger will default it to
  // owner_user_id.
  scoredByUserId?: string | null
  // Phase 3: human display name attached to the row when scoring on behalf
  // of an added player. Falls back to whatever guestName supplies for guest
  // rows.
  addedPlayerName?: string | null
  lockScore?: boolean
  includedInStats?: boolean
  confirmedRevision?: number | null
  updatedAt?: string
}

export function buildScoreSavePayload(input: BuildScoreSavePayloadInput) {
  const payload: Record<string, unknown> = {
    session_id: input.sessionId,
    duke_slug: input.dukeSlug,
    inputs: input.inputs,
    score_total: input.totalScore,
    game_locked: Boolean(input.lockScore),
    included_in_stats: Boolean(input.includedInStats),
    updated_at: input.updatedAt ?? new Date().toISOString(),
  }

  if (Number.isFinite(input.confirmedRevision) && Number(input.confirmedRevision) > 0) {
    payload.confirmed_revision = Number(input.confirmedRevision)
  }

  if (typeof input.scoredByUserId === 'string' && input.scoredByUserId) {
    payload.scored_by_user_id = input.scoredByUserId
  }

  if (input.guestMode) {
    payload.owner_user_id = input.ownerUserId ?? null
    payload.player_name = input.guestName ?? null
    payload.guest_profile_id = input.guestProfileId ?? null
    payload.guest_entry_id = input.guestEntryId ?? null
    return payload
  }

  payload.owner_user_id = input.ownerUserId ?? null
  // For added-player rows we also stamp the row with the player's display
  // name so the compare card can show "Bob" without an extra lookup.
  payload.player_name = input.addedPlayerName ?? null
  payload.guest_profile_id = null
  payload.guest_entry_id = null

  return payload
}
