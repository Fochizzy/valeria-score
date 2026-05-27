import assert from 'node:assert/strict'
import test from 'node:test'

import { shouldAutoRouteActiveSessionToVictory } from './active-session-victory-route.ts'

test('routes an active-session viewer on a live app screen once the session is locked', () => {
  assert.equal(
    shouldAutoRouteActiveSessionToVictory({
      pathname: '/profile',
      sessionId: 'session-1',
      totalEntries: 4,
      lockedEntries: 4,
    }),
    true
  )
})

test('does not route when the active session is not finished yet', () => {
  assert.equal(
    shouldAutoRouteActiveSessionToVictory({
      pathname: '/profile',
      sessionId: 'session-1',
      totalEntries: 4,
      lockedEntries: 3,
    }),
    false
  )
})

test('does not route auth, setup, or victory screens even if stale locked state exists', () => {
  for (const pathname of ['/login', '/create-user', '/reset-password', '/choose-player-id', '/create-session', '/join-game', '/victory']) {
    assert.equal(
      shouldAutoRouteActiveSessionToVictory({
        pathname,
        sessionId: 'session-1',
        totalEntries: 4,
        lockedEntries: 4,
      }),
      false
    )
  }
})

test('does not route the same finished session twice', () => {
  assert.equal(
    shouldAutoRouteActiveSessionToVictory({
      pathname: '/duke-stats',
      sessionId: 'session-1',
      totalEntries: 4,
      lockedEntries: 4,
      alreadyRoutedSessionId: 'session-1',
    }),
    false
  )
})
