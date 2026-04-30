import assert from 'node:assert/strict'
import test from 'node:test'

import { buildDukeVsGlobalRows } from './duke-vs-global.ts'

test('joins player rows to global rows and computes deltas', () => {
  const player = [
    { duke_slug: 'aguilar', games_played: 5, wins: 3, win_rate: 60, avg_score: 80 },
    { duke_slug: 'cornelius', games_played: 4, wins: 1, win_rate: 25, avg_score: 60 },
  ]
  const global = [
    { duke_slug: 'aguilar', games_played: 100, win_percentage: 40, avg_score: 70 },
    { duke_slug: 'cornelius', games_played: 80, win_percentage: 35, avg_score: 65 },
  ]

  const rows = buildDukeVsGlobalRows(player, global)
  const aguilar = rows.find((r) => r.duke_slug === 'aguilar')
  const cornelius = rows.find((r) => r.duke_slug === 'cornelius')

  assert.equal(aguilar.win_rate_delta, 20)
  assert.equal(aguilar.avg_score_delta, 10)
  assert.equal(cornelius.win_rate_delta, -10)
  assert.equal(cornelius.avg_score_delta, -5)
})

test('handles missing global rows gracefully', () => {
  const player = [{ duke_slug: 'aguilar', games_played: 1, wins: 0, win_rate: 0, avg_score: 30 }]
  const rows = buildDukeVsGlobalRows(player, [])
  assert.equal(rows[0].global_games, 0)
  assert.equal(rows[0].win_rate_delta, 0)
  assert.equal(rows[0].avg_score_delta, 30)
})

test('sorts by win_rate delta desc then avg_score delta desc', () => {
  const player = [
    { duke_slug: 'a', games_played: 1, wins: 0, win_rate: 50, avg_score: 60 },
    { duke_slug: 'b', games_played: 1, wins: 0, win_rate: 70, avg_score: 50 },
    { duke_slug: 'c', games_played: 1, wins: 0, win_rate: 70, avg_score: 80 },
  ]
  const global = [
    { duke_slug: 'a', games_played: 1, win_percentage: 30, avg_score: 30 },
    { duke_slug: 'b', games_played: 1, win_percentage: 30, avg_score: 30 },
    { duke_slug: 'c', games_played: 1, win_percentage: 30, avg_score: 30 },
  ]
  const rows = buildDukeVsGlobalRows(player, global)
  assert.deepEqual(
    rows.map((r) => r.duke_slug),
    ['c', 'b', 'a']
  )
})
