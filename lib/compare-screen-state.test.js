import assert from 'node:assert/strict'
import test from 'node:test'

import * as compareScreenState from './compare-screen-state.ts'

const {
  buildCompareDashboardModel,
  buildCompareEntryStatusText,
  countCommittedCompareEntries,
  countSavedCompareEntries,
  getCompareEntryStatusTone,
  resolveCompareLeader,
  shouldAutoRouteCompareViewerToVictory,
} = compareScreenState

function createEntry(overrides = {}) {
  return {
    id: 'entry-1',
    scoreId: 'score-1',
    label: 'Player',
    playerId: 'PLAYER',
    totalScore: 0,
    locked: false,
    isGuest: false,
    userId: 'user-1',
    dukeSlug: null,
    dukeName: 'No Duke Yet',
    placement: null,
    isWinner: false,
    hasScore: false,
    guestProfileId: null,
    guestEntryId: null,
    ...overrides,
  }
}

test('buildCompareDashboardModel combines counts, progress, and leader selection', () => {
  const entries = [
    createEntry({
      id: 'host',
      userId: 'host-1',
      dukeSlug: 'cornelius_the_dreamer',
      totalScore: 27,
      hasScore: true,
    }),
    createEntry({
      id: 'guest',
      isGuest: true,
      userId: 'host-1',
      dukeSlug: 'aguilar_the_gilded_knight',
      totalScore: 31,
      hasScore: true,
      placement: 1,
      isWinner: true,
    }),
    createEntry({
      id: 'pending',
      userId: 'player-2',
      label: 'Bob',
    }),
  ]

  const result = buildCompareDashboardModel({
    entries,
    sessionCreatorId: 'host-1',
    expectedPlayerCount: 3,
  })

  assert.equal(result.committedScoreCount, 2)
  assert.equal(result.savedScoreCount, 2)
  assert.equal(result.minimumPlayerCount, 3)
  assert.equal(result.requiredScoreCount, 3)
  assert.equal(result.canFinishScores, false)
  assert.equal(result.finishBlockTitle, 'Scores still missing')
  assert.equal(result.progress.progressLabel, '2 of 3 saved')
  assert.equal(result.leader?.id, 'host')
})

test('buildCompareDashboardModel exposes finish-game guidance when nobody has saved yet', () => {
  const result = buildCompareDashboardModel({
    entries: [
      createEntry({ id: 'host', userId: 'host-1' }),
      createEntry({ id: 'player-2', userId: 'player-2', label: 'Bob' }),
    ],
    sessionCreatorId: 'host-1',
    expectedPlayerCount: 2,
  })

  assert.equal(result.requiredScoreCount, 2)
  assert.equal(result.canFinishScores, false)
  assert.equal(result.finishBlockTitle, 'No scores yet')
  assert.equal(
    result.finishBlockBody,
    'Add at least one score before finishing the game.'
  )
})

test('buildCompareDashboardModel blocks finish until every visible participant has saved', () => {
  const result = buildCompareDashboardModel({
    entries: [
      createEntry({
        id: 'host',
        userId: 'host-1',
        label: 'Izzy',
      }),
      createEntry({
        id: 'guest',
        isGuest: true,
        userId: 'host-1',
        label: 'GuestOne',
        dukeSlug: 'cornelius_the_dreamer',
        hasScore: true,
      }),
    ],
    sessionCreatorId: 'host-1',
    expectedPlayerCount: 1,
  })

  assert.equal(result.requiredScoreCount, 2)
  assert.equal(result.canFinishScores, false)
  assert.equal(result.minimumPlayerCount, 2)
  assert.equal(result.finishBlockTitle, 'Scores still missing')
  assert.equal(
    result.finishBlockBody,
    '1 of 2 players have saved so far. Finish the remaining scores before locking the game.'
  )
  assert.equal(result.progress.progressLabel, '1 of 2 saved')
  assert.equal(result.progress.allReady, false)
})

test('count helpers separate committed entries from saved entries', () => {
  const entries = [
    createEntry({ id: 'saved', dukeSlug: 'duke', hasScore: true }),
    createEntry({ id: 'locked', dukeSlug: 'duke-2', hasScore: true, locked: true }),
    createEntry({ id: 'pending' }),
  ]

  assert.equal(countCommittedCompareEntries(entries), 2)
  assert.equal(countSavedCompareEntries(entries), 2)
})

test('resolveCompareLeader returns the first saved entry and skips pending rows', () => {
  const entries = [
    createEntry({ id: 'pending' }),
    createEntry({ id: 'saved', dukeSlug: 'duke', hasScore: true }),
    createEntry({ id: 'locked', dukeSlug: 'duke-2', hasScore: true, locked: true }),
  ]

  assert.equal(resolveCompareLeader(entries)?.id, 'saved')
})

test('row status helpers keep compare copy consistent', () => {
  const pendingEntry = createEntry()
  const openEntry = createEntry({ dukeSlug: 'duke', hasScore: true })
  const lockedEntry = createEntry({ dukeSlug: 'duke', hasScore: true, locked: true })

  assert.equal(getCompareEntryStatusTone(pendingEntry), 'pending')
  assert.equal(getCompareEntryStatusTone(openEntry), 'open')
  assert.equal(getCompareEntryStatusTone(lockedEntry), 'locked')
  assert.equal(buildCompareEntryStatusText(pendingEntry), 'Waiting to score')
  assert.equal(
    buildCompareEntryStatusText(openEntry, { isEditable: true }),
    'Saved | Tap to edit'
  )
  assert.equal(buildCompareEntryStatusText(lockedEntry), 'Locked')
})

test('buildCompareSessionContextItems returns join code, role, and live status metadata', () => {
  assert.equal(typeof compareScreenState.buildCompareSessionContextItems, 'function')

  const items = compareScreenState.buildCompareSessionContextItems({
    joinCode: '',
    isCreator: false,
    livePulse: true,
    statusLabel: 'Waiting',
  })

  assert.deepEqual(items, [
    {
      label: 'Join Code',
      value: '------',
      tone: 'accent',
      disabled: true,
      showCopyIcon: false,
    },
    {
      label: 'Role',
      value: 'Player view',
      tone: 'default',
    },
    {
      label: 'Status',
      value: 'Live update',
      tone: 'success',
      showPulse: true,
    },
  ])
})

test('resolveComparePlayerTargetButtonState keeps table size controls host-only', () => {
  assert.equal(typeof compareScreenState.resolveComparePlayerTargetButtonState, 'function')

  assert.deepEqual(
    compareScreenState.resolveComparePlayerTargetButtonState({
      isCreator: true,
      savingPlayerTarget: false,
      expectedPlayerCount: 4,
      minimumPlayerCount: 2,
    }),
    {
      canDecreasePlayerCount: true,
      canIncreasePlayerCount: true,
    }
  )

  assert.deepEqual(
    compareScreenState.resolveComparePlayerTargetButtonState({
      isCreator: false,
      savingPlayerTarget: false,
      expectedPlayerCount: 4,
      minimumPlayerCount: 2,
    }),
    {
      canDecreasePlayerCount: false,
      canIncreasePlayerCount: false,
    }
  )
})

test('resolveComparePlayerTargetButtonState enforces the compare table bounds', () => {
  assert.equal(typeof compareScreenState.resolveComparePlayerTargetButtonState, 'function')

  assert.deepEqual(
    compareScreenState.resolveComparePlayerTargetButtonState({
      isCreator: true,
      savingPlayerTarget: false,
      expectedPlayerCount: 2,
      minimumPlayerCount: 2,
    }),
    {
      canDecreasePlayerCount: false,
      canIncreasePlayerCount: true,
    }
  )

  assert.deepEqual(
    compareScreenState.resolveComparePlayerTargetButtonState({
      isCreator: true,
      savingPlayerTarget: false,
      expectedPlayerCount: 5,
      minimumPlayerCount: 2,
    }),
    {
      canDecreasePlayerCount: true,
      canIncreasePlayerCount: false,
    }
  )
})

test('buildComparePlayerCountChoices clamps compare table-size options to 2 through 5 players', () => {
  assert.equal(typeof compareScreenState.buildComparePlayerCountChoices, 'function')

  assert.deepEqual(
    compareScreenState.buildComparePlayerCountChoices({
      expectedPlayerCount: 1,
      minimumPlayerCount: 1,
    }),
    [
      { value: 2, selected: true, disabled: false },
      { value: 3, selected: false, disabled: false },
      { value: 4, selected: false, disabled: false },
      { value: 5, selected: false, disabled: false },
    ]
  )
})

test('buildComparePlayerCountChoices never offers 6 players on compare', () => {
  assert.equal(typeof compareScreenState.buildComparePlayerCountChoices, 'function')

  assert.deepEqual(
    compareScreenState.buildComparePlayerCountChoices({
      expectedPlayerCount: 6,
      minimumPlayerCount: 4,
    }),
    [
      { value: 4, selected: false, disabled: false },
      { value: 5, selected: true, disabled: false },
    ]
  )
})

test('shouldAutoRouteCompareViewerToVictory closes out any locked compare screen once the session is finished', () => {
  assert.equal(typeof shouldAutoRouteCompareViewerToVictory, 'function')

  assert.equal(
    shouldAutoRouteCompareViewerToVictory({
      sessionId: 'session-1',
      isCreator: false,
      allLocked: true,
      alreadyRouted: false,
    }),
    true
  )

  assert.equal(
    shouldAutoRouteCompareViewerToVictory({
      sessionId: 'session-1',
      isCreator: true,
      allLocked: true,
      alreadyRouted: false,
    }),
    true
  )

  assert.equal(
    shouldAutoRouteCompareViewerToVictory({
      sessionId: 'session-1',
      isCreator: false,
      allLocked: false,
      alreadyRouted: false,
    }),
    false
  )

  assert.equal(
    shouldAutoRouteCompareViewerToVictory({
      sessionId: '',
      isCreator: false,
      allLocked: true,
      alreadyRouted: false,
    }),
    false
  )

  assert.equal(
    shouldAutoRouteCompareViewerToVictory({
      sessionId: 'session-1',
      isCreator: false,
      allLocked: true,
      alreadyRouted: true,
    }),
    false
  )
})
