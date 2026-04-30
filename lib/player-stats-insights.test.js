import assert from 'node:assert/strict'
import test from 'node:test'

import {
  deriveSelectedPlayerInsights,
  formatPlayerDukeSummary,
  formatPlayerLeaderboardSummary,
} from './player-stats-insights.ts'

const dukeRows = [
  {
    player_key: 'user:user-1',
    player_name: 'Izzy',
    public_player_id: 'IZZY01',
    player_type: 'user',
    duke_slug: 'aguilar_the_gilded_knight',
    games_played: 4,
    wins: 2,
    podiums: 3,
    avg_score: 45,
    avg_finish: 1.75,
    avg_finish_percentile: 80,
    win_rate: 50,
    podium_rate: 75,
  },
  {
    player_key: 'user:user-1',
    player_name: 'Izzy',
    public_player_id: 'IZZY01',
    player_type: 'user',
    duke_slug: 'cornelius_the_dreamer',
    games_played: 6,
    wins: 2,
    podiums: 4,
    avg_score: 44,
    avg_finish: 1.9,
    avg_finish_percentile: 76,
    win_rate: 33.3,
    podium_rate: 66.7,
  },
  {
    player_key: 'user:user-1',
    player_name: 'Izzy',
    public_player_id: 'IZZY01',
    player_type: 'user',
    duke_slug: 'reese_the_firebrand',
    games_played: 2,
    wins: 2,
    podiums: 2,
    avg_score: 52,
    avg_finish: 1,
    avg_finish_percentile: 100,
    win_rate: 100,
    podium_rate: 100,
  },
]

test('deriveSelectedPlayerInsights picks favorite duke by games played', () => {
  const result = deriveSelectedPlayerInsights(dukeRows)

  assert.equal(result.favoriteDuke?.dukeSlug, 'cornelius_the_dreamer')
  assert.equal(result.favoriteDuke?.gamesPlayed, 6)
})

test('deriveSelectedPlayerInsights ignores dukes with fewer than three games when choosing best duke', () => {
  const result = deriveSelectedPlayerInsights(dukeRows)

  assert.equal(result.bestDuke?.dukeSlug, 'aguilar_the_gilded_knight')
  assert.equal(result.bestDuke?.winRate, 50)
})

test('formatPlayerLeaderboardSummary and formatPlayerDukeSummary return compact UI copy', () => {
  assert.equal(
    formatPlayerLeaderboardSummary({
      wins: 12,
      podiums: 18,
      avg_finish_percentile: 71.4,
    }),
    '12 wins · 18 podiums · Norm finish 71.4'
  )

  assert.equal(
    formatPlayerDukeSummary({
      games_played: 4,
      wins: 2,
      win_rate: 50,
      avg_finish_percentile: 80,
    }),
    '4 games · 2 wins · WR 50.0% · Norm 80.0'
  )
})
