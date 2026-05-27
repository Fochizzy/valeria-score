import assert from 'node:assert/strict'
import test from 'node:test'

import { createEmptyInputs } from './scoring.ts'
import {
  buildScoreDraftStorageKey,
  hasUnsavedScoreChanges,
  resolveLoadedScoreState,
  resolveScoreActionVisibility,
  resolveScoreSessionId,
  resolveScoreScrollResetTarget,
  shouldAutoSaveScoreProgress,
  shouldRefreshScoreLockOnForeground,
  shouldAutoRouteScoreToVictory,
  shouldResetScoreScrollOnDukeSelection,
} from './score-screen-state.ts'

test('resolveScoreSessionId prefers the route session id over the stored session id', () => {
  assert.equal(resolveScoreSessionId('route-session', 'stored-session'), 'route-session')
})

test('resolveScoreSessionId falls back to the stored session id when the route is missing', () => {
  assert.equal(resolveScoreSessionId('', 'stored-session'), 'stored-session')
  assert.equal(resolveScoreSessionId(undefined, 'stored-session'), 'stored-session')
})

test('hasUnsavedScoreChanges stays false when the selected duke and inputs match the baseline', () => {
  const inputs = createEmptyInputs()

  assert.equal(
    hasUnsavedScoreChanges({
      selectedSlug: 'aguilar_the_gilded_knight',
      baselineSlug: 'aguilar_the_gilded_knight',
      inputs,
      baselineInputs: createEmptyInputs(),
    }),
    false
  )
})

test('hasUnsavedScoreChanges detects duke selection changes', () => {
  assert.equal(
    hasUnsavedScoreChanges({
      selectedSlug: 'aguilar_the_gilded_knight',
      baselineSlug: 'cornelius_the_dreamer',
      inputs: createEmptyInputs(),
      baselineInputs: createEmptyInputs(),
    }),
    true
  )
})

test('hasUnsavedScoreChanges detects score input changes', () => {
  const changedInputs = createEmptyInputs()
  changedInputs.vp = 7

  assert.equal(
    hasUnsavedScoreChanges({
      selectedSlug: 'aguilar_the_gilded_knight',
      baselineSlug: 'aguilar_the_gilded_knight',
      inputs: changedInputs,
      baselineInputs: createEmptyInputs(),
    }),
    true
  )
})

test('buildScoreDraftStorageKey scopes drafts to the current score entry', () => {
  assert.equal(
    buildScoreDraftStorageKey({
      sessionId: 'session-1',
    }),
    'score-draft:session-1:player'
  )

  assert.equal(
    buildScoreDraftStorageKey({
      sessionId: 'session-1',
      addedUserId: 'player-42',
    }),
    'score-draft:session-1:added-player:player-42'
  )

  assert.equal(
    buildScoreDraftStorageKey({
      sessionId: 'session-1',
      guestMode: true,
      guestProfileId: 'guest-profile-1',
      guestEntryId: 'guest-entry-1',
    }),
    'score-draft:session-1:guest:guest-profile-1:guest-entry-1'
  )
})

test('resolveLoadedScoreState restores an unsaved draft when no saved score exists yet', () => {
  const draftInputs = createEmptyInputs()
  draftInputs.gold = 3

  const result = resolveLoadedScoreState({
    initialSlug: 'cornelius_the_dreamer',
    localDraft: {
      selectedSlug: 'cornelius_the_dreamer',
      inputs: draftInputs,
      updatedAt: '2026-05-27T18:00:00.000Z',
    },
    sessionFinished: false,
  })

  assert.equal(result.selectedSlug, 'cornelius_the_dreamer')
  assert.deepEqual(result.inputs, draftInputs)
  assert.equal(result.committedBaselineSlug, null)
  assert.deepEqual(result.committedBaselineInputs, createEmptyInputs())
  assert.equal(result.draftBaselineSlug, 'cornelius_the_dreamer')
  assert.deepEqual(result.draftBaselineInputs, draftInputs)
  assert.equal(result.isLocked, false)
  assert.equal(result.lastCommittedAt, '')
  assert.equal(result.lastDraftSavedAt, '2026-05-27T18:00:00.000Z')
})

test('resolveLoadedScoreState keeps placeholder guest rows editable until a duke is saved', () => {
  const result = resolveLoadedScoreState({
    initialSlug: null,
    existingScore: {
      selectedSlug: null,
      inputs: createEmptyInputs(),
      updatedAt: '2026-05-02T12:00:00.000Z',
      isLocked: false,
    },
    sessionFinished: false,
  })

  assert.equal(result.selectedSlug, null)
  assert.deepEqual(result.inputs, createEmptyInputs())
  assert.equal(result.committedBaselineSlug, null)
  assert.deepEqual(result.committedBaselineInputs, createEmptyInputs())
  assert.equal(result.draftBaselineSlug, null)
  assert.deepEqual(result.draftBaselineInputs, createEmptyInputs())
  assert.equal(result.isLocked, false)
  assert.equal(result.lastCommittedAt, '')
  assert.equal(result.lastDraftSavedAt, '')
})

test('resolveLoadedScoreState clears the submitted state for reopened scores that still need a re-save', () => {
  const reopenedInputs = {
    ...createEmptyInputs(),
    gold: 4,
  }

  const result = resolveLoadedScoreState({
    initialSlug: 'cornelius_the_dreamer',
    existingScore: {
      selectedSlug: 'cornelius_the_dreamer',
      inputs: reopenedInputs,
      updatedAt: '2026-05-25T12:00:00.000Z',
      isLocked: false,
      confirmedForCurrentRevision: false,
    },
    sessionFinished: false,
  })

  assert.equal(result.selectedSlug, 'cornelius_the_dreamer')
  assert.deepEqual(result.inputs, reopenedInputs)
  assert.equal(result.committedBaselineSlug, 'cornelius_the_dreamer')
  assert.deepEqual(result.committedBaselineInputs, reopenedInputs)
  assert.equal(result.draftBaselineSlug, 'cornelius_the_dreamer')
  assert.deepEqual(result.draftBaselineInputs, reopenedInputs)
  assert.equal(result.isLocked, false)
  assert.equal(result.lastCommittedAt, '')
  assert.equal(result.lastDraftSavedAt, '')
})

test('resolveLoadedScoreState locks an unfinished entry when the session is already finished', () => {
  const result = resolveLoadedScoreState({
    initialSlug: 'cornelius_the_dreamer',
    localDraft: {
      selectedSlug: 'cornelius_the_dreamer',
      inputs: {
        ...createEmptyInputs(),
        gold: 2,
      },
      updatedAt: '2026-05-27T18:00:00.000Z',
    },
    sessionFinished: true,
  })

  assert.equal(result.selectedSlug, null)
  assert.deepEqual(result.inputs, createEmptyInputs())
  assert.equal(result.committedBaselineSlug, null)
  assert.deepEqual(result.committedBaselineInputs, createEmptyInputs())
  assert.equal(result.draftBaselineSlug, null)
  assert.deepEqual(result.draftBaselineInputs, createEmptyInputs())
  assert.equal(result.isLocked, true)
  assert.equal(result.lastCommittedAt, '')
  assert.equal(result.lastDraftSavedAt, '')
})

test('resolveLoadedScoreState prefers the newer remote draft over the committed score', () => {
  const committedInputs = {
    ...createEmptyInputs(),
    gold: 1,
  }
  const remoteDraftInputs = {
    ...createEmptyInputs(),
    gold: 4,
  }

  const result = resolveLoadedScoreState({
    initialSlug: 'aguilar_the_gilded_knight',
    existingScore: {
      selectedSlug: 'aguilar_the_gilded_knight',
      inputs: committedInputs,
      updatedAt: '2026-05-27T17:00:00.000Z',
      isLocked: false,
      confirmedForCurrentRevision: true,
    },
    remoteDraft: {
      selectedSlug: 'cornelius_the_dreamer',
      inputs: remoteDraftInputs,
      updatedAt: '2026-05-27T18:00:00.000Z',
    },
    localDraft: null,
    sessionFinished: false,
  })

  assert.equal(result.selectedSlug, 'cornelius_the_dreamer')
  assert.deepEqual(result.inputs, remoteDraftInputs)
  assert.equal(result.committedBaselineSlug, 'aguilar_the_gilded_knight')
  assert.deepEqual(result.committedBaselineInputs, committedInputs)
  assert.equal(result.draftBaselineSlug, 'cornelius_the_dreamer')
  assert.deepEqual(result.draftBaselineInputs, remoteDraftInputs)
  assert.equal(result.lastCommittedAt, '2026-05-27T17:00:00.000Z')
  assert.equal(result.lastDraftSavedAt, '2026-05-27T18:00:00.000Z')
})

test('resolveLoadedScoreState keeps the committed score when it is newer than the available draft', () => {
  const committedInputs = {
    ...createEmptyInputs(),
    gold: 6,
  }
  const staleDraftInputs = {
    ...createEmptyInputs(),
    gold: 2,
  }

  const result = resolveLoadedScoreState({
    initialSlug: 'aguilar_the_gilded_knight',
    existingScore: {
      selectedSlug: 'aguilar_the_gilded_knight',
      inputs: committedInputs,
      updatedAt: '2026-05-27T18:05:00.000Z',
      isLocked: false,
      confirmedForCurrentRevision: true,
    },
    localDraft: {
      selectedSlug: 'cornelius_the_dreamer',
      inputs: staleDraftInputs,
      updatedAt: '2026-05-27T18:00:00.000Z',
    },
    sessionFinished: false,
  })

  assert.equal(result.selectedSlug, 'aguilar_the_gilded_knight')
  assert.deepEqual(result.inputs, committedInputs)
  assert.equal(result.committedBaselineSlug, 'aguilar_the_gilded_knight')
  assert.deepEqual(result.committedBaselineInputs, committedInputs)
  assert.equal(result.draftBaselineSlug, 'aguilar_the_gilded_knight')
  assert.deepEqual(result.draftBaselineInputs, committedInputs)
  assert.equal(result.lastCommittedAt, '2026-05-27T18:05:00.000Z')
  assert.equal(result.lastDraftSavedAt, '')
})

test('resolveLoadedScoreState prefers the newer local draft when it beats the remote timestamp', () => {
  const result = resolveLoadedScoreState({
    initialSlug: null,
    existingScore: null,
    remoteDraft: {
      selectedSlug: 'aguilar_the_gilded_knight',
      inputs: {
        ...createEmptyInputs(),
        gold: 2,
      },
      updatedAt: '2026-05-27T18:00:00.000Z',
    },
    localDraft: {
      selectedSlug: 'cornelius_the_dreamer',
      inputs: {
        ...createEmptyInputs(),
        gold: 5,
      },
      updatedAt: '2026-05-27T18:01:00.000Z',
    },
    sessionFinished: false,
  })

  assert.equal(result.selectedSlug, 'cornelius_the_dreamer')
  assert.equal(result.lastDraftSavedAt, '2026-05-27T18:01:00.000Z')
})

test('shouldResetScoreScrollOnDukeSelection only resets when a new duke is chosen', () => {
  assert.equal(shouldResetScoreScrollOnDukeSelection(null, 'aguilar_the_gilded_knight'), true)
  assert.equal(
    shouldResetScoreScrollOnDukeSelection('aguilar_the_gilded_knight', 'cornelius_the_dreamer'),
    true
  )
  assert.equal(
    shouldResetScoreScrollOnDukeSelection('aguilar_the_gilded_knight', 'aguilar_the_gilded_knight'),
    false
  )
  assert.equal(shouldResetScoreScrollOnDukeSelection('aguilar_the_gilded_knight', ''), false)
})

test('resolveScoreScrollResetTarget clamps the score-area anchor to a valid scroll position', () => {
  assert.equal(resolveScoreScrollResetTarget(236), 236)
  assert.equal(resolveScoreScrollResetTarget(-14), 0)
  assert.equal(resolveScoreScrollResetTarget(Number.NaN), 0)
})

test('resolveScoreActionVisibility hides the total card and compare footer action until a duke is selected', () => {
  assert.deepEqual(resolveScoreActionVisibility(null), {
    showTotalCard: false,
    showFooterCompareButton: false,
  })

  assert.deepEqual(resolveScoreActionVisibility('   '), {
    showTotalCard: false,
    showFooterCompareButton: false,
  })

  assert.deepEqual(resolveScoreActionVisibility('cornelius_the_dreamer'), {
    showTotalCard: true,
    showFooterCompareButton: true,
  })
})

test('shouldAutoSaveScoreProgress enables background persistence only for a dirty open score entry', () => {
  assert.equal(
    shouldAutoSaveScoreProgress({
      sessionId: 'session-1',
      selectedSlug: 'cornelius_the_dreamer',
      isDirty: true,
      isLocked: false,
      resolvingSession: false,
      loadingExisting: false,
      isSavingManually: false,
      hasLoadError: false,
    }),
    true
  )
})

test('shouldAutoSaveScoreProgress stays off while the score screen is missing context or blocked', () => {
  assert.equal(
    shouldAutoSaveScoreProgress({
      sessionId: '',
      selectedSlug: 'cornelius_the_dreamer',
      isDirty: true,
      isLocked: false,
      resolvingSession: false,
      loadingExisting: false,
      isSavingManually: false,
      hasLoadError: false,
    }),
    false
  )

  assert.equal(
    shouldAutoSaveScoreProgress({
      sessionId: 'session-1',
      selectedSlug: null,
      isDirty: true,
      isLocked: false,
      resolvingSession: false,
      loadingExisting: false,
      isSavingManually: false,
      hasLoadError: false,
    }),
    false
  )

  assert.equal(
    shouldAutoSaveScoreProgress({
      sessionId: 'session-1',
      selectedSlug: 'cornelius_the_dreamer',
      isDirty: false,
      isLocked: false,
      resolvingSession: false,
      loadingExisting: false,
      isSavingManually: false,
      hasLoadError: false,
    }),
    false
  )

  assert.equal(
    shouldAutoSaveScoreProgress({
      sessionId: 'session-1',
      selectedSlug: 'cornelius_the_dreamer',
      isDirty: true,
      isLocked: true,
      resolvingSession: false,
      loadingExisting: false,
      isSavingManually: false,
      hasLoadError: false,
    }),
    false
  )

  assert.equal(
    shouldAutoSaveScoreProgress({
      sessionId: 'session-1',
      selectedSlug: 'cornelius_the_dreamer',
      isDirty: true,
      isLocked: false,
      resolvingSession: true,
      loadingExisting: false,
      isSavingManually: false,
      hasLoadError: false,
    }),
    false
  )

  assert.equal(
    shouldAutoSaveScoreProgress({
      sessionId: 'session-1',
      selectedSlug: 'cornelius_the_dreamer',
      isDirty: true,
      isLocked: false,
      resolvingSession: false,
      loadingExisting: true,
      isSavingManually: false,
      hasLoadError: false,
    }),
    false
  )

  assert.equal(
    shouldAutoSaveScoreProgress({
      sessionId: 'session-1',
      selectedSlug: 'cornelius_the_dreamer',
      isDirty: true,
      isLocked: false,
      resolvingSession: false,
      loadingExisting: false,
      isSavingManually: true,
      hasLoadError: false,
    }),
    false
  )

  assert.equal(
    shouldAutoSaveScoreProgress({
      sessionId: 'session-1',
      selectedSlug: 'cornelius_the_dreamer',
      isDirty: true,
      isLocked: false,
      resolvingSession: false,
      loadingExisting: false,
      isSavingManually: false,
      hasLoadError: true,
    }),
    false
  )
})

test('shouldAutoRouteScoreToVictory only closes out a score screen when the session just became locked', () => {
  assert.equal(
    shouldAutoRouteScoreToVictory({
      sessionId: 'session-1',
      isLocked: true,
      wasLocked: false,
      alreadyRouted: false,
    }),
    true
  )

  assert.equal(
    shouldAutoRouteScoreToVictory({
      sessionId: 'session-1',
      isLocked: true,
      wasLocked: true,
      alreadyRouted: false,
    }),
    false
  )

  assert.equal(
    shouldAutoRouteScoreToVictory({
      sessionId: 'session-1',
      isLocked: false,
      wasLocked: false,
      alreadyRouted: false,
    }),
    false
  )

  assert.equal(
    shouldAutoRouteScoreToVictory({
      sessionId: '',
      isLocked: true,
      wasLocked: false,
      alreadyRouted: false,
    }),
    false
  )

  assert.equal(
    shouldAutoRouteScoreToVictory({
      sessionId: 'session-1',
      isLocked: true,
      wasLocked: false,
      alreadyRouted: true,
    }),
    false
  )
})

test('shouldAutoRouteScoreToVictory also closes out a score screen that loads after the session is already finished', () => {
  assert.equal(
    shouldAutoRouteScoreToVictory({
      sessionId: 'session-1',
      isLocked: true,
      wasLocked: null,
      alreadyRouted: false,
    }),
    true
  )
})

test('shouldRefreshScoreLockOnForeground only reloads when an unlocked session is now fully locked', () => {
  assert.equal(
    shouldRefreshScoreLockOnForeground({
      sessionId: 'session-1',
      isLocked: false,
      totalEntries: 3,
      lockedEntries: 3,
    }),
    true
  )

  assert.equal(
    shouldRefreshScoreLockOnForeground({
      sessionId: 'session-1',
      isLocked: true,
      totalEntries: 3,
      lockedEntries: 3,
    }),
    false
  )

  assert.equal(
    shouldRefreshScoreLockOnForeground({
      sessionId: 'session-1',
      isLocked: false,
      totalEntries: 3,
      lockedEntries: 2,
    }),
    false
  )

  assert.equal(
    shouldRefreshScoreLockOnForeground({
      sessionId: '',
      isLocked: false,
      totalEntries: 3,
      lockedEntries: 3,
    }),
    false
  )
})
