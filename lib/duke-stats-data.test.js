import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveDukeStatsRows } from './duke-stats-data.ts'

test('resolveDukeStatsRows prefers globally resolved player names from the view', () => {
  const [row] = resolveDukeStatsRows([
    {
      duke_slug: 'cornelius_the_dreamer',
      games_played: 8,
      avg_score: 63.1,
      avg_score_per_player: 21,
      win_percentage: 54.3,
      second_percentage: 22.1,
      third_percentage: 11.5,
      best_score: 79,
      most_wins_player_type: 'user',
      most_wins_player_key: 'user-1',
      most_wins_player_name: 'Izzy',
      wins_with_duke: 4,
      best_avg_player_type: 'guest',
      best_avg_player_key: 'guest-1',
      best_avg_player_name: 'Mara (MARA02)',
      avg_with_duke: 68.2,
      top_input_stat_key: 'domainPoints',
      top_input_points_share: 31.7,
      winning_edge_stat_key: 'monsterPoints',
      winning_edge_share_delta: 6.4,
    },
  ])

  assert.equal(row.duke_name, 'Cornelius the Dreamer')
  assert.equal(row.most_wins_player_name, 'Izzy')
  assert.equal(row.best_avg_player_name, 'Mara (MARA02)')
  assert.equal(row.scores_through_summary, 'Domain Points 31.7% of points')
  assert.equal(row.winning_edge_summary, 'Monster Points +6.4 pts share in wins')
})

test('resolveDukeStatsRows falls back to typed placeholder labels when global names are missing', () => {
  const [row] = resolveDukeStatsRows([
    {
      duke_slug: 'unknown_duke',
      games_played: 3,
      avg_score: 41.2,
      avg_score_per_player: 13.7,
      win_percentage: 33.3,
      second_percentage: 0,
      third_percentage: 66.7,
      best_score: 52,
      most_wins_player_type: 'guest',
      most_wins_player_key: 'guest-2',
      most_wins_player_name: null,
      wins_with_duke: 1,
      best_avg_player_type: 'user',
      best_avg_player_key: 'user-2',
      best_avg_player_name: '',
      avg_with_duke: 44.1,
      top_input_stat_key: null,
      top_input_points_share: null,
      winning_edge_stat_key: null,
      winning_edge_share_delta: null,
    },
  ])

  assert.equal(row.duke_name, 'Unknown Duke')
  assert.equal(row.most_wins_player_name, 'Unknown Guest')
  assert.equal(row.best_avg_player_name, 'Unknown Player')
  assert.equal(row.scores_through_summary, 'No input scoring data yet')
  assert.equal(row.winning_edge_summary, 'Not enough winning data yet')
})
