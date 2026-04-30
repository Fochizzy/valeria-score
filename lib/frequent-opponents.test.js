import assert from 'node:assert/strict'
import test from 'node:test'

import { aggregateFrequentOpponents } from './frequent-opponents.ts'

const VIEWER = 'user:viewer-id'

function row(sessionId, playerKey, name = '', extras = {}) {
  return {
    sessionId,
    playerKey,
    playerName: name,
    playerType: playerKey.startsWith('guest:') ? 'guest' : 'user',
    publicPlayerId: null,
    ...extras,
  }
}

test('returns empty list when viewer never participated', () => {
  const result = aggregateFrequentOpponents(
    [row('s1', 'user:other', 'Alex')],
    VIEWER
  )
  assert.deepEqual(result, [])
})

test('counts opponents from sessions the viewer participated in', () => {
  const participants = [
    row('s1', VIEWER),
    row('s1', 'user:alex', 'Alex'),
    row('s1', 'user:beth', 'Beth'),
    row('s2', VIEWER),
    row('s2', 'user:alex', 'Alex'),
    row('s3', 'user:alex', 'Alex'),  // not a session viewer played in
  ]

  const result = aggregateFrequentOpponents(participants, VIEWER)
  const alex = result.find((r) => r.playerKey === 'user:alex')
  const beth = result.find((r) => r.playerKey === 'user:beth')

  assert.equal(alex.sharedGames, 2)
  assert.equal(beth.sharedGames, 1)
})

test('sorts by shared games descending, then by name', () => {
  const participants = [
    row('s1', VIEWER),
    row('s1', 'user:zane', 'Zane'),
    row('s2', VIEWER),
    row('s2', 'user:alex', 'Alex'),
    row('s2', 'user:zane', 'Zane'),
    row('s3', VIEWER),
    row('s3', 'user:beth', 'Beth'),
  ]

  const result = aggregateFrequentOpponents(participants, VIEWER)
  assert.deepEqual(
    result.map((r) => r.playerName),
    ['Zane', 'Alex', 'Beth']
  )
})

test('respects the limit', () => {
  const participants = [
    row('s1', VIEWER),
    row('s1', 'user:a', 'A'),
    row('s1', 'user:b', 'B'),
    row('s1', 'user:c', 'C'),
    row('s1', 'user:d', 'D'),
  ]

  const result = aggregateFrequentOpponents(participants, VIEWER, 2)
  assert.equal(result.length, 2)
})

test('falls back to a default display name based on player type', () => {
  const participants = [
    row('s1', VIEWER),
    row('s1', 'guest:abc', '', { publicPlayerId: 'ABC' }),
  ]

  const result = aggregateFrequentOpponents(participants, VIEWER)
  assert.equal(result[0].playerName, 'Guest Player')
  assert.equal(result[0].publicPlayerId, 'ABC')
})

test('does not include the viewer themselves as an opponent', () => {
  const participants = [row('s1', VIEWER), row('s1', VIEWER)]
  const result = aggregateFrequentOpponents(participants, VIEWER)
  assert.deepEqual(result, [])
})
