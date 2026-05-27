import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { getDukeInputStatLabel } from './duke-input-analytics.ts'
import { resolveDukeStatsRows } from './duke-stats-data.ts'

const statMetaSource = fs.readFileSync(
  path.join(process.cwd(), 'data', 'statMeta.ts'),
  'utf8'
)

test('score entry labels use the renamed equipment symbol copy', () => {
  assert.match(statMetaSource, /key: 'hammer',[\s\S]*label: 'Worker Symbol'/)
  assert.match(statMetaSource, /key: 'helmet',[\s\S]*label: 'Solider Symbol'/)
  assert.match(statMetaSource, /key: 'key',[\s\S]*label: 'Shadow Symbol'/)
})

test('duke analytics labels use the renamed equipment symbol copy', () => {
  assert.equal(getDukeInputStatLabel('hammer'), 'Worker Symbols')
  assert.equal(getDukeInputStatLabel('helmet'), 'Solider Symbols')
  assert.equal(getDukeInputStatLabel('key'), 'Shadow Symbols')
})

test('duke teaser summaries use the renamed equipment symbol copy', () => {
  const rows = resolveDukeStatsRows([
    {
      duke_slug: 'cornelius_the_dreamer',
      games_played: 5,
      avg_score: 60,
      avg_score_per_player: 20,
      win_percentage: 40,
      second_percentage: 20,
      third_percentage: 20,
      best_score: 72,
      most_wins_player_type: 'user',
      most_wins_player_key: 'user-1',
      most_wins_player_name: 'Izzy',
      wins_with_duke: 2,
      best_avg_player_type: 'user',
      best_avg_player_key: 'user-1',
      best_avg_player_name: 'Izzy',
      avg_with_duke: 64,
      top_input_stat_key: 'hammer',
      top_input_points_share: 31.2,
      winning_edge_stat_key: 'key',
      winning_edge_share_delta: 4.8,
    },
    {
      duke_slug: 'cornelius_the_dreamer',
      games_played: 5,
      avg_score: 60,
      avg_score_per_player: 20,
      win_percentage: 40,
      second_percentage: 20,
      third_percentage: 20,
      best_score: 72,
      most_wins_player_type: 'user',
      most_wins_player_key: 'user-1',
      most_wins_player_name: 'Izzy',
      wins_with_duke: 2,
      best_avg_player_type: 'user',
      best_avg_player_key: 'user-1',
      best_avg_player_name: 'Izzy',
      avg_with_duke: 64,
      top_input_stat_key: 'helmet',
      top_input_points_share: 22.5,
      winning_edge_stat_key: 'helmet',
      winning_edge_share_delta: 3.1,
    },
  ])

  assert.equal(rows[0]?.scores_through_summary, 'Worker Symbols 31.2% of points')
  assert.equal(rows[0]?.winning_edge_summary, 'Shadow Symbols +4.8 pts share in wins')
  assert.equal(rows[1]?.scores_through_summary, 'Solider Symbols 22.5% of points')
  assert.equal(rows[1]?.winning_edge_summary, 'Solider Symbols +3.1 pts share in wins')
})
