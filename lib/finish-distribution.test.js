import assert from 'node:assert/strict'
import test from 'node:test'

import { computeFinishDistribution, computeFinishShares } from './finish-distribution.ts'

test('counts ranks into buckets', () => {
  const result = computeFinishDistribution([1, 1, 2, 3, 4, 5, 6])
  assert.deepEqual(result, { '1st': 2, '2nd': 1, '3rd': 1, '4th+': 3, total: 7 })
})

test('skips invalid or non-positive ranks', () => {
  const result = computeFinishDistribution([null, undefined, 0, -1, NaN, 1])
  assert.equal(result.total, 1)
  assert.equal(result['1st'], 1)
})

test('shares sum to ~100 when there is data', () => {
  const dist = computeFinishDistribution([1, 2, 3, 4])
  const shares = computeFinishShares(dist)
  const sum = shares['1st'] + shares['2nd'] + shares['3rd'] + shares['4th+']
  assert.ok(Math.abs(sum - 100) < 0.01)
})

test('shares are zero when there is no data', () => {
  const shares = computeFinishShares({ '1st': 0, '2nd': 0, '3rd': 0, '4th+': 0, total: 0 })
  assert.deepEqual(shares, { '1st': 0, '2nd': 0, '3rd': 0, '4th+': 0 })
})
