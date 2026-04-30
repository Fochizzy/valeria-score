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
    draft: {
      selectedSlug: 'cornelius_the_dreamer',
      inputs: draftInputs,
    },
    sessionFinished: false,
  })

  assert.equal(result.selectedSlug, 'cornelius_the_dreamer')
  assert.deepEqual(result.inputs, draftInputs)
  assert.equal(result.baselineSlug, null)
  assert.deepEqual(result.baselineInputs, createEmptyInputs())
  assert.equal(result.isLocked, false)
  assert.equal(result.lastSavedAt, '')
})

test('resolveLoadedScoreState locks an unfinished entry when the session is already finished', () => {
  const result = resolveLoadedScoreState({
    initialSlug: 'cornelius_the_dreamer',
    draft: {
      selectedSlug: 'cornelius_the_dreamer',
      inputs: {
        ...createEmptyInputs(),
        gold: 2,
      },
    },
    sessionFinished: true,
  })

  assert.equal(result.selectedSlug, null)
  assert.deepEqual(result.inputs, createEmptyInputs())
  assert.equal(result.baselineSlug, null)
  assert.deepEqual(result.baselineInputs, createEmptyInputs())
  assert.equal(result.isLocked, true)
  assert.equal(result.lastSavedAt, '')
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
