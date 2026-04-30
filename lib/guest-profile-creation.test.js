import assert from 'node:assert/strict'
import test from 'node:test'

import {
  GuestProfileValidationError,
  prepareGuestProfileCreationInput,
} from './guest-profile-creation.ts'

test('prepareGuestProfileCreationInput rejects a blank display name', () => {
  assert.throws(
    () =>
      prepareGuestProfileCreationInput({
        displayName: '   ',
        playerId: 'mara-01',
      }),
    GuestProfileValidationError
  )
})

test('prepareGuestProfileCreationInput rejects a blank player id', () => {
  assert.throws(
    () =>
      prepareGuestProfileCreationInput({
        displayName: 'Mara',
        playerId: '   ',
      }),
    GuestProfileValidationError
  )
})

test('prepareGuestProfileCreationInput trims the display name and normalizes the player id', () => {
  assert.deepEqual(
    prepareGuestProfileCreationInput({
      displayName: '  Mara of Stone  ',
      playerId: ' mara-01 ',
    }),
    {
      displayName: 'Mara of Stone',
      playerId: 'MARA-01',
    }
  )
})
