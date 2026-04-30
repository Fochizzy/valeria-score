import assert from 'node:assert/strict'
import test from 'node:test'

import { classifyVolatility, computeDukeVolatility } from './duke-volatility.ts'

test('computes mean and sample stddev per duke', () => {
  const rows = [
    { duke_slug: 'a', total_score: 50 },
    { duke_slug: 'a', total_score: 70 },
    { duke_slug: 'a', total_score: 60 },
  ]
  const [entry] = computeDukeVolatility(rows)
  assert.equal(entry.games, 3)
  assert.equal(entry.mean, 60)
  assert.ok(Math.abs(entry.stddev - 10) < 0.0001)
  assert.equal(entry.min, 50)
  assert.equal(entry.max, 70)
})

test('returns 0 stddev when there is a single game', () => {
  const [entry] = computeDukeVolatility([{ duke_slug: 'a', total_score: 42 }])
  assert.equal(entry.stddev, 0)
  assert.equal(entry.mean, 42)
})

test('classifyVolatility uses coefficient of variation thresholds', () => {
  assert.equal(classifyVolatility(5, 100), 'Steady')   // cv 0.05
  assert.equal(classifyVolatility(30, 100), 'Moderate') // cv 0.3
  assert.equal(classifyVolatility(50, 100), 'Swingy')  // cv 0.5
  assert.equal(classifyVolatility(10, 0), 'Steady')   // mean 0 → Steady
})

test('skips invalid scores', () => {
  const result = computeDukeVolatility([
    { duke_slug: 'a', total_score: NaN },
    { duke_slug: 'a', total_score: 'hi' },
    { duke_slug: 'a', total_score: 5 },
  ])
  assert.equal(result[0].games, 1)
})
