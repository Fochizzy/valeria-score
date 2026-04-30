import assert from 'node:assert/strict'
import test from 'node:test'

import { buildGlobalTrendsInsights } from './global-trends-insights.ts'

function emptyShares() {
  return {
    resources: 0,
    symbols: 0,
    monsterSymbols: 0,
    counts: 0,
    points: 0,
    vp: 0,
  }
}

function makeMeta(overrides = {}) {
  return {
    windowDays: 7,
    totalGames: 0,
    uniqueDukes: 0,
    topPlayed: null,
    topScoring: null,
    ...overrides,
  }
}

test('returns no insights when there is no data at all', () => {
  const insights = buildGlobalTrendsInsights({
    meta: makeMeta(),
    tierList: [],
    shapeOverTime: [],
  })
  assert.deepEqual(insights, [])
})

test('builds activity, most-played, and top-scoring from meta', () => {
  const insights = buildGlobalTrendsInsights({
    meta: makeMeta({
      totalGames: 14,
      uniqueDukes: 6,
      topPlayed: { duke_slug: 'cornelius_the_dreamer', games: 5 },
      topScoring: {
        duke_slug: 'sir_roberts_of_stoneblood',
        avg_score: 47.2,
        games: 3,
      },
    }),
    tierList: [],
    shapeOverTime: [],
  })

  const titles = insights.map((insight) => insight.title)
  assert.ok(titles.includes('Recent Activity'))
  assert.ok(titles.includes('Most Played'))
  assert.ok(titles.includes('Top Average Score'))

  const activity = insights.find((insight) => insight.title === 'Recent Activity')
  assert.match(activity.body, /14 games/)
  assert.match(activity.body, /6 dukes/)
  assert.match(activity.body, /7 days/)

  const topScoring = insights.find((insight) => insight.title === 'Top Average Score')
  assert.match(topScoring.body, /47\.2 points/)
  assert.match(topScoring.body, /3 games/)
})

test('S-tier insight calls out the leading S-tier duke', () => {
  const insights = buildGlobalTrendsInsights({
    meta: makeMeta(),
    tierList: [
      {
        duke_slug: 'duke_a',
        tier: 'S',
        games_played: 10,
        win_percentage: 60,
        avg_score: 50,
      },
      {
        duke_slug: 'duke_b',
        tier: 'S',
        games_played: 8,
        win_percentage: 55,
        avg_score: 48,
      },
      {
        duke_slug: 'duke_c',
        tier: 'A',
        games_played: 6,
        win_percentage: 40,
        avg_score: 40,
      },
    ],
    shapeOverTime: [],
  })

  const sTier = insights.find((insight) => insight.title === 'S-Tier')
  assert.ok(sTier)
  assert.match(sTier.body, /2 dukes hit S-tier/)
  assert.match(sTier.body, /60\.0% wins/)
})

test('falls back to a tier-leader insight when no duke is S-tier yet', () => {
  const insights = buildGlobalTrendsInsights({
    meta: makeMeta(),
    tierList: [
      {
        duke_slug: 'duke_a',
        tier: 'A',
        games_played: 10,
        win_percentage: 42,
        avg_score: 50,
      },
      {
        duke_slug: 'duke_b',
        tier: 'B',
        games_played: 8,
        win_percentage: 30,
        avg_score: 40,
      },
    ],
    shapeOverTime: [],
  })

  const leader = insights.find((insight) => insight.title === 'Tier Leader')
  assert.ok(leader)
  assert.match(leader.body, /No duke has cracked S-tier/)
  assert.match(leader.body, /42\.0% wins/)
  assert.match(leader.body, /A-tier/)
})

test('shape insight describes the dominant category for the latest month', () => {
  const insights = buildGlobalTrendsInsights({
    meta: makeMeta(),
    tierList: [],
    shapeOverTime: [
      {
        monthIso: '2026-04-01',
        monthLabel: 'Apr 2026',
        games: 5,
        shares: { ...emptyShares(), symbols: 45.0, resources: 25.0, points: 20.0 },
      },
    ],
  })

  const shape = insights.find((insight) => insight.title === 'Game Shape')
  assert.ok(shape)
  assert.match(shape.body, /Apr 2026/)
  assert.match(shape.body, /Symbols/)
  assert.match(shape.body, /45\.0%/)
})

test('shape insight calls out a 5+pt month-over-month shift when present', () => {
  const insights = buildGlobalTrendsInsights({
    meta: makeMeta(),
    tierList: [],
    shapeOverTime: [
      {
        monthIso: '2026-03-01',
        monthLabel: 'Mar 2026',
        games: 5,
        shares: { ...emptyShares(), resources: 50, symbols: 30 },
      },
      {
        monthIso: '2026-04-01',
        monthLabel: 'Apr 2026',
        games: 6,
        shares: { ...emptyShares(), resources: 60, symbols: 25 },
      },
    ],
  })

  const shape = insights.find((insight) => insight.title === 'Game Shape')
  assert.ok(shape)
  assert.match(shape.body, /up from 50\.0%/)
})

test('caps insights at 4', () => {
  const insights = buildGlobalTrendsInsights({
    meta: makeMeta({
      totalGames: 14,
      uniqueDukes: 6,
      topPlayed: { duke_slug: 'duke_a', games: 5 },
      topScoring: { duke_slug: 'duke_b', avg_score: 47.2, games: 3 },
    }),
    tierList: [
      {
        duke_slug: 'duke_a',
        tier: 'S',
        games_played: 10,
        win_percentage: 60,
        avg_score: 50,
      },
    ],
    shapeOverTime: [
      {
        monthIso: '2026-04-01',
        monthLabel: 'Apr 2026',
        games: 5,
        shares: { ...emptyShares(), symbols: 45.0 },
      },
    ],
  })

  assert.equal(insights.length, 4)
})
