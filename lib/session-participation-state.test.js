import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildSessionParticipationSummaries,
  filterCompletedSessions,
  filterInProgressSessions,
} from './session-participation-state.ts'

test('active-table helpers dedupe host and joined session ids and pin host-owned tables first', async () => {
  const module = await import('./session-participation-state.ts')

  assert.equal(typeof module.mergeSessionIds, 'function')
  assert.equal(typeof module.sortActiveSessionSummaries, 'function')

  assert.deepEqual(
    module.mergeSessionIds(['session-host', 'session-shared'], ['session-shared', 'session-joined']),
    ['session-host', 'session-shared', 'session-joined']
  )

  const sorted = module.sortActiveSessionSummaries([
    {
      id: 'joined-newer',
      join_code: 'JOIN01',
      created_at: '2026-05-27T10:00:00.000Z',
      updated_at: '2026-05-27T11:10:00.000Z',
      created_by: 'host-a',
      expected_player_count: 4,
      is_host: false,
      player_count: 4,
      locked_count: 1,
      total_entries: 4,
    },
    {
      id: 'host-older',
      join_code: 'HOST01',
      created_at: '2026-05-27T09:00:00.000Z',
      updated_at: '2026-05-27T10:20:00.000Z',
      created_by: 'user-1',
      expected_player_count: 3,
      is_host: true,
      player_count: 3,
      locked_count: 0,
      total_entries: 3,
    },
    {
      id: 'host-newer',
      join_code: 'HOST02',
      created_at: '2026-05-27T09:30:00.000Z',
      updated_at: '2026-05-27T10:50:00.000Z',
      created_by: 'user-1',
      expected_player_count: 5,
      is_host: true,
      player_count: 5,
      locked_count: 2,
      total_entries: 5,
    },
  ])

  assert.deepEqual(
    sorted.map((row) => row.id),
    ['host-newer', 'host-older', 'joined-newer']
  )
})

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

test('reopened sessions move back to in-progress once their score rows are unlocked', () => {
  const summaries = buildSessionParticipationSummaries({
    sessions: [
      {
        id: 'session-reopened',
        join_code: 'OPENAG',
        created_at: '2026-05-25T12:00:00.000Z',
        created_by: 'host-1',
      },
    ],
    scoreRows: [
      {
        session_id: 'session-reopened',
        game_locked: false,
        updated_at: '2026-05-25T12:30:00.000Z',
      },
      {
        session_id: 'session-reopened',
        game_locked: false,
        updated_at: '2026-05-25T12:31:00.000Z',
      },
    ],
    playerRows: [
      { session_id: 'session-reopened' },
      { session_id: 'session-reopened' },
    ],
    currentUserId: 'host-1',
  })

  assert.deepEqual(
    filterInProgressSessions(summaries).map((row) => row.id),
    ['session-reopened']
  )
  assert.equal(filterCompletedSessions(summaries).length, 0)
})
