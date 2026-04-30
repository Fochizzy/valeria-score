import assert from 'node:assert/strict'
import test from 'node:test'

import { buildDukeStatsScreenState } from './duke-stats-screen-state.ts'
import { resolveDukeStatsRows } from './duke-stats-data.ts'

function createRows() {
  return resolveDukeStatsRows([
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
      best_avg_player_name: 'Mara',
      avg_with_duke: 68.2,
      top_input_stat_key: 'domainPoints',
      top_input_points_share: 31.7,
      winning_edge_stat_key: 'monsterPoints',
      winning_edge_share_delta: 6.4,
    },
    {
      duke_slug: 'drakkenstrike',
      games_played: 5,
      avg_score: 58.4,
      avg_score_per_player: 19.5,
      win_percentage: 41.2,
      second_percentage: 20,
      third_percentage: 18,
      best_score: 73,
      most_wins_player_type: 'guest',
      most_wins_player_key: 'guest-2',
      most_wins_player_name: 'Vale',
      wins_with_duke: 2,
      best_avg_player_type: 'user',
      best_avg_player_key: 'user-3',
      best_avg_player_name: 'Tess',
      avg_with_duke: 61.5,
      top_input_stat_key: 'domainCount',
      top_input_points_share: 24.4,
      winning_edge_stat_key: null,
      winning_edge_share_delta: null,
    },
  ])
}

test('buildDukeStatsScreenState defaults to the first filtered duke when none is selected', () => {
  const state = buildDukeStatsScreenState({
    rows: createRows(),
    search: '',
    selectedDukeSlug: null,
    detailRows: [],
    detailDukeSlug: null,
    detailError: '',
    detailLoading: false,
  })

  assert.equal(state.selectedDukeSlug, 'cornelius_the_dreamer')
  assert.equal(state.selectedRow?.duke_slug, 'cornelius_the_dreamer')
  assert.equal(state.filteredRows.length, 2)
})

test('buildDukeStatsScreenState reselects the first visible duke when filtering hides the current selection', () => {
  const state = buildDukeStatsScreenState({
    rows: createRows(),
    search: 'cornelius',
    selectedDukeSlug: 'drakkenstrike',
    detailRows: [],
    detailDukeSlug: 'drakkenstrike',
    detailError: '',
    detailLoading: false,
  })

  assert.equal(state.selectedDukeSlug, 'cornelius_the_dreamer')
  assert.equal(state.selectedRow?.duke_name, 'Cornelius the Dreamer')
  assert.equal(state.filteredRows.length, 1)
})

test('buildDukeStatsScreenState keeps the selected duke visible even when detail loading fails', () => {
  const state = buildDukeStatsScreenState({
    rows: createRows(),
    search: '',
    selectedDukeSlug: 'cornelius_the_dreamer',
    detailRows: [],
    detailDukeSlug: 'cornelius_the_dreamer',
    detailError: 'Unable to load duke input trends right now.',
    detailLoading: false,
  })

  assert.equal(state.selectedRow?.duke_slug, 'cornelius_the_dreamer')
  assert.equal(state.detailError, 'Unable to load duke input trends right now.')
  assert.equal(state.detailState?.usualRows.length ?? 0, 0)
})
