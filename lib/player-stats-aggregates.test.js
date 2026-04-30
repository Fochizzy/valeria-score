import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildPlayerAggregates,
  buildPlayerDukeAggregates,
  filterPlayers,
} from './player-stats-aggregates.ts'

const profiles = [
  {
    id: 'user-1',
    display_name: 'Alice',
    public_player_id: 'ALC001',
  },
  {
    id: 'user-2',
    display_name: 'Borin',
    public_player_id: 'BOR002',
  },
]

const guests = [
  {
    id: 'guest-1',
    display_name: 'Galen',
    public_player_id: 'GST003',
  },
]

const scores = [
  {
    user_id: 'user-1',
    owner_user_id: 'user-1',
    guest_name: null,
    guest_profile_id: null,
    is_guest: false,
    duke_slug: 'aguilar_the_gilded_knight',
    total_score: 50,
    placement: 1,
    is_winner: true,
    included_in_stats: true,
    updated_at: '2026-04-20T12:00:00.000Z',
  },
  {
    user_id: 'user-1',
    owner_user_id: 'user-1',
    guest_name: null,
    guest_profile_id: null,
    is_guest: false,
    duke_slug: 'aguilar_the_gilded_knight',
    total_score: 40,
    placement: 2,
    is_winner: false,
    included_in_stats: true,
    updated_at: '2026-04-19T12:00:00.000Z',
  },
  {
    user_id: 'user-1',
    owner_user_id: 'user-1',
    guest_name: null,
    guest_profile_id: null,
    is_guest: false,
    duke_slug: 'cornelius_the_dreamer',
    total_score: 22,
    placement: 3,
    is_winner: false,
    included_in_stats: true,
    updated_at: '2026-04-18T12:00:00.000Z',
  },
  {
    user_id: 'user-2',
    owner_user_id: 'user-2',
    guest_name: null,
    guest_profile_id: null,
    is_guest: false,
    duke_slug: 'cornelius_the_dreamer',
    total_score: 61,
    placement: 1,
    is_winner: true,
    included_in_stats: true,
    updated_at: '2026-04-17T12:00:00.000Z',
  },
  {
    user_id: null,
    owner_user_id: null,
    guest_name: 'Galen',
    guest_profile_id: 'guest-1',
    is_guest: true,
    duke_slug: 'elsyn_saint_of_shadows',
    total_score: 35,
    placement: 2,
    is_winner: false,
    included_in_stats: true,
    updated_at: '2026-04-16T12:00:00.000Z',
  },
]

test('filterPlayers narrows the already-loaded leaderboard by player id or name', () => {
  const players = buildPlayerAggregates(scores, profiles, guests)

  assert.deepEqual(
    filterPlayers(players, 'alc001').map((player) => player.player_name),
    ['Alice']
  )

  assert.deepEqual(
    filterPlayers(players, 'galen').map((player) => player.player_name),
    ['Galen']
  )
})

test('buildPlayerDukeAggregates recalculates duke stats for the selected player key', () => {
  const dukeStats = buildPlayerDukeAggregates(scores, 'user:user-1')

  assert.equal(dukeStats.length, 2)
  assert.deepEqual(dukeStats[0], {
    duke_slug: 'aguilar_the_gilded_knight',
    games_played: 2,
    wins: 1,
    avg_score: 45,
    avg_finish: 1.5,
  })
  assert.deepEqual(dukeStats[1], {
    duke_slug: 'cornelius_the_dreamer',
    games_played: 1,
    wins: 0,
    avg_score: 22,
    avg_finish: 3,
  })
})
