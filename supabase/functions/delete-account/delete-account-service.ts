export type DeleteAccountAndDataDeps = {
  getOwnedInProgressSessionIds: (userId: string) => Promise<string[]>
  getOwnedGuestProfileIds: (userId: string) => Promise<string[]>
  deletePlayerScoresBySessionIds: (sessionIds: string[]) => Promise<void>
  deleteSessionScoresBySessionIds: (sessionIds: string[]) => Promise<void>
  deleteSessionPlayersBySessionIds: (sessionIds: string[]) => Promise<void>
  deleteGameSessionsByIds: (sessionIds: string[]) => Promise<void>
  deletePlayerScoresByGuestIds: (guestIds: string[]) => Promise<void>
  detachLockedSessionScoresByGuestIds: (guestIds: string[]) => Promise<void>
  deleteUnlockedSessionScoresByGuestIds: (guestIds: string[]) => Promise<void>
  deletePlayerScoresByUserId: (userId: string) => Promise<void>
  deletePlayerScoresByOwnerUserId: (userId: string) => Promise<void>
  anonymizeLockedSessionScoresByOwnerUserId: (userId: string) => Promise<void>
  deleteUnlockedSessionScoresByOwnerUserId: (userId: string) => Promise<void>
  deleteSessionPlayersByUserId: (userId: string) => Promise<void>
  unlinkGuestProfilesByLinkedUserId: (userId: string) => Promise<void>
  deleteGuestProfilesByOwnerUserId: (userId: string) => Promise<void>
  deleteProfileById: (userId: string) => Promise<void>
  deleteAuthUserById: (userId: string) => Promise<void>
}

export async function deleteAccountAndData(
  userId: string,
  deps: DeleteAccountAndDataDeps
) {
  const ownedSessionIds = await deps.getOwnedInProgressSessionIds(userId)
  const ownedGuestProfileIds = await deps.getOwnedGuestProfileIds(userId)

  if (ownedSessionIds.length > 0) {
    await deps.deletePlayerScoresBySessionIds(ownedSessionIds)
    await deps.deleteSessionScoresBySessionIds(ownedSessionIds)
    await deps.deleteSessionPlayersBySessionIds(ownedSessionIds)
    await deps.deleteGameSessionsByIds(ownedSessionIds)
  }

  if (ownedGuestProfileIds.length > 0) {
    await deps.deletePlayerScoresByGuestIds(ownedGuestProfileIds)
    await deps.detachLockedSessionScoresByGuestIds(ownedGuestProfileIds)
    await deps.deleteUnlockedSessionScoresByGuestIds(ownedGuestProfileIds)
  }

  await deps.deletePlayerScoresByUserId(userId)
  await deps.deletePlayerScoresByOwnerUserId(userId)
  await deps.anonymizeLockedSessionScoresByOwnerUserId(userId)
  await deps.deleteUnlockedSessionScoresByOwnerUserId(userId)
  await deps.deleteSessionPlayersByUserId(userId)
  await deps.unlinkGuestProfilesByLinkedUserId(userId)
  await deps.deleteGuestProfilesByOwnerUserId(userId)
  await deps.deleteProfileById(userId)
  await deps.deleteAuthUserById(userId)
}
