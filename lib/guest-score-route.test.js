import assert from 'node:assert/strict'
import test from 'node:test'

import { buildGuestScoreRoute } from './guest-score-route.ts'

test('buildGuestScoreRoute carries the guest entry identity into the score screen', () => {
  const route = buildGuestScoreRoute({
    sessionId: 'session-1',
    joinCode: '4HGGSS',
    guestName: 'Mara',
    guestProfileId: 'guest-1',
    guestEntryId: 'entry-1',
  })

  assert.deepEqual(route, {
    pathname: '/score',
    params: {
      sessionId: 'session-1',
      joinCode: '4HGGSS',
      guestMode: '1',
      guestName: 'Mara',
      guestProfileId: 'guest-1',
      guestEntryId: 'entry-1',
    },
  })
})
