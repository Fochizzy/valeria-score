import assert from 'node:assert/strict'
import test from 'node:test'

import {
  clampExpectedPlayerCount,
  isExpectedPlayerOption,
  requireExpectedPlayerCount,
} from './expected-player-count.ts'

test('expected player count only accepts supported table sizes', () => {
  assert.equal(isExpectedPlayerOption(2), true)
  assert.equal(isExpectedPlayerOption(5), true)
  assert.equal(isExpectedPlayerOption(1), false)
  assert.equal(isExpectedPlayerOption(6), false)
  assert.equal(isExpectedPlayerOption(null), false)
})

test('requireExpectedPlayerCount rejects missing selections for new tables', () => {
  assert.throws(
    () => requireExpectedPlayerCount(undefined),
    /Select how many players are expected/
  )
})

test('clampExpectedPlayerCount keeps existing session values inside supported bounds', () => {
  assert.equal(clampExpectedPlayerCount(undefined), 2)
  assert.equal(clampExpectedPlayerCount(1), 2)
  assert.equal(clampExpectedPlayerCount(3.2), 3)
  assert.equal(clampExpectedPlayerCount(9), 5)
})
