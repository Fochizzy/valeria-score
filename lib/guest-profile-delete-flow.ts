type DeleteResult = {
  error?: {
    message?: string | null
  } | null
}

type GuestDeleteFilters = {
  guestId: string
  ownerUserId: string
}

type DeleteGuestProfileDeps = {
  getCurrentUserId: () => Promise<string | null>
  deleteSessionScores: (filters: GuestDeleteFilters) => Promise<DeleteResult>
  deleteGuestProfileRow: (filters: GuestDeleteFilters) => Promise<DeleteResult>
}

function normalizeValue(value: string | null | undefined) {
  return String(value ?? '').trim()
}

function requireGuestId(guestId: string) {
  const safeGuestId = normalizeValue(guestId)

  if (!safeGuestId) {
    throw new Error('Missing guest profile id')
  }

  return safeGuestId
}

function getDeleteErrorMessage(result: DeleteResult) {
  return result.error?.message ?? 'Unable to delete guest profile.'
}

export async function deleteGuestProfileWithCleanup(
  guestId: string,
  deps: DeleteGuestProfileDeps
) {
  const safeGuestId = requireGuestId(guestId)
  const safeUserId = normalizeValue(await deps.getCurrentUserId())

  if (!safeUserId) {
    throw new Error('User not authenticated')
  }

  const filters = {
    guestId: safeGuestId,
    ownerUserId: safeUserId,
  }

  const sessionScoreResult = await deps.deleteSessionScores(filters)
  if (sessionScoreResult.error) {
    throw new Error(getDeleteErrorMessage(sessionScoreResult))
  }

  const guestProfileResult = await deps.deleteGuestProfileRow(filters)
  if (guestProfileResult.error) {
    throw new Error(getDeleteErrorMessage(guestProfileResult))
  }
}
