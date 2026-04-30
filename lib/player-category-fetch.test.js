import assert from 'node:assert/strict'
import test from 'node:test'

import { parsePlayerKey } from './player-key.ts'

test('parsePlayerKey returns null for empty / bogus values', () => {
  assert.equal(parsePlayerKey(null), null)
  assert.equal(parsePlayerKey(undefined), null)
  assert.equal(parsePlayerKey(''), null)
  assert.equal(parsePlayerKey('user:'), null)
  assert.equal(parsePlayerKey('guest:'), null)
  assert.equal(parsePlayerKey('something-else'), null)
})

test('parsePlayerKey extracts user IDs', () => {
  assert.deepEqual(parsePlayerKey('user:abc-123'), { type: 'user', userId: 'abc-123' })
})

test('parsePlayerKey extracts guest profile IDs', () => {
  assert.deepEqual(parsePlayerKey('guest:guest-uuid'), {
    type: 'guest',
    guestProfileId: 'guest-uuid',
  })
})
