import assert from 'node:assert/strict'
import test from 'node:test'

import { buildManageDataHistoryItems } from './manage-data-history.ts'

test('buildManageDataHistoryItems merges completed sessions and solo games newest first', () => {
  const items = buildManageDataHistoryItems({
    completedSessions: [
      {
        id: 'session-older',
        join_code: 'ABC123',
        created_at: '2026-05-24T10:00:00.000Z',
        updated_at: '2026-05-24T11:00:00.000Z',
        is_host: false,
      },
      {
        id: 'session-newest',
        join_code: 'XYZ789',
        created_at: '2026-05-26T10:00:00.000Z',
        updated_at: '2026-05-26T11:00:00.000Z',
        is_host: true,
      },
    ],
    soloResults: [
      {
        id: 'solo-middle',
        ownerUserId: 'user-1',
        playerDukeSlug: 'aguilar_the_gilded_knight',
        darkLordDukeSlug: 'drakkenstrike',
        victoryCondition: 'slay_all_monsters',
        winner: 'player',
        resolution: 'player_auto',
        playerTotal: 0,
        darkLordTotal: 0,
        playerInputs: {},
        darkLordInputs: {},
        createdAt: '2026-05-25T10:00:00.000Z',
        updatedAt: '2026-05-25T11:00:00.000Z',
      },
    ],
  })

  assert.deepEqual(
    items.map((item) => [item.kind, item.id]),
    [
      ['session', 'session-newest'],
      ['solo', 'solo-middle'],
      ['session', 'session-older'],
    ]
  )
})

test('buildManageDataHistoryItems preserves enough metadata for session and solo actions', () => {
  const [sessionItem, soloItem] = buildManageDataHistoryItems({
    completedSessions: [
      {
        id: 'session-1',
        join_code: 'JOIN01',
        created_at: '2026-05-24T10:00:00.000Z',
        updated_at: '2026-05-24T11:00:00.000Z',
        is_host: false,
      },
    ],
    soloResults: [
      {
        id: 'solo-1',
        ownerUserId: 'user-1',
        playerDukeSlug: 'cornelius_the_dreamer',
        darkLordDukeSlug: 'drakkenstrike',
        victoryCondition: 'five_stacks_exhausted',
        winner: 'dark_lord',
        resolution: 'contested',
        playerTotal: 41,
        darkLordTotal: 43,
        playerInputs: {},
        darkLordInputs: {},
        createdAt: '2026-05-23T10:00:00.000Z',
        updatedAt: '2026-05-23T11:00:00.000Z',
      },
    ],
  })

  assert.equal(sessionItem.kind, 'session')
  assert.equal(sessionItem.joinCode, 'JOIN01')
  assert.equal(sessionItem.isHost, false)

  assert.equal(soloItem.kind, 'solo')
  assert.equal(soloItem.victoryCondition, 'five_stacks_exhausted')
  assert.equal(soloItem.winner, 'dark_lord')
  assert.equal(soloItem.playerDukeSlug, 'cornelius_the_dreamer')
})
