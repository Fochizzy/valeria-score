import assert from 'node:assert/strict'
import test from 'node:test'

import { buildVictoryRoute } from './victory-route.ts'

test('buildVictoryRoute keeps session and join code in navigation params', () => {
  assert.deepEqual(buildVictoryRoute('session-1', 'ABCD12'), {
    pathname: '/victory',
    params: {
      sessionId: 'session-1',
      joinCode: 'ABCD12',
    },
  })
})
