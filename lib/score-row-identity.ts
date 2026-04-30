export type ScoreRowIdentityOptions = {
  guestMode?: boolean
  guestEntryId?: string | null
  guestProfileId?: string | null
  ownerUserId?: string | null
}

export type ScoreRowLookup = {
  kind: 'guest' | 'player'
  eqFilters: {
    field: 'guest_entry_id' | 'guest_profile_id' | 'owner_user_id'
    value: string
  }[]
  nullFilters: ('guest_entry_id' | 'guest_profile_id')[]
}

function normalizeString(value: string | null | undefined) {
  const trimmed = String(value ?? '').trim()
  return trimmed || null
}

export function buildScoreRowLookup(
  options: ScoreRowIdentityOptions
): ScoreRowLookup | null {
  const guestEntryId = normalizeString(options.guestEntryId)
  const guestProfileId = normalizeString(options.guestProfileId)
  const ownerUserId = normalizeString(options.ownerUserId)

  if (options.guestMode) {
    if (guestEntryId) {
      return {
        kind: 'guest',
        eqFilters: [{ field: 'guest_entry_id', value: guestEntryId }],
        nullFilters: [],
      }
    }

    if (guestProfileId) {
      return {
        kind: 'guest',
        eqFilters: [{ field: 'guest_profile_id', value: guestProfileId }],
        nullFilters: [],
      }
    }

    return null
  }

  if (!ownerUserId) {
    return null
  }

  return {
    kind: 'player',
    eqFilters: [{ field: 'owner_user_id', value: ownerUserId }],
    nullFilters: ['guest_profile_id', 'guest_entry_id'],
  }
}

export function applyScoreRowLookup(query: any, lookup: ScoreRowLookup) {
  let next = query

  for (const filter of lookup.eqFilters) {
    next = next.eq(filter.field, filter.value)
  }

  for (const field of lookup.nullFilters) {
    next = next.is(field, null)
  }

  return next
}
