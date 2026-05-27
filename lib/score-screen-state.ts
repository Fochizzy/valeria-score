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
  addedUserId?: string | null
}

type ScoreDraftState = {
  selectedSlug: string | null
  inputs: ScoreInputs
  updatedAt: string
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
  remoteDraft?: ScoreDraftState | null
  localDraft?: ScoreDraftState | null
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

type ShouldAutoSaveScoreProgressInput = {
  sessionId: string | null | undefined
  selectedSlug: string | null | undefined
  isDirty: boolean
  isLocked: boolean
  resolvingSession: boolean
  loadingExisting: boolean
  isSavingManually: boolean
  hasLoadError: boolean
}

function normalizeSlug(value: string | null | undefined) {
  const safeValue = String(value ?? '').trim()
  return safeValue || null
}

function normalizeDraftUpdatedAt(value: string | null | undefined) {
  const safeValue = String(value ?? '').trim()
  return safeValue || ''
}

function getTimestampValue(value: string | null | undefined) {
  const parsedTimestamp = Date.parse(value ?? '')
  return Number.isFinite(parsedTimestamp) ? parsedTimestamp : Number.NEGATIVE_INFINITY
}

function getDraftTimestampValue(draft: ScoreDraftState | null | undefined) {
  return getTimestampValue(draft?.updatedAt)
}

function shouldResumePreferredDraft(
  preferredDraft: ScoreDraftState | null,
  existingScore: ResolveLoadedScoreStateInput['existingScore'],
  hasCommittedScore: boolean
) {
  if (!preferredDraft) {
    return false
  }

  if (!hasCommittedScore) {
    return true
  }

  return getDraftTimestampValue(preferredDraft) > getTimestampValue(existingScore?.updatedAt)
}

export function pickPreferredScoreDraft(
  remoteDraft: ScoreDraftState | null | undefined,
  localDraft: ScoreDraftState | null | undefined
) {
  if (!remoteDraft) {
    return localDraft ?? null
  }

  if (!localDraft) {
    return remoteDraft
  }

  return getDraftTimestampValue(localDraft) > getDraftTimestampValue(remoteDraft)
    ? localDraft
    : remoteDraft
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
  addedUserId,
}: ScoreDraftStorageKeyInput) {
  const safeSessionId = String(sessionId ?? '').trim()

  if (!safeSessionId) {
    return ''
  }

  const safeAddedUserId = String(addedUserId ?? '').trim()

  if (!guestMode) {
    if (safeAddedUserId) {
      return `score-draft:${safeSessionId}:added-player:${safeAddedUserId}`
    }

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
      updatedAt?: string | null
    }

    return {
      selectedSlug: normalizeSlug(parsed?.selectedSlug),
      inputs: normalizeScoreInputs(parsed?.inputs ?? {}),
      updatedAt: normalizeDraftUpdatedAt(parsed?.updatedAt),
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

export function shouldAutoSaveScoreProgress({
  sessionId,
  selectedSlug,
  isDirty,
  isLocked,
  resolvingSession,
  loadingExisting,
  isSavingManually,
  hasLoadError,
}: ShouldAutoSaveScoreProgressInput) {
  const safeSessionId = String(sessionId ?? '').trim()
  const hasSelectedDuke = Boolean(normalizeSlug(selectedSlug))

  return (
    Boolean(safeSessionId) &&
    hasSelectedDuke &&
    isDirty &&
    !isLocked &&
    !resolvingSession &&
    !loadingExisting &&
    !isSavingManually &&
    !hasLoadError
  )
}

export function resolveLoadedScoreState({
  initialSlug,
  existingScore,
  remoteDraft,
  localDraft,
  draft,
  sessionFinished,
}: ResolveLoadedScoreStateInput) {
  const empty = createEmptyInputs()
  const committedBaselineSlug = normalizeSlug(existingScore?.selectedSlug)
  const committedBaselineInputs = existingScore?.inputs ?? empty
  const hasCommittedScore = Boolean(committedBaselineSlug) || Boolean(existingScore?.isLocked)
  const needsResave =
    existingScore?.confirmedForCurrentRevision === false &&
    !sessionFinished &&
    !Boolean(existingScore?.isLocked)
  const nextLocalDraft = localDraft ?? draft ?? null
  const preferredDraft = pickPreferredScoreDraft(remoteDraft, nextLocalDraft)
  const shouldResumeDraft = shouldResumePreferredDraft(
    preferredDraft,
    existingScore,
    hasCommittedScore
  )
  const lastCommittedAt =
    hasCommittedScore && !needsResave ? normalizeDraftUpdatedAt(existingScore?.updatedAt) : ''

  if (sessionFinished) {
    return {
      selectedSlug: null,
      inputs: empty,
      committedBaselineSlug: null,
      committedBaselineInputs: empty,
      draftBaselineSlug: null,
      draftBaselineInputs: empty,
      lastCommittedAt: '',
      lastDraftSavedAt: '',
      isLocked: true,
      baselineSlug: null,
      baselineInputs: empty,
      lastSavedAt: '',
    }
  }

  if (shouldResumeDraft && preferredDraft) {
    const nextDraftSlug = normalizeSlug(preferredDraft.selectedSlug)

    return {
      selectedSlug: nextDraftSlug,
      inputs: preferredDraft.inputs,
      committedBaselineSlug,
      committedBaselineInputs,
      draftBaselineSlug: nextDraftSlug,
      draftBaselineInputs: preferredDraft.inputs,
      lastCommittedAt,
      lastDraftSavedAt: normalizeDraftUpdatedAt(preferredDraft.updatedAt),
      isLocked: Boolean(existingScore?.isLocked),
      baselineSlug: nextDraftSlug,
      baselineInputs: preferredDraft.inputs,
      lastSavedAt: '',
    }
  }

  if (existingScore && (hasCommittedScore || needsResave)) {
    const nextSlug = committedBaselineSlug ?? normalizeSlug(initialSlug)

    return {
      selectedSlug: nextSlug,
      inputs: existingScore.inputs,
      committedBaselineSlug,
      committedBaselineInputs: existingScore.inputs,
      draftBaselineSlug: nextSlug,
      draftBaselineInputs: existingScore.inputs,
      lastCommittedAt,
      lastDraftSavedAt: '',
      isLocked: Boolean(existingScore.isLocked),
      baselineSlug: nextSlug,
      baselineInputs: existingScore.inputs,
      lastSavedAt: lastCommittedAt,
    }
  }

  const nextInitialSlug = normalizeSlug(initialSlug)

  return {
    selectedSlug: nextInitialSlug,
    inputs: empty,
    committedBaselineSlug: null,
    committedBaselineInputs: empty,
    draftBaselineSlug: null,
    draftBaselineInputs: empty,
    lastCommittedAt: '',
    lastDraftSavedAt: '',
    isLocked: false,
    baselineSlug: null,
    baselineInputs: empty,
    lastSavedAt: '',
  }
}
