import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyScoreRowLookup,
  buildScoreRowLookup,
} from './score-row-identity.ts'

test('buildScoreRowLookup keeps player rows separate from guest-owned rows', () => {
  const lookup = buildScoreRowLookup({
    ownerUserId: 'user-123',
  })

  assert.deepEqual(lookup, {
    kind: 'player',
    eqFilters: [{ field: 'owner_user_id', value: 'user-123' }],
    nullFilters: ['guest_profile_id', 'guest_entry_id'],
  })
})

test('buildScoreRowLookup prefers the guest entry id when available', () => {
  const lookup = buildScoreRowLookup({
    guestMode: true,
    guestEntryId: 'entry-456',
    guestProfileId: 'guest-789',
  })

  assert.deepEqual(lookup, {
    kind: 'guest',
    eqFilters: [{ field: 'guest_entry_id', value: 'entry-456' }],
    nullFilters: [],
  })
})

test('buildScoreRowLookup falls back to the guest profile id when no guest entry id is available', () => {
  const lookup = buildScoreRowLookup({
    guestMode: true,
    guestProfileId: 'guest-789',
  })

  assert.deepEqual(lookup, {
    kind: 'guest',
    eqFilters: [{ field: 'guest_profile_id', value: 'guest-789' }],
    nullFilters: [],
  })
})

test('applyScoreRowLookup applies both equality and null filters', () => {
  const calls = []
  const query = {
    eq(field, value) {
      calls.push(['eq', field, value])
      return this
    },
    is(field, value) {
      calls.push(['is', field, value])
      return this
    },
  }

  const lookup = buildScoreRowLookup({
    ownerUserId: 'user-123',
  })

  assert.ok(lookup)
  applyScoreRowLookup(query, lookup)

  assert.deepEqual(calls, [
    ['eq', 'owner_user_id', 'user-123'],
    ['is', 'guest_profile_id', null],
    ['is', 'guest_entry_id', null],
  ])
})
