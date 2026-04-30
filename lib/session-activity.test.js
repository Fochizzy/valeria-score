import assert from 'node:assert/strict'
import test from 'node:test'

import { buildSessionActivityRealtimeSpecs } from './session-activity.ts'

test('buildSessionActivityRealtimeSpecs watches score, membership, and session changes for one session', () => {
  assert.deepEqual(buildSessionActivityRealtimeSpecs('session-1'), [
    {
      event: '*',
      schema: 'public',
      table: 'session_scores',
      filter: 'session_id=eq.session-1',
    },
    {
      event: '*',
      schema: 'public',
      table: 'session_players',
      filter: 'session_id=eq.session-1',
    },
    {
      event: '*',
      schema: 'public',
      table: 'game_sessions',
      filter: 'id=eq.session-1',
    },
  ])

  assert.deepEqual(buildSessionActivityRealtimeSpecs(''), [])
})
