import assert from 'node:assert/strict'
import test from 'node:test'

import { buildCompareEntries } from './compare-entries.ts'

test('buildCompareEntries keeps scored players and adds joined players who have not scored yet', () => {
  const entries = buildCompareEntries({
    scoreRows: [
      {
        id: 'score-1',
        session_id: 'session-1',
        owner_user_id: 'user-1',
        player_name: null,
        guest_profile_id: null,
        guest_entry_id: null,
        duke_slug: 'cornelius_the_dreamer',
        score_total: 25,
        game_locked: false,
        placement: null,
        is_winner: false,
      },
    ],
    sessionPlayers: [
      { session_id: 'session-1', user_id: 'user-1' },
      { session_id: 'session-1', user_id: 'user-2' },
    ],
    profiles: [
      { id: 'user-1', display_name: 'Alice', public_player_id: 'ALICE' },
      { id: 'user-2', display_name: 'Bob', public_player_id: 'BOB' },
    ],
    guestProfiles: [],
  })

  assert.equal(entries.length, 2)
  assert.equal(entries[0].label, 'Alice')
  assert.equal(entries[0].hasScore, true)
  assert.equal(entries[0].dukeName, 'Cornelius the Dreamer')
  assert.equal(entries[1].label, 'Bob')
  assert.equal(entries[1].playerId, 'BOB')
  assert.equal(entries[1].hasScore, false)
  assert.equal(entries[1].dukeName, 'No Duke Yet')
  assert.equal(entries[1].totalScore, 0)
})

test('buildCompareEntries does not duplicate a player who already has a score row', () => {
  const entries = buildCompareEntries({
    scoreRows: [
      {
        id: 'score-1',
        session_id: 'session-1',
        owner_user_id: 'user-1',
        player_name: null,
        guest_profile_id: null,
        guest_entry_id: null,
        duke_slug: 'aguilar_the_gilded_knight',
        score_total: 31,
        game_locked: false,
        placement: 1,
        is_winner: true,
      },
    ],
    sessionPlayers: [
      { session_id: 'session-1', user_id: 'user-1' },
    ],
    profiles: [
      { id: 'user-1', display_name: 'Alice', public_player_id: 'ALICE' },
    ],
    guestProfiles: [],
  })

  assert.equal(entries.length, 1)
  assert.equal(entries[0].label, 'Alice')
  assert.equal(entries[0].hasScore, true)
})

test('buildCompareEntries renders guest rows with the guest name and guest player id', () => {
  const entries = buildCompareEntries({
    scoreRows: [
      {
        id: 'score-guest-1',
        session_id: 'session-1',
        owner_user_id: 'user-1',
        player_name: 'Mara',
        guest_profile_id: 'guest-1',
        guest_entry_id: 'entry-1',
        duke_slug: 'reese_the_firebrand',
        score_total: 22,
        game_locked: false,
        placement: 2,
        is_winner: false,
      },
    ],
    sessionPlayers: [],
    profiles: [{ id: 'user-1', display_name: 'Alice', public_player_id: 'ALICE' }],
    guestProfiles: [
      { id: 'guest-1', display_name: 'Mara', public_player_id: 'MARA02' },
    ],
  })

  assert.equal(entries.length, 1)
  assert.equal(entries[0].label, 'Mara')
  assert.equal(entries[0].playerId, 'MARA02')
  assert.equal(entries[0].isGuest, true)
  assert.equal(entries[0].hasScore, true)
  assert.equal(entries[0].dukeName, 'Reese the Firebrand')
  assert.equal(entries[0].guestProfileId, 'guest-1')
  assert.equal(entries[0].guestEntryId, 'entry-1')
})

test('buildCompareEntries keeps guest placeholders editable without marking them as saved', () => {
  const entries = buildCompareEntries({
    scoreRows: [
      {
        id: 'score-guest-1',
        session_id: 'session-1',
        owner_user_id: 'user-1',
        player_name: 'Mara',
        guest_profile_id: 'guest-1',
        guest_entry_id: 'entry-1',
        duke_slug: null,
        score_total: 0,
        game_locked: false,
        placement: null,
        is_winner: false,
      },
    ],
    sessionPlayers: [],
    profiles: [{ id: 'user-1', display_name: 'Alice', public_player_id: 'ALICE' }],
    guestProfiles: [
      { id: 'guest-1', display_name: 'Mara', public_player_id: 'MARA02' },
    ],
  })

  assert.equal(entries.length, 1)
  assert.equal(entries[0].label, 'Mara')
  assert.equal(entries[0].isGuest, true)
  assert.equal(entries[0].hasScore, false)
  assert.equal(entries[0].playerId, 'MARA02')
  assert.equal(entries[0].totalScore, 0)
  assert.equal(entries[0].dukeName, 'No Duke')
  assert.equal(entries[0].guestProfileId, 'guest-1')
  assert.equal(entries[0].guestEntryId, 'entry-1')
})

test('buildCompareEntries prefers recap identity fields for detached completed rows', () => {
  const entries = buildCompareEntries({
    scoreRows: [
      {
        id: 'score-1',
        session_id: 'session-1',
        owner_user_id: null,
        player_name: null,
        guest_profile_id: null,
        guest_entry_id: null,
        recap_player_name: 'Mx. Doe',
        recap_player_id: 'Mx. Doe',
        duke_slug: 'aguilar_the_gilded_knight',
        score_total: 31,
        game_locked: true,
        placement: 1,
        is_winner: true,
      },
    ],
    sessionPlayers: [],
    profiles: [],
    guestProfiles: [],
  })

  assert.equal(entries.length, 1)
  assert.equal(entries[0].label, 'Mx. Doe')
  assert.equal(entries[0].playerId, 'Mx. Doe')
  assert.equal(entries[0].isGuest, false)
  assert.equal(entries[0].hasScore, true)
})
