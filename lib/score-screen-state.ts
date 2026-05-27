import { createEmptyInputs, normalizeScoreInputs, type ScoreInputs } from './scoring.ts'

const INPUT_KEYS = [
  'gold',
  'magic',
  'fight',
  'vp',
  'hammer',
  'helmet',
  'key',
  'holy',
  'citizenCount',
  'monstersCount',
  'monsterPoints',
  'bossCount',
  'lieutenantCount',
  'beastCount',
  'minionCount',
  'domainCount',
  'domainPoints',
] as (keyof ScoreInputs)[]

type UnsavedScoreChangeInput = {
  selectedSlug: string | null
  baselineSlug: string | null
  inputs: ScoreInputs
  baselineInputs: ScoreInputs
}

type ScoreDraftStorageKeyInput = {
  sessionId: string | null | undefined
  guestMode?: boolean
  guestProfileId?: string | null
  guestEntryId?: string | null
}

type ScoreDraftState = {
  selectedSlug: string | null
  inputs: ScoreInputs
}

type ResolveLoadedScoreStateInput = {
  initialSlug: string | null
  existingScore?: {
    selectedSlug: string | null
    inputs: ScoreInputs
    updatedAt?: string | null
    isLocked?: boolean
    confirmedForCurrentRevision?: boolean
  } | null
  draft?: ScoreDraftState | null
  sessionFinished: boolean
}

type ShouldAutoRouteScoreToVictoryInput = {
  sessionId: string | null | undefined
  isLocked: boolean
  wasLocked: boolean | null
  alreadyRouted?: boolean
}

type ShouldRefreshScoreLockOnForegroundInput = {
  sessionId: string | null | undefined
  isLocked: boolean
  totalEntries: number
  lockedEntries: number
}

function normalizeSlug(value: string | null | undefined) {
  const safeValue = String(value ?? '').trim()
  return safeValue || null
}

export function areScoreInputsEqual(a: ScoreInputs, b: ScoreInputs) {
  return INPUT_KEYS.every((key) => a[key] === b[key])
}

export function hasUnsavedScoreChanges({
  selectedSlug,
  baselineSlug,
  inputs,
  baselineInputs,
}: UnsavedScoreChangeInput) {
  return selectedSlug !== baselineSlug || !areScoreInputsEqual(inputs, baselineInputs)
}

export function resolveScoreSessionId(
  routeSessionId: string | null | undefined,
  storedSessionId: string | null | undefined
) {
  const nextRouteSessionId = routeSessionId?.trim() ?? ''
  const nextStoredSessionId = storedSessionId?.trim() ?? ''

  return nextRouteSessionId || nextStoredSessionId || ''
}

export function shouldResetScoreScrollOnDukeSelection(
  previousSlug: string | null | undefined,
  nextSlug: string | null | undefined
) {
  const safePreviousSlug = normalizeSlug(previousSlug)
  const safeNextSlug = normalizeSlug(nextSlug)

  return Boolean(safeNextSlug) && safePreviousSlug !== safeNextSlug
}

export function resolveScoreScrollResetTarget(scoringAreaTop: number) {
  if (!Number.isFinite(scoringAreaTop)) {
    return 0
  }

  return Math.max(0, Math.floor(scoringAreaTop))
}

export function resolveScoreActionVisibility(selectedSlug: string | null | undefined) {
  const hasSelectedDuke = Boolean(normalizeSlug(selectedSlug))

  return {
    showTotalCard: hasSelectedDuke,
    showFooterCompareButton: hasSelectedDuke,
  }
}

export function buildScoreDraftStorageKey({
  sessionId,
  guestMode,
  guestProfileId,
  guestEntryId,
}: ScoreDraftStorageKeyInput) {
  const safeSessionId = String(sessionId ?? '').trim()

  if (!safeSessionId) {
    return ''
  }

  if (!guestMode) {
    return `score-draft:${safeSessionId}:player`
  }

  const safeGuestProfileId = String(guestProfileId ?? '').trim()
  const safeGuestEntryId = String(guestEntryId ?? '').trim()

  return `score-draft:${safeSessionId}:guest:${safeGuestProfileId}:${safeGuestEntryId}`
}

export function parseStoredScoreDraft(value: string | null | undefined): ScoreDraftState | null {
  const rawValue = String(value ?? '').trim()

  if (!rawValue) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue) as {
      selectedSlug?: string | null
      inputs?: Partial<ScoreInputs>
    }

    return {
      selectedSlug: normalizeSlug(parsed?.selectedSlug),
      inputs: normalizeScoreInputs(parsed?.inputs ?? {}),
    }
  } catch {
    return null
  }
}

export function isSessionFinished(totalEntries: number, lockedEntries: number) {
  return totalEntries > 0 && lockedEntries > 0 && lockedEntries >= totalEntries
}

export function shouldAutoRouteScoreToVictory({
  sessionId,
  isLocked,
  wasLocked,
  alreadyRouted = false,
}: ShouldAutoRouteScoreToVictoryInput) {
  const safeSessionId = String(sessionId ?? '').trim()

  return Boolean(safeSessionId) && isLocked && wasLocked !== true && !alreadyRouted
}

export function shouldRefreshScoreLockOnForeground({
  sessionId,
  isLocked,
  totalEntries,
  lockedEntries,
}: ShouldRefreshScoreLockOnForegroundInput) {
  const safeSessionId = String(sessionId ?? '').trim()

  return Boolean(safeSessionId) && !isLocked && isSessionFinished(totalEntries, lockedEntries)
}

export function resolveLoadedScoreState({
  initialSlug,
  existingScore,
  draft,
  sessionFinished,
}: ResolveLoadedScoreStateInput) {
  const savedSlug = normalizeSlug(existingScore?.selectedSlug)
  const hasSubmittedScore = Boolean(savedSlug) || Boolean(existingScore?.isLocked)

  if (existingScore && hasSubmittedScore) {
    const nextSlug = savedSlug ?? normalizeSlug(initialSlug)
    const needsResave =
      existingScore.confirmedForCurrentRevision === false &&
      !sessionFinished &&
      !Boolean(existingScore.isLocked)

    return {
      selectedSlug: nextSlug,
      inputs: existingScore.inputs,
      baselineSlug: nextSlug,
      baselineInputs: existingScore.inputs,
      lastSavedAt: needsResave ? '' : existingScore.updatedAt ?? '',
      isLocked: sessionFinished || Boolean(existingScore.isLocked),
    }
  }

  if (sessionFinished) {
    const empty = createEmptyInputs()

    return {
      selectedSlug: null,
      inputs: empty,
      baselineSlug: null,
      baselineInputs: empty,
      lastSavedAt: '',
      isLocked: true,
    }
  }

  if (draft) {
    return {
      selectedSlug: normalizeSlug(draft.selectedSlug),
      inputs: draft.inputs,
      baselineSlug: null,
      baselineInputs: createEmptyInputs(),
      lastSavedAt: '',
      isLocked: false,
    }
  }

  const empty = createEmptyInputs()
  const nextInitialSlug = normalizeSlug(initialSlug)

  return {
    selectedSlug: nextInitialSlug,
    inputs: empty,
    baselineSlug: null,
    baselineInputs: empty,
    lastSavedAt: '',
    isLocked: false,
  }
}
