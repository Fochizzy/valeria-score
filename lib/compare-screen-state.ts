import { buildCompareProgress } from './compare-dashboard-state.ts'
import {
  MAX_COMPARE_PLAYER_COUNT,
  clampComparePlayerCount,
} from './compare-player-count.ts'
import type { CompareEntry } from './compare-entries.ts'
import { sessionUiCopy } from './p3-feedback.ts'

type BuildCompareDashboardModelInput = {
  entries: CompareEntry[]
  sessionCreatorId: string
  expectedPlayerCount: number
}

type ShouldAutoRouteCompareViewerToVictoryInput = {
  sessionId: string | null | undefined
  isCreator: boolean
  allLocked: boolean
  alreadyRouted?: boolean
}

export type CompareEntryStatusTone = 'pending' | 'locked' | 'open'
export type CompareSessionContextTone = 'accent' | 'default' | 'warning' | 'success'

type CompareSessionContextItem = {
  label: string
  value: string
  tone: CompareSessionContextTone
  disabled?: boolean
  showPulse?: boolean
  showCopyIcon?: boolean
}

type BuildCompareSessionContextItemsInput = {
  joinCode: string | null | undefined
  isCreator: boolean
  livePulse: boolean
  statusLabel: string
}

type ResolveComparePlayerTargetButtonStateInput = {
  isCreator: boolean
  savingPlayerTarget: boolean
  expectedPlayerCount: number
  minimumPlayerCount: number
}

type BuildComparePlayerCountChoicesInput = {
  expectedPlayerCount: number
  minimumPlayerCount: number
  maximumPlayerCount?: number
  disabled?: boolean
}

export type ComparePlayerCountChoice = {
  value: number
  selected: boolean
  disabled: boolean
}

const DEFAULT_MAX_COMPARE_PLAYER_COUNT = MAX_COMPARE_PLAYER_COUNT

function buildCompareProgressEntries(entries: CompareEntry[]) {
  return entries.map((entry) => ({
    dukeSlug: entry.dukeSlug,
    isGuest: entry.isGuest,
    locked: entry.locked,
    userId: entry.userId,
    hasScore: entry.hasScore,
  }))
}

export function countCommittedCompareEntries(entries: CompareEntry[]) {
  return entries.filter((entry) => entry.hasScore).length
}

export function countSavedCompareEntries(entries: CompareEntry[]) {
  return entries.filter((entry) => entry.locked || entry.hasScore).length
}

export function resolveCompareLeader(entries: CompareEntry[]) {
  return entries.find((entry) => entry.locked || entry.hasScore) ?? null
}

function buildCompareFinishState(
  savedScoreCount: number,
  expectedPlayerCount: number,
  committedScoreCount: number,
  presentParticipantCount: number
) {
  const requiredScoreCount = Math.max(
    expectedPlayerCount,
    committedScoreCount,
    presentParticipantCount
  )

  if (savedScoreCount === 0) {
    return {
      requiredScoreCount,
      canFinishScores: false,
      finishBlockTitle: 'No scores yet',
      finishBlockBody: 'Add at least one score before finishing the game.',
    }
  }

  if (savedScoreCount < requiredScoreCount) {
    return {
      requiredScoreCount,
      canFinishScores: false,
      finishBlockTitle: 'Scores still missing',
      finishBlockBody: `${savedScoreCount} of ${requiredScoreCount} players have saved so far. Finish the remaining scores before locking the game.`,
    }
  }

  return {
    requiredScoreCount,
    canFinishScores: true,
    finishBlockTitle: null,
    finishBlockBody: null,
  }
}

export function getCompareSessionStatusTone({
  livePulse,
  statusLabel,
}: Pick<BuildCompareSessionContextItemsInput, 'livePulse' | 'statusLabel'>): CompareSessionContextTone {
  if (livePulse || statusLabel === 'Finished') {
    return 'success'
  }

  if (statusLabel === 'Waiting') {
    return 'warning'
  }

  return 'default'
}

export function buildCompareSessionContextItems({
  joinCode,
  isCreator,
  livePulse,
  statusLabel,
}: BuildCompareSessionContextItemsInput): CompareSessionContextItem[] {
  const copyableJoinCode = String(joinCode ?? '').trim()
  const safeJoinCode = copyableJoinCode || '------'

  const statusTone = getCompareSessionStatusTone({ livePulse, statusLabel })
  const statusValue = livePulse ? 'Live update' : statusLabel
  const isStatusPulsing = livePulse || statusValue === 'Waiting'

  return [
    {
      label: sessionUiCopy.joinCodeLabel,
      value: safeJoinCode,
      tone: 'accent',
      disabled: !copyableJoinCode,
      showCopyIcon: copyableJoinCode.length > 0,
    },
    {
      label: 'Role',
      value: isCreator ? 'Host controls' : 'Player view',
      tone: 'default',
    },
    {
      label: 'Status',
      value: statusValue,
      tone: statusTone,
      showPulse: isStatusPulsing,
    },
  ]
}

export function resolveComparePlayerTargetButtonState({
  isCreator,
  savingPlayerTarget,
  expectedPlayerCount,
  minimumPlayerCount,
}: ResolveComparePlayerTargetButtonStateInput) {
  const safeExpectedPlayerCount = clampComparePlayerCount(expectedPlayerCount)
  const safeMinimumPlayerCount = clampComparePlayerCount(minimumPlayerCount)
  const canChangePlayerCount = isCreator && !savingPlayerTarget

  return {
    canDecreasePlayerCount:
      canChangePlayerCount && safeExpectedPlayerCount > safeMinimumPlayerCount,
    canIncreasePlayerCount:
      canChangePlayerCount && safeExpectedPlayerCount < MAX_COMPARE_PLAYER_COUNT,
  }
}

export function buildComparePlayerCountChoices({
  expectedPlayerCount,
  minimumPlayerCount,
  maximumPlayerCount = DEFAULT_MAX_COMPARE_PLAYER_COUNT,
  disabled = false,
}: BuildComparePlayerCountChoicesInput): ComparePlayerCountChoice[] {
  const safeMinimumPlayerCount = clampComparePlayerCount(minimumPlayerCount)
  const safeExpectedPlayerCount = clampComparePlayerCount(expectedPlayerCount)
  const safeMaximumPlayerCount = Math.max(
    safeMinimumPlayerCount,
    clampComparePlayerCount(maximumPlayerCount)
  )
  const choices: ComparePlayerCountChoice[] = []

  for (let value = safeMinimumPlayerCount; value <= safeMaximumPlayerCount; value += 1) {
    choices.push({
      value,
      selected: value === safeExpectedPlayerCount,
      disabled,
    })
  }

  return choices
}

export function buildCompareDashboardModel({
  entries,
  sessionCreatorId,
  expectedPlayerCount,
}: BuildCompareDashboardModelInput) {
  const committedScoreCount = countCommittedCompareEntries(entries)
  const savedScoreCount = countSavedCompareEntries(entries)
  const progress = buildCompareProgress({
    entries: buildCompareProgressEntries(entries),
    sessionCreatorId,
    expectedPlayerCount,
  })
  const finishState = buildCompareFinishState(
    savedScoreCount,
    expectedPlayerCount,
    committedScoreCount,
    progress.trackedParticipants
  )

  return {
    committedScoreCount,
    savedScoreCount,
    progress,
    leader: resolveCompareLeader(entries),
    minimumPlayerCount: clampComparePlayerCount(progress.trackedParticipants),
    ...finishState,
  }
}

export function shouldAutoRouteCompareViewerToVictory({
  sessionId,
  isCreator: _isCreator,
  allLocked,
  alreadyRouted = false,
}: ShouldAutoRouteCompareViewerToVictoryInput) {
  const safeSessionId = String(sessionId ?? '').trim()

  return Boolean(safeSessionId) && allLocked && !alreadyRouted
}

export function getCompareEntryStatusTone(
  entry: Pick<CompareEntry, 'hasScore' | 'locked'>
): CompareEntryStatusTone {
  if (!entry.hasScore) return 'pending'
  if (entry.locked) return 'locked'
  return 'open'
}

export function buildCompareEntryStatusText(
  entry: Pick<CompareEntry, 'hasScore' | 'locked'>,
  options: { isEditable?: boolean } = {}
) {
  const baseText = !entry.hasScore
    ? 'Waiting to score'
    : entry.locked
    ? sessionUiCopy.lockedState
    : sessionUiCopy.savedState

  return options.isEditable ? `${baseText} | Tap to edit` : baseText
}
