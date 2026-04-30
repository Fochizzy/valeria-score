import assert from 'node:assert/strict'
import test from 'node:test'

import { buildPlayerCategoryInsights } from './category-insights.ts'

function buildBreakdown(values) {
  const base = {
    resources: 0,
    symbols: 0,
    monsterSymbols: 0,
    counts: 0,
    points: 0,
    vp: 0,
  }
  const merged = { ...base, ...values }
  return {
    ...merged,
    total:
      merged.resources +
      merged.symbols +
      merged.monsterSymbols +
      merged.counts +
      merged.points +
      merged.vp,
  }
}

test('returns no insights when there are no games', () => {
  const insights = buildPlayerCategoryInsights({
    allGames: buildBreakdown({}),
    winsOnly: buildBreakdown({}),
    totalGames: 0,
    totalWins: 0,
  })

  assert.deepEqual(insights, [])
})

test('returns the lead-category insight when there are games but no wins', () => {
  const insights = buildPlayerCategoryInsights({
    allGames: buildBreakdown({ resources: 60, points: 40 }),
    winsOnly: buildBreakdown({}),
    totalGames: 5,
    totalWins: 0,
  })

  const lead = insights.find((insight) => insight.title === 'Where Your Points Come From')
  assert.ok(lead)
  assert.match(lead.body, /Resources/)
  assert.match(lead.body, /60%/)
  assert.match(lead.body, /biggest category/)

  const winsInsight = insights.find((insight) => insight.title === 'What Wins Look Like')
  assert.equal(winsInsight, undefined)
})

test('produces a wins insight that calls out a meaningful lean', () => {
  const insights = buildPlayerCategoryInsights({
    allGames: buildBreakdown({ resources: 50, symbols: 20, counts: 10, points: 20 }),
    winsOnly: buildBreakdown({ resources: 70, symbols: 10, counts: 10, points: 10 }),
    totalGames: 10,
    totalWins: 4,
  })

  const winsInsight = insights.find((insight) => insight.title === 'What Wins Look Like')
  assert.ok(winsInsight)
  assert.match(winsInsight.body, /lean further into Resources/)
  assert.match(winsInsight.body, /4 winning games/)
})

test('produces a balanced wins insight when the lead pulls back', () => {
  const insights = buildPlayerCategoryInsights({
    allGames: buildBreakdown({ resources: 70, symbols: 10, counts: 10, points: 10 }),
    winsOnly: buildBreakdown({ resources: 40, symbols: 20, counts: 20, points: 20 }),
    totalGames: 10,
    totalWins: 1,
  })

  const winsInsight = insights.find((insight) => insight.title === 'What Wins Look Like')
  assert.ok(winsInsight)
  assert.match(winsInsight.body, /1 winning game[^s]/)
  assert.match(winsInsight.body, /balanced/i)
})

test('produces a focused scoring-style insight when two categories dominate', () => {
  const insights = buildPlayerCategoryInsights({
    allGames: buildBreakdown({ resources: 60, points: 30, symbols: 5, counts: 5 }),
    winsOnly: buildBreakdown({ resources: 60, points: 30, symbols: 5, counts: 5 }),
    totalGames: 5,
    totalWins: 2,
  })

  const styleInsight = insights.find((insight) => insight.title === 'Scoring Style')
  assert.ok(styleInsight)
  assert.match(styleInsight.body, /focused/)
})

test('produces an even-spread scoring-style insight when no two categories dominate', () => {
  const insights = buildPlayerCategoryInsights({
    allGames: buildBreakdown({
      resources: 20,
      symbols: 20,
      monsterSymbols: 20,
      counts: 20,
      points: 20,
    }),
    winsOnly: buildBreakdown({
      resources: 20,
      symbols: 20,
      monsterSymbols: 20,
      counts: 20,
      points: 20,
    }),
    totalGames: 6,
    totalWins: 1,
  })

  const styleInsight = insights.find((insight) => insight.title === 'Scoring Style')
  assert.ok(styleInsight)
  assert.match(styleInsight.body, /all six categories/)
})

test('names Monster Symbols when that category leads overall scoring', () => {
  const insights = buildPlayerCategoryInsights({
    allGames: buildBreakdown({ monsterSymbols: 55, resources: 25, points: 20 }),
    winsOnly: buildBreakdown({}),
    totalGames: 4,
    totalWins: 0,
  })

  const lead = insights.find((insight) => insight.title === 'Where Your Points Come From')
  assert.ok(lead)
  assert.match(lead.body, /Monster Symbols/)
})

test('caps insights at 3 cards', () => {
  const insights = buildPlayerCategoryInsights({
    allGames: buildBreakdown({ resources: 60, points: 30, symbols: 5, counts: 5 }),
    winsOnly: buildBreakdown({ resources: 80, points: 10, symbols: 5, counts: 5 }),
    totalGames: 7,
    totalWins: 3,
  })

  assert.equal(insights.length <= 3, true)
})
