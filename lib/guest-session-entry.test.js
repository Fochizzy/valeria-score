import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildGuestSessionEntryPayload,
  createGuestEntryId,
} from './guest-session-entry.ts'

test('createGuestEntryId returns a uuid-like entry id', () => {
  const value = createGuestEntryId(() => 0.5)

  assert.match(
    value,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  )
})

test('buildGuestSessionEntryPayload allows repeated guest seats for the same shared profile', () => {
  const first = buildGuestSessionEntryPayload(
    {
      sessionId: 'session-1',
      ownerUserId: 'user-1',
      guestProfileId: 'guest-1',
      displayName: 'Mara',
    },
    {
      guestEntryId: 'entry-1',
      updatedAt: '2026-04-22T12:00:00.000Z',
    }
  )

  const second = buildGuestSessionEntryPayload(
    {
      sessionId: 'session-1',
      ownerUserId: 'user-1',
      guestProfileId: 'guest-1',
      displayName: 'Mara',
    },
    {
      guestEntryId: 'entry-2',
      updatedAt: '2026-04-22T12:00:01.000Z',
    }
  )

  assert.equal(first.guest_profile_id, 'guest-1')
  assert.equal(second.guest_profile_id, 'guest-1')
  assert.equal(first.guest_entry_id, 'entry-1')
  assert.equal(second.guest_entry_id, 'entry-2')
  assert.notEqual(first.guest_entry_id, second.guest_entry_id)
  assert.equal(first.player_name, 'Mara')
  assert.equal(first.score_total, 0)
  assert.equal(first.game_locked, false)
})
