import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildOrderedTiebreakScoreIds,
  getTopScoreTiedEntries,
  hasTopScoreTie,
  isCompleteTiebreakSelection,
} from './finish-tie-resolution.ts'

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
    scoredByUserId: 'user-1',
    dukeSlug: null,
    dukeName: 'No Duke Yet',
    confirmedRevision: 1,
    confirmedForCurrentRevision: true,
    placement: null,
    isWinner: false,
    hasScore: false,
    guestProfileId: null,
    guestEntryId: null,
    ...overrides,
  }
}

test('hasTopScoreTie only returns true when multiple current scores share the lead', () => {
  assert.equal(
    hasTopScoreTie([
      createEntry({ scoreId: 'score-a', hasScore: true, totalScore: 30 }),
      createEntry({ id: 'b', scoreId: 'score-b', hasScore: true, totalScore: 30 }),
      createEntry({ id: 'c', scoreId: 'score-c', hasScore: true, totalScore: 28 }),
    ]),
    true
  )

  assert.equal(
    hasTopScoreTie([
      createEntry({ scoreId: 'score-a', hasScore: true, totalScore: 31 }),
      createEntry({ id: 'b', scoreId: 'score-b', hasScore: true, totalScore: 30 }),
    ]),
    false
  )
})

test('getTopScoreTiedEntries returns only the current top scorers', () => {
  const entries = getTopScoreTiedEntries([
    createEntry({ scoreId: 'score-a', label: 'Alice', hasScore: true, totalScore: 30 }),
    createEntry({ id: 'b', scoreId: 'score-b', label: 'Bob', hasScore: true, totalScore: 30 }),
    createEntry({ id: 'c', scoreId: 'score-c', label: 'Cara', hasScore: true, totalScore: 28 }),
  ])

  assert.deepEqual(
    entries.map((entry) => entry.scoreId),
    ['score-a', 'score-b']
  )
})

test('isCompleteTiebreakSelection requires a unique ranking slot for every top-tied score', () => {
  const tiedEntries = [
    createEntry({ scoreId: 'score-a', hasScore: true, totalScore: 30 }),
    createEntry({ id: 'b', scoreId: 'score-b', hasScore: true, totalScore: 30 }),
    createEntry({ id: 'c', scoreId: 'score-c', hasScore: true, totalScore: 30 }),
  ]

  assert.equal(
    isCompleteTiebreakSelection(tiedEntries, {
      'score-a': 1,
      'score-b': 2,
      'score-c': 3,
    }),
    true
  )

  assert.equal(
    isCompleteTiebreakSelection(tiedEntries, {
      'score-a': 1,
      'score-b': 1,
      'score-c': 3,
    }),
    false
  )
})

test('buildOrderedTiebreakScoreIds returns score ids in the selected final order', () => {
  assert.deepEqual(
    buildOrderedTiebreakScoreIds({
      'score-c': 1,
      'score-a': 2,
      'score-b': 3,
    }),
    ['score-c', 'score-a', 'score-b']
  )
})
