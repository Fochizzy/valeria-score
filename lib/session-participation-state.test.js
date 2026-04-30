import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildSessionParticipationSummaries,
  filterCompletedSessions,
  filterInProgressSessions,
} from './session-participation-state.ts'

test('session participation summaries classify in-progress and completed sessions for participants', () => {
  const summaries = buildSessionParticipationSummaries({
    sessions: [
      {
        id: 'session-open',
        join_code: 'OPEN01',
        created_at: '2026-04-22T10:00:00.000Z',
        created_by: 'host-1',
      },
      {
        id: 'session-finished',
        join_code: 'DONE01',
        created_at: '2026-04-22T11:00:00.000Z',
        created_by: 'host-2',
      },
    ],
    scoreRows: [
      {
        session_id: 'session-open',
        game_locked: false,
        updated_at: '2026-04-22T10:30:00.000Z',
      },
      {
        session_id: 'session-finished',
        game_locked: true,
        updated_at: '2026-04-22T11:40:00.000Z',
      },
      {
        session_id: 'session-finished',
        game_locked: true,
        updated_at: '2026-04-22T11:45:00.000Z',
      },
    ],
    playerRows: [
      { session_id: 'session-open' },
      { session_id: 'session-open' },
      { session_id: 'session-finished' },
      { session_id: 'session-finished' },
    ],
    currentUserId: 'user-1',
  })

  assert.equal(summaries.length, 2)
  assert.equal(summaries[0].id, 'session-finished')
  assert.equal(summaries[0].is_host, false)
  assert.equal(summaries[0].locked_count, 2)
  assert.equal(summaries[0].total_entries, 2)
  assert.equal(summaries[1].id, 'session-open')

  const inProgress = filterInProgressSessions(summaries)
  const completed = filterCompletedSessions(summaries)

  assert.deepEqual(
    inProgress.map((row) => row.id),
    ['session-open']
  )
  assert.deepEqual(
    completed.map((row) => row.id),
    ['session-finished']
  )
})

test('completed filtering does not treat empty sessions as finished', () => {
  const summaries = buildSessionParticipationSummaries({
    sessions: [
      {
        id: 'session-empty',
        join_code: 'EMPTY1',
        created_at: '2026-04-22T12:00:00.000Z',
        created_by: 'user-1',
      },
    ],
    scoreRows: [],
    playerRows: [{ session_id: 'session-empty' }],
    currentUserId: 'user-1',
  })

  assert.equal(filterInProgressSessions(summaries).length, 1)
  assert.equal(filterCompletedSessions(summaries).length, 0)
})
