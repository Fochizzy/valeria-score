import assert from 'node:assert/strict'
import test from 'node:test'

import { aggregateHeadToHead } from './head-to-head.ts'

const VIEWER = 'user:viewer'

function row(sessionId, playerKey, score, name = '', extras = {}) {
  return {
    sessionId,
    playerKey,
    playerName: name,
    playerType: playerKey.startsWith('guest:') ? 'guest' : 'user',
    publicPlayerId: null,
    totalScore: score,
    updatedAt: '2026-04-25T00:00:00Z',
    ...extras,
  }
}

test('returns empty when viewer never participated', () => {
  const rows = [row('s1', 'user:other', 30)]
  assert.deepEqual(aggregateHeadToHead(rows, VIEWER), [])
})

test('counts wins / losses / ties and computes avg margin per opponent', () => {
  const rows = [
    row('s1', VIEWER, 30),
    row('s1', 'user:alex', 20, 'Alex'),  // viewer wins by 10
    row('s2', VIEWER, 15),
    row('s2', 'user:alex', 25, 'Alex'),  // viewer loses by 10
    row('s3', VIEWER, 40),
    row('s3', 'user:alex', 40, 'Alex'),  // tie
  ]

  const records = aggregateHeadToHead(rows, VIEWER)
  const alex = records.find((r) => r.playerKey === 'user:alex')

  assert.equal(alex.wins, 1)
  assert.equal(alex.losses, 1)
  assert.equal(alex.ties, 1)
  assert.equal(alex.meetings, 3)
  assert.equal(alex.avgMargin, 0)
})

test('reports the most recent meeting time per opponent', () => {
  const rows = [
    row('s1', VIEWER, 10, '', { updatedAt: '2026-04-01T00:00:00Z' }),
    row('s1', 'user:alex', 5, 'Alex', { updatedAt: '2026-04-01T00:00:00Z' }),
    row('s2', VIEWER, 10, '', { updatedAt: '2026-04-20T00:00:00Z' }),
    row('s2', 'user:alex', 30, 'Alex', { updatedAt: '2026-04-20T00:00:00Z' }),
  ]

  const [alex] = aggregateHeadToHead(rows, VIEWER)
  assert.equal(alex.lastPlayedIso, '2026-04-20T00:00:00.000Z')
})

test('ignores opponents from sessions where viewer did not play', () => {
  const rows = [
    row('s1', 'user:alex', 10, 'Alex'),
    row('s1', 'user:beth', 20, 'Beth'),
  ]

  assert.deepEqual(aggregateHeadToHead(rows, VIEWER), [])
})

test('sorts by meetings desc, then wins desc, then name', () => {
  const rows = [
    row('s1', VIEWER, 30),
    row('s1', 'user:alex', 20, 'Alex'),
    row('s2', VIEWER, 30),
    row('s2', 'user:alex', 20, 'Alex'),
    row('s3', VIEWER, 20),
    row('s3', 'user:beth', 30, 'Beth'),
  ]

  const records = aggregateHeadToHead(rows, VIEWER)
  assert.deepEqual(
    records.map((r) => r.playerName),
    ['Alex', 'Beth']
  )
})
