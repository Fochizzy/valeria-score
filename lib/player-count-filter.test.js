import assert from 'node:assert/strict'
import test from 'node:test'

import { matchesPlayerCountFilter, PLAYER_COUNT_FILTERS } from './player-count-filter.ts'

test('all matches every count', () => {
  for (const c of [1, 2, 3, 4, 5, null, undefined, NaN]) {
    assert.equal(matchesPlayerCountFilter(c, 'all'), true)
  }
})

test('2 matches only 2-player games', () => {
  assert.equal(matchesPlayerCountFilter(2, '2'), true)
  assert.equal(matchesPlayerCountFilter(3, '2'), false)
})

test('4plus matches 4 or more players', () => {
  assert.equal(matchesPlayerCountFilter(3, '4plus'), false)
  assert.equal(matchesPlayerCountFilter(4, '4plus'), true)
  assert.equal(matchesPlayerCountFilter(7, '4plus'), true)
})

test('PLAYER_COUNT_FILTERS exposes the public filter ids in order', () => {
  assert.deepEqual([...PLAYER_COUNT_FILTERS], ['all', '2', '3', '4plus'])
})
