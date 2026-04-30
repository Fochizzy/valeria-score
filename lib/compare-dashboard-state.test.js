import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCompareHeroCopy,
  buildCompareProgress,
} from './compare-dashboard-state.ts'

test('buildCompareProgress keeps the creator in the finish target when a guest has already saved', () => {
  const result = buildCompareProgress({
    expectedPlayerCount: 1,
    sessionCreatorId: 'host-1',
    entries: [
      {
        dukeSlug: null,
        isGuest: false,
        locked: false,
        userId: 'host-1',
        hasScore: false,
      },
      {
        dukeSlug: 'cornelius_the_dreamer',
        isGuest: true,
        locked: false,
        userId: 'host-1',
        hasScore: true,
      },
    ],
  })

  assert.equal(result.totalParticipants, 2)
  assert.equal(result.readyParticipants, 1)
  assert.equal(result.allReady, false)
  assert.equal(result.progressLabel, '1 of 2 saved')
})

test('buildCompareProgress requires every logged-in session member to save when no guests are present', () => {
  const result = buildCompareProgress({
    expectedPlayerCount: 3,
    sessionCreatorId: 'host-1',
    entries: [
      {
        dukeSlug: null,
        isGuest: false,
        locked: false,
        userId: 'host-1',
        hasScore: false,
      },
      {
        dukeSlug: 'cornelius_the_dreamer',
        isGuest: false,
        locked: false,
        userId: 'player-1',
        hasScore: true,
      },
      {
        dukeSlug: null,
        isGuest: false,
        locked: false,
        userId: 'player-2',
        hasScore: false,
      },
    ],
  })

  assert.equal(result.totalParticipants, 3)
  assert.equal(result.readyParticipants, 1)
  assert.equal(result.allReady, false)
  assert.equal(result.progressLabel, '1 of 3 saved')
})

test('buildCompareProgress counts non-creator players and guest entries in total progress', () => {
  const result = buildCompareProgress({
    expectedPlayerCount: 4,
    sessionCreatorId: 'host-1',
    entries: [
      {
        dukeSlug: null,
        isGuest: false,
        locked: false,
        userId: 'host-1',
        hasScore: false,
      },
      {
        dukeSlug: 'cornelius_the_dreamer',
        isGuest: false,
        locked: false,
        userId: 'player-1',
        hasScore: true,
      },
      {
        dukeSlug: null,
        isGuest: false,
        locked: false,
        userId: 'player-2',
        hasScore: false,
      },
      {
        dukeSlug: null,
        isGuest: true,
        locked: false,
        userId: 'host-1',
        hasScore: false,
      },
    ],
  })

  assert.equal(result.totalParticipants, 4)
  assert.equal(result.readyParticipants, 1)
  assert.equal(result.allReady, false)
  assert.equal(result.progressLabel, '1 of 4 saved')
  assert.equal(result.statusLabel, 'Live')
})

test('buildCompareProgress keeps visible participants in the finish target even when the stored table size is smaller', () => {
  const result = buildCompareProgress({
    expectedPlayerCount: 1,
    sessionCreatorId: 'host-1',
    entries: [
      {
        dukeSlug: null,
        isGuest: false,
        locked: false,
        userId: 'host-1',
        hasScore: false,
      },
      {
        dukeSlug: 'cornelius_the_dreamer',
        isGuest: true,
        locked: false,
        userId: 'host-1',
        hasScore: true,
      },
    ],
  })

  assert.equal(result.totalParticipants, 2)
  assert.equal(result.readyParticipants, 1)
  assert.equal(result.allReady, false)
  assert.equal(result.progressLabel, '1 of 2 saved')
})

test('buildCompareProgress keeps the compare target at at least 2 players even for a solo host', () => {
  const result = buildCompareProgress({
    expectedPlayerCount: 1,
    sessionCreatorId: 'host-1',
    entries: [
      {
        dukeSlug: null,
        isGuest: false,
        locked: false,
        userId: 'host-1',
        hasScore: false,
      },
    ],
  })

  assert.equal(result.totalParticipants, 2)
  assert.equal(result.readyParticipants, 0)
  assert.equal(result.allReady, false)
  assert.equal(result.progressLabel, '0 of 2 saved')
})

test('buildCompareProgress marks the session as finished when every saved entry is locked', () => {
  const result = buildCompareProgress({
    expectedPlayerCount: 3,
    sessionCreatorId: 'host-1',
    entries: [
      {
        dukeSlug: 'cornelius_the_dreamer',
        isGuest: false,
        locked: true,
        userId: 'host-1',
        hasScore: true,
      },
      {
        dukeSlug: 'aguilar_the_gilded_knight',
        isGuest: false,
        locked: true,
        userId: 'player-1',
        hasScore: true,
      },
      {
        dukeSlug: 'reese_the_firebrand',
        isGuest: false,
        locked: true,
        userId: 'player-2',
        hasScore: true,
      },
    ],
  })

  assert.equal(result.totalParticipants, 3)
  assert.equal(result.readyParticipants, 3)
  assert.equal(result.allLocked, true)
  assert.equal(result.allReady, true)
  assert.equal(result.statusLabel, 'Finished')
})

test('buildCompareProgress stays in waiting state when nobody has submitted a duke yet', () => {
  const result = buildCompareProgress({
    expectedPlayerCount: 2,
    sessionCreatorId: 'host-1',
    entries: [
      {
        dukeSlug: null,
        isGuest: false,
        locked: false,
        userId: 'host-1',
        hasScore: false,
      },
      {
        dukeSlug: null,
        isGuest: false,
        locked: false,
        userId: 'player-1',
        hasScore: false,
      },
    ],
  })

  assert.equal(result.totalParticipants, 2)
  assert.equal(result.readyParticipants, 0)
  assert.equal(result.allReady, false)
  assert.equal(result.progressLabel, '0 of 2 saved')
  assert.equal(result.statusLabel, 'Waiting')
})

test('buildCompareProgress falls back to legacy creator filtering when no expected player count exists yet', () => {
  const result = buildCompareProgress({
    sessionCreatorId: 'host-1',
    entries: [
      {
        dukeSlug: null,
        isGuest: false,
        locked: false,
        userId: 'host-1',
        hasScore: false,
      },
      {
        dukeSlug: 'cornelius_the_dreamer',
        isGuest: true,
        locked: false,
        userId: 'host-1',
        hasScore: true,
      },
    ],
  })

  assert.equal(result.totalParticipants, 1)
  assert.equal(result.readyParticipants, 1)
  assert.equal(result.allReady, true)
  assert.equal(result.progressLabel, '1 of 1 saved')
})

test('buildCompareHeroCopy uses static compare guidance without progress counts', () => {
  const hostCopy = buildCompareHeroCopy({ isCreator: true })
  const guestCopy = buildCompareHeroCopy({ isCreator: false })

  assert.equal(
    hostCopy,
    'Set the table size, including guests, and finish the game once every player has saved a score.'
  )
  assert.equal(
    guestCopy,
    'Scores refresh automatically as players save, and the host can finish the game once every player has saved a score.'
  )
  assert.doesNotMatch(hostCopy, /\d+\s+of\s+\d+\s+saved/i)
  assert.doesNotMatch(guestCopy, /\d+\s+of\s+\d+\s+saved/i)
})
