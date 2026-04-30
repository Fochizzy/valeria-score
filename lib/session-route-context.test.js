import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveSessionRouteContext } from './session-route-context.ts'

test('resolveSessionRouteContext prefers route params when they are present', () => {
  assert.deepEqual(
    resolveSessionRouteContext({
      routeSessionId: 'route-session',
      storedSessionId: 'stored-session',
      routeJoinCode: 'abc123',
      storedJoinCode: 'xyz789',
    }),
    {
      sessionId: 'route-session',
      joinCode: 'ABC123',
    }
  )
})

test('resolveSessionRouteContext falls back to stored session context when route params are missing', () => {
  assert.deepEqual(
    resolveSessionRouteContext({
      routeSessionId: '   ',
      storedSessionId: 'stored-session',
      routeJoinCode: '',
      storedJoinCode: 'join42',
    }),
    {
      sessionId: 'stored-session',
      joinCode: 'JOIN42',
    }
  )
})
