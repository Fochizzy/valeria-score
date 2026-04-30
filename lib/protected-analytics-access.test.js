import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildProtectedAnalyticsAccessState,
  resolveProtectedAnalyticsViewerUserId,
} from './protected-analytics-access.ts'

test('buildProtectedAnalyticsAccessState routes anonymous player stats viewers to login', () => {
  assert.deepEqual(buildProtectedAnalyticsAccessState('/player-stats', null), {
    canLoad: false,
    title: 'Sign in to view player stats',
    body: 'Global player leaderboards and duke breakdowns are only available after you sign in.',
    actionLabel: 'Go to Login',
    actionPath: '/login',
  })
})

test('buildProtectedAnalyticsAccessState keeps authenticated viewers on the requested analytics route', () => {
  assert.deepEqual(buildProtectedAnalyticsAccessState('/duke-stats', 'user-123'), {
    canLoad: true,
    actionPath: '/duke-stats',
  })
})

test('buildProtectedAnalyticsAccessState gives profile-specific copy when profile access is blocked', () => {
  assert.deepEqual(buildProtectedAnalyticsAccessState('/profile', ''), {
    canLoad: false,
    title: 'Sign in to view your profile',
    body: 'Your history, dashboard summary, and shared guest cards are only available after you sign in.',
    actionLabel: 'Go to Login',
    actionPath: '/login',
  })
})

test('resolveProtectedAnalyticsViewerUserId requires both a session token and user id', () => {
  assert.equal(resolveProtectedAnalyticsViewerUserId(null), null)
  assert.equal(
    resolveProtectedAnalyticsViewerUserId({
      access_token: '',
      user: { id: 'viewer-123' },
    }),
    null
  )
  assert.equal(
    resolveProtectedAnalyticsViewerUserId({
      access_token: 'token-123',
      user: { id: '' },
    }),
    null
  )
})

test('resolveProtectedAnalyticsViewerUserId returns the signed-in viewer id when the session is usable', () => {
  assert.equal(
    resolveProtectedAnalyticsViewerUserId({
      access_token: 'token-123',
      user: { id: 'viewer-123' },
    }),
    'viewer-123'
  )
})
