import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getGuestProfileLabels,
  resolveGuestProfileDisplayName,
} from './guest-profile-identity.ts'

test('resolveGuestProfileDisplayName keeps an explicit display name', () => {
  assert.equal(resolveGuestProfileDisplayName('Val', 'val-01'), 'Val')
})

test('resolveGuestProfileDisplayName falls back to the normalized player id', () => {
  assert.equal(resolveGuestProfileDisplayName('   ', ' val-01 '), 'VAL-01')
})

test('getGuestProfileLabels avoids repeating the player id twice when no custom name exists', () => {
  assert.deepEqual(getGuestProfileLabels('VAL-01', ' val-01 '), {
    title: 'VAL-01',
    subtitle: null,
  })
})
