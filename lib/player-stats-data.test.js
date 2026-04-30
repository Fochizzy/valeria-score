import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getPlayerStatsViewNames,
  resolvePlayerDukeRows,
  resolvePlayerLeaderboardRows,
} from './player-stats-data.ts'

test('getPlayerStatsViewNames switches player analytics to the 30 day views', () => {
  assert.deepEqual(getPlayerStatsViewNames('30d'), {
    leaderboardView: 'player_global_stats_30d',
    dukeView: 'player_duke_stats_30d',
  })
})

test('resolvePlayerLeaderboardRows normalizes numeric analytics values from Supabase views', () => {
  const [row] = resolvePlayerLeaderboardRows([
    {
      player_key: 'guest:guest-1',
      player_name: '',
      public_player_id: 'gst001',
      player_type: 'guest',
      games_played: '5',
      wins: '2',
      second_places: '1',
      third_places: '1',
      avg_score: '42.5',
      avg_finish: '1.8',
    },
  ])

  assert.deepEqual(row, {
    player_key: 'guest:guest-1',
    player_name: 'Guest Player',
    public_player_id: 'GST001',
    player_type: 'guest',
    games_played: 5,
    wins: 2,
    podiums: 0,
    second_places: 1,
    third_places: 1,
    avg_score: 42.5,
    avg_finish: 1.8,
    avg_finish_percentile: 0,
    win_rate: 0,
    podium_rate: 0,
  })
})

test('resolvePlayerLeaderboardRows normalizes podium and rate metrics from Supabase views', () => {
  const [row] = resolvePlayerLeaderboardRows([
    {
      player_key: 'guest:guest-1',
      player_name: '',
      public_player_id: 'gst001',
      player_type: 'guest',
      games_played: '5',
      wins: '2',
      podiums: '4',
      second_places: '1',
      third_places: '1',
      avg_score: '42.5',
      avg_finish: '1.8',
      avg_finish_percentile: '72.5',
      win_rate: '40',
      podium_rate: '80',
    },
  ])

  assert.deepEqual(row, {
    player_key: 'guest:guest-1',
    player_name: 'Guest Player',
    public_player_id: 'GST001',
    player_type: 'guest',
    games_played: 5,
    wins: 2,
    podiums: 4,
    second_places: 1,
    third_places: 1,
    avg_score: 42.5,
    avg_finish: 1.8,
    avg_finish_percentile: 72.5,
    win_rate: 40,
    podium_rate: 80,
  })
})

test('resolvePlayerDukeRows sorts the selected player breakdown by wins then average score', () => {
  const rows = resolvePlayerDukeRows([
    {
      player_key: 'user:user-1',
      player_name: 'Izzy',
      public_player_id: 'IZZY01',
      player_type: 'user',
      duke_slug: 'cornelius_the_dreamer',
      games_played: 2,
      wins: 0,
      avg_score: 44,
      avg_finish: 2.5,
    },
    {
      player_key: 'user:user-1',
      player_name: 'Izzy',
      public_player_id: 'IZZY01',
      player_type: 'user',
      duke_slug: 'aguilar_the_gilded_knight',
      games_played: 2,
      wins: 1,
      avg_score: 40,
      avg_finish: 1.5,
    },
  ])

  assert.deepEqual(
    rows.map((row) => row.duke_slug),
    ['aguilar_the_gilded_knight', 'cornelius_the_dreamer']
  )
})

test(
  'resolvePlayerDukeRows sorts the selected player breakdown by wins, win rate, normalized finish, and average score',
  () => {
    const rows = resolvePlayerDukeRows([
      {
        player_key: 'user:user-1',
        player_name: 'Izzy',
        public_player_id: 'IZZY01',
        player_type: 'user',
        duke_slug: 'cornelius_the_dreamer',
        games_played: 4,
        wins: 1,
        podiums: 3,
        avg_score: 44,
        avg_finish: 2.5,
        avg_finish_percentile: 60,
        win_rate: 25,
        podium_rate: 75,
      },
      {
        player_key: 'user:user-1',
        player_name: 'Izzy',
        public_player_id: 'IZZY01',
        player_type: 'user',
        duke_slug: 'aguilar_the_gilded_knight',
        games_played: 4,
        wins: 1,
        podiums: 2,
        avg_score: 40,
        avg_finish: 1.5,
        avg_finish_percentile: 90,
        win_rate: 25,
        podium_rate: 50,
      },
      {
        player_key: 'user:user-1',
        player_name: 'Izzy',
        public_player_id: 'IZZY01',
        player_type: 'user',
        duke_slug: 'reese_the_firebrand',
        games_played: 4,
        wins: 1,
        podiums: 3,
        avg_score: 47,
        avg_finish: 1.4,
        avg_finish_percentile: 90,
        win_rate: 50,
        podium_rate: 75,
      },
    ])

    assert.deepEqual(rows.map((row) => row.duke_slug), [
      'reese_the_firebrand',
      'aguilar_the_gilded_knight',
      'cornelius_the_dreamer',
    ])
  }
)
