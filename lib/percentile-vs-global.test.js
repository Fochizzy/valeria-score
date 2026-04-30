import assert from 'node:assert/strict'
import test from 'node:test'

import { computePercentileResult, formatPercentileLabel } from './percentile-vs-global.ts'

const ROWS = [
  { player_key: 'a', win_rate: 80, avg_score: 50, podium_rate: 90 },
  { player_key: 'b', win_rate: 60, avg_score: 60, podium_rate: 80 },
  { player_key: 'c', win_rate: 60, avg_score: 40, podium_rate: 70 },
  { player_key: 'd', win_rate: 30, avg_score: 30, podium_rate: 50 },
]

test('returns null below the minimum sample size', () => {
  const result = computePercentileResult(ROWS.slice(0, 1), 'a', 'win_rate')
  assert.equal(result, null)
})

test('ranks the viewer by win rate with avg_score tiebreaker', () => {
  const result = computePercentileResult(ROWS, 'b', 'win_rate')
  assert.deepEqual(result, { rank: 2, total: 4, topPercent: 50 })
})

test('returns null when viewer is not present', () => {
  const result = computePercentileResult(ROWS, 'zz', 'avg_score')
  assert.equal(result, null)
})

test('formats labels for top result and lower ranks', () => {
  assert.equal(formatPercentileLabel({ rank: 1, total: 5, topPercent: 20 }), '#1 of 5')
  assert.equal(formatPercentileLabel({ rank: 2, total: 5, topPercent: 40 }), 'Top 40% (2 of 5)')
  assert.equal(formatPercentileLabel(null), 'Not ranked yet')
})
