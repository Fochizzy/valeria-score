import { MAX_COMPARE_PLAYER_COUNT } from './compare-player-count.ts'

export const SESSION_PLAYER_GUEST_ONLY_MESSAGE =
  'Only players in this session can add guests.'
export const SESSION_MAX_PLAYER_COUNT_MESSAGE = 'Games can have at most 5 players.'
export const SESSION_DUPLICATE_GUEST_MESSAGE = 'That guest is already in this game.'

export type AddGuestPlayerArgs = {
  guest_profile_id: string
  display_name: string
  player_id?: string
}

export type GuestSessionEntry = {
  id: string
  guest_profile_id: string | null
  guest_entry_id: string | null
  player_name: string | null
}

type GuestInsertPayload = {
  sessionId: string
  ownerUserId: string
  guestProfileId: string
  displayName: string
}

type AddGuestPlayerDeps = {
  getCurrentUserId: () => Promise<string | null>
  isCurrentUserInSession: (sessionId: string, userId: string) => Promise<boolean>
  hasGuestProfileInSession: (sessionId: string, guestProfileId: string) => Promise<boolean>
  getSessionParticipantCount: (sessionId: string) => Promise<number>
  insertGuestEntry: (payload: GuestInsertPayload) => Promise<GuestSessionEntry>
}

function requireTrimmedValue(value: string | null | undefined, message: string) {
  const normalized = String(value ?? '').trim()

  if (!normalized) {
    throw new Error(message)
  }

  return normalized
}

export async function addGuestPlayerToSessionWithAccessCheck(
  sessionId: string,
  args: AddGuestPlayerArgs,
  deps: AddGuestPlayerDeps
) {
  const safeSessionId = requireTrimmedValue(sessionId, 'Missing session id')
  const guestProfileId = requireTrimmedValue(args.guest_profile_id, 'Missing guest profile')
  const displayName = requireTrimmedValue(args.display_name, 'Missing guest display name')

  const currentUserId = await deps.getCurrentUserId()
  if (!currentUserId) {
    throw new Error('User not authenticated')
  }

  const isCurrentUserInSession = await deps.isCurrentUserInSession(
    safeSessionId,
    currentUserId
  )
  if (!isCurrentUserInSession) {
    throw new Error(SESSION_PLAYER_GUEST_ONLY_MESSAGE)
  }

  const alreadyAdded = await deps.hasGuestProfileInSession(safeSessionId, guestProfileId)
  if (alreadyAdded) {
    throw new Error(SESSION_DUPLICATE_GUEST_MESSAGE)
  }

  const sessionParticipantCount = await deps.getSessionParticipantCount(safeSessionId)
  if (sessionParticipantCount >= MAX_COMPARE_PLAYER_COUNT) {
    throw new Error(SESSION_MAX_PLAYER_COUNT_MESSAGE)
  }

  return deps.insertGuestEntry({
    sessionId: safeSessionId,
    ownerUserId: currentUserId,
    guestProfileId,
    displayName,
  })
}
