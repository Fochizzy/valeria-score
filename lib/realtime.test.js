import assert from 'node:assert/strict'
import test from 'node:test'

import {
  didSessionScoreLock,
  shouldAutoRouteToVictoryOnLock,
} from './session-score-lock.ts'

test('didSessionScoreLock only reacts to game_locked transitions', () => {
  assert.equal(
    didSessionScoreLock({
      old: { game_locked: false },
      new: { game_locked: true },
    }),
    true
  )

  assert.equal(
    didSessionScoreLock({
      old: { game_locked: false },
      new: { game_locked: false },
    }),
    false
  )

  assert.equal(
    didSessionScoreLock({
      old: { game_locked: true },
      new: { game_locked: true },
    }),
    false
  )

  assert.equal(
    didSessionScoreLock({
      old: null,
      new: { game_locked: true },
    }),
    true
  )

  assert.equal(
    didSessionScoreLock({
      old: { game_locked: false },
      new: null,
    }),
    false
  )
})

test('shouldAutoRouteToVictoryOnLock only routes once for a real lock event in a live session', () => {
  assert.equal(
    shouldAutoRouteToVictoryOnLock({
      sessionId: 'session-1',
      payload: {
        old: { game_locked: false },
        new: { game_locked: true },
      },
      alreadyRouted: false,
    }),
    true
  )

  assert.equal(
    shouldAutoRouteToVictoryOnLock({
      sessionId: 'session-1',
      payload: {
        old: { game_locked: true },
        new: { game_locked: true },
      },
      alreadyRouted: false,
    }),
    false
  )

  assert.equal(
    shouldAutoRouteToVictoryOnLock({
      sessionId: '',
      payload: {
        old: { game_locked: false },
        new: { game_locked: true },
      },
      alreadyRouted: false,
    }),
    false
  )

  assert.equal(
    shouldAutoRouteToVictoryOnLock({
      sessionId: 'session-1',
      payload: {
        old: { game_locked: false },
        new: { game_locked: true },
      },
      alreadyRouted: true,
    }),
    false
  )
})
