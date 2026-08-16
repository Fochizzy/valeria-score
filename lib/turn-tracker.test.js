import assert from 'node:assert/strict'
import test from 'node:test'

import {
  advanceRound,
  buildTurnTrackerStorageKey,
  clampSeatCount,
  createInitialTurnTrackerState,
  cycleSeatCount,
  parseTurnTrackerState,
  rewindRound,
} from './turn-tracker.ts'

test('initial state starts at round one, seat one', () => {
  assert.deepEqual(createInitialTurnTrackerState(), {
    round: 1,
    firstSeat: 1,
    seatCount: 4,
  })
})

test('advanceRound bumps the round and rotates the first player', () => {
  let state = createInitialTurnTrackerState(3)

  state = advanceRound(state)
  assert.deepEqual(state, { round: 2, firstSeat: 2, seatCount: 3 })

  state = advanceRound(state)
  state = advanceRound(state)
  // Wraps back to seat 1 after a full rotation.
  assert.deepEqual(state, { round: 4, firstSeat: 1, seatCount: 3 })
})

test('rewindRound undoes advanceRound exactly', () => {
  const start = createInitialTurnTrackerState(5)
  const forward = advanceRound(advanceRound(start))
  const back = rewindRound(rewindRound(forward))

  assert.deepEqual(back, start)
})

test('rewindRound refuses to go below round one', () => {
  const start = createInitialTurnTrackerState(4)

  assert.deepEqual(rewindRound(start), start)
})

test('cycleSeatCount wraps from max back to min and clamps first seat', () => {
  let state = { round: 3, firstSeat: 5, seatCount: 5 }

  state = cycleSeatCount(state)
  assert.deepEqual(state, { round: 3, firstSeat: 2, seatCount: 2 })

  state = cycleSeatCount(state)
  assert.equal(state.seatCount, 3)
})

test('clampSeatCount bounds table sizes', () => {
  assert.equal(clampSeatCount(1), 2)
  assert.equal(clampSeatCount(9), 5)
  assert.equal(clampSeatCount(NaN), 4)
})

test('parseTurnTrackerState round-trips valid state and rejects junk', () => {
  const state = { round: 6, firstSeat: 3, seatCount: 4 }

  assert.deepEqual(parseTurnTrackerState(JSON.stringify(state)), state)
  assert.equal(parseTurnTrackerState(null), null)
  assert.equal(parseTurnTrackerState('not json'), null)
  assert.equal(parseTurnTrackerState('{"round":"x"}'), null)
})

test('parseTurnTrackerState clamps out-of-range values', () => {
  const parsed = parseTurnTrackerState(
    JSON.stringify({ round: 0, firstSeat: 9, seatCount: 11 })
  )

  assert.deepEqual(parsed, { round: 1, firstSeat: 5, seatCount: 5 })
})

test('storage key is namespaced per session', () => {
  assert.equal(buildTurnTrackerStorageKey('abc'), 'turn-tracker:abc')
})
