import {
  clampComparePlayerCount,
  normalizeComparePlayerCount,
} from './compare-player-count.ts'

export type CompareProgressEntry = {
  dukeSlug: string | null
  isGuest: boolean
  locked: boolean
  userId?: string | null
  hasScore?: boolean
}

type BuildCompareProgressInput = {
  sessionCreatorId?: string | null
  entries: CompareProgressEntry[]
  expectedPlayerCount?: number | null
}

function isEntryReady(entry: CompareProgressEntry) {
  return entry.locked || Boolean(entry.hasScore) || Boolean(entry.dukeSlug)
}

function getTrackedEntries(
  entries: CompareProgressEntry[],
  sessionCreatorId: string | null | undefined
) {
  const safeCreatorId = String(sessionCreatorId ?? '').trim()

  if (!safeCreatorId) {
    return entries
  }

  const hasGuestEntries = entries.some((entry) => entry.isGuest)

  if (hasGuestEntries) {
    return entries.filter(
      (entry) => entry.isGuest || entry.userId !== safeCreatorId
    )
  }

  return entries
}

export function buildCompareHeroCopy({ isCreator }: { isCreator: boolean }) {
  return isCreator
    ? 'Set the table size, including guests, and finish the game once every player has saved a score.'
    : 'Scores refresh automatically as players save, and the host can finish the game once every player has saved a score.'
}

export function buildCompareProgress({
  sessionCreatorId,
  entries,
  expectedPlayerCount,
}: BuildCompareProgressInput) {
  const normalizedExpectedPlayerCount = normalizeComparePlayerCount(expectedPlayerCount)
  const trackedEntries =
    normalizedExpectedPlayerCount === null
      ? getTrackedEntries(entries, sessionCreatorId)
      : entries

  const committedParticipants = trackedEntries.filter((entry) => entry.hasScore).length
  const readyEntries = trackedEntries.filter(isEntryReady)
  const readyParticipants = readyEntries.length
  const trackedParticipants = trackedEntries.length
  const guestParticipants = trackedEntries.filter((entry) => entry.isGuest).length
  const totalParticipants =
    normalizedExpectedPlayerCount === null
      ? trackedParticipants
      : Math.max(
          clampComparePlayerCount(normalizedExpectedPlayerCount),
          trackedParticipants,
          committedParticipants
        )

  const allLocked =
    totalParticipants > 0 &&
    readyParticipants >= totalParticipants &&
    readyEntries.length > 0 &&
    readyEntries.every((entry) => entry.locked)
  const allReady =
    totalParticipants > 0 &&
    (normalizedExpectedPlayerCount === null
      ? trackedEntries.every(isEntryReady)
      : readyParticipants >= totalParticipants)
  const statusLabel = allLocked
    ? 'Finished'
    : readyParticipants > 0
    ? 'Live'
    : 'Waiting'

  return {
    trackedParticipants,
    totalParticipants,
    readyParticipants,
    guestParticipants,
    allLocked,
    allReady,
    progressLabel: `${readyParticipants} of ${totalParticipants} saved`,
    statusLabel,
  }
}
