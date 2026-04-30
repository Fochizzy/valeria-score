type CompareGuestRemovalEntry = {
  isGuest: boolean
  scoreId: string | null | undefined
  guestEntryId: string | null | undefined
  scoredByUserId?: string | null | undefined
  userId?: string | null | undefined
}

export type CompareGuestRemovalMode = 'guest-entry' | 'added-player-entry'

type BuildCompareGuestRemovalPlanInput = {
  // The compare screen already enforces host-only removal. Thread that same
  // boolean into the row affordance so the hint and the actual access check
  // stay aligned.
  viewerCanRemove: boolean
  expectedPlayerCount: number
  minimumPlayerCount: number
  entry: CompareGuestRemovalEntry
}

type RemoveGuestFilters =
  | {
      removalMode: 'guest-entry'
      sessionId: string
      scoreId: string
      guestEntryId: string
    }
  | {
      removalMode: 'added-player-entry'
      sessionId: string
      scoreId: string
      ownerUserId: string
    }

type UpdateExpectedPlayerCountPayload = {
  sessionId: string
  expectedPlayerCount: number
  creatorUserId: string
}

type RemoveGuestCompareEntryArgs = {
  sessionId: string
  scoreId: string
  removalMode: CompareGuestRemovalMode
  guestEntryId?: string | null
  ownerUserId?: string | null
  nextExpectedPlayerCount: number
}

type RemoveGuestCompareEntryDeps = {
  getCurrentUserId: () => Promise<string | null>
  assertSessionCreatorAccess: (
    sessionId: string,
    currentUserId: string
  ) => Promise<void>
  deleteGuestScoreRow: (filters: RemoveGuestFilters) => Promise<void>
  updateExpectedPlayerCount: (payload: UpdateExpectedPlayerCountPayload) => Promise<void>
}

function normalizePositiveInteger(value: number, fallback = 1) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return Math.max(1, Math.floor(value))
}

function requireTrimmedValue(value: string | null | undefined, message: string) {
  const normalized = String(value ?? '').trim()

  if (!normalized) {
    throw new Error(message)
  }

  return normalized
}

export function resolveCompareGuestRemovalMode(
  entry: CompareGuestRemovalEntry
): CompareGuestRemovalMode | null {
  const safeScoreId = String(entry.scoreId ?? '').trim()
  if (!entry.isGuest || !safeScoreId) {
    return null
  }

  const safeGuestEntryId = String(entry.guestEntryId ?? '').trim()
  if (safeGuestEntryId) {
    return 'guest-entry'
  }

  const safeOwnerUserId = String(entry.userId ?? '').trim()
  const safeEditorUserId = String(entry.scoredByUserId ?? entry.userId ?? '').trim()

  // Added-player seats are guest-like compare rows without guest ids:
  // owner_user_id points at the linked player while scored_by_user_id still
  // points at the adder. Once the player joins and takes ownership, the two
  // ids match again and the row should stop being removable via this path.
  if (
    safeOwnerUserId &&
    safeEditorUserId &&
    safeOwnerUserId !== safeEditorUserId
  ) {
    return 'added-player-entry'
  }

  return null
}

export function buildCompareGuestRemovalPlan({
  viewerCanRemove,
  expectedPlayerCount,
  minimumPlayerCount,
  entry,
}: BuildCompareGuestRemovalPlanInput) {
  const removalMode = viewerCanRemove ? resolveCompareGuestRemovalMode(entry) : null

  if (!removalMode) {
    return {
      canRemove: false,
      nextExpectedPlayerCount: null,
      removalMode: null,
    }
  }

  const safeExpectedPlayerCount = normalizePositiveInteger(expectedPlayerCount)
  const safeMinimumAfterRemoval = Math.max(
    1,
    normalizePositiveInteger(minimumPlayerCount) - 1
  )

  return {
    canRemove: true,
    nextExpectedPlayerCount: Math.max(
      safeMinimumAfterRemoval,
      safeExpectedPlayerCount - 1
    ),
    removalMode,
  }
}

export async function removeGuestCompareEntryWithAccessCheck(
  args: RemoveGuestCompareEntryArgs,
  deps: RemoveGuestCompareEntryDeps
) {
  const sessionId = requireTrimmedValue(args.sessionId, 'Missing session id')
  const scoreId = requireTrimmedValue(args.scoreId, 'Missing guest score id')
  const removalMode = requireTrimmedValue(
    args.removalMode,
    'Missing removal mode'
  ) as CompareGuestRemovalMode
  const nextExpectedPlayerCount = normalizePositiveInteger(args.nextExpectedPlayerCount)

  const currentUserId = await deps.getCurrentUserId()
  if (!currentUserId) {
    throw new Error('User not authenticated')
  }

  await deps.assertSessionCreatorAccess(sessionId, currentUserId)

  if (removalMode === 'guest-entry') {
    const guestEntryId = requireTrimmedValue(
      args.guestEntryId,
      'Missing guest entry id'
    )

    await deps.deleteGuestScoreRow({
      removalMode,
      sessionId,
      scoreId,
      guestEntryId,
    })
  } else {
    const ownerUserId = requireTrimmedValue(
      args.ownerUserId,
      'Missing added player owner id'
    )

    await deps.deleteGuestScoreRow({
      removalMode,
      sessionId,
      scoreId,
      ownerUserId,
    })
  }

  await deps.updateExpectedPlayerCount({
    sessionId,
    expectedPlayerCount: nextExpectedPlayerCount,
    creatorUserId: currentUserId,
  })

  return {
    expectedPlayerCount: nextExpectedPlayerCount,
  }
}
