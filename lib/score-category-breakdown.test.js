import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CATEGORY_KEYS,
  aggregateBreakdownsForGames,
  buildPlayerCategoryStats,
  computeCategoryShare,
  computeGameCategoryBreakdown,
  createEmptyCategoryBreakdown,
  getCategoryForStatKey,
} from './score-category-breakdown.ts'

const ZERO_MULTIPLIERS = {
  gold: 0,
  magic: 0,
  fight: 0,
  vp: 0,
  hammer: 0,
  helmet: 0,
  key: 0,
  holy: 0,
  citizenCount: 0,
  monstersCount: 0,
  monsterPoints: 0,
  bossCount: 0,
  lieutenantCount: 0,
  beastCount: 0,
  minionCount: 0,
  domainCount: 0,
  domainPoints: 0,
}

const ZERO_INPUTS = { ...ZERO_MULTIPLIERS }

function makeCard(overrides = {}) {
  return {
    name: 'Test Duke',
    slug: 'test_duke',
    image: null,
    multipliers: { ...ZERO_MULTIPLIERS, ...overrides },
  }
}

test('vp gets its own category, distinct from resources/points-on-cards', () => {
  assert.equal(getCategoryForStatKey('vp'), 'vp')
  assert.equal(getCategoryForStatKey('gold'), 'resources')
  assert.equal(getCategoryForStatKey('hammer'), 'symbols')
  assert.equal(getCategoryForStatKey('bossCount'), 'monsterSymbols')
  assert.equal(getCategoryForStatKey('citizenCount'), 'counts')
  assert.equal(getCategoryForStatKey('monsterPoints'), 'points')
})

test('createEmptyCategoryBreakdown returns all zeros', () => {
  assert.deepEqual(createEmptyCategoryBreakdown(), {
    resources: 0,
    symbols: 0,
    monsterSymbols: 0,
    counts: 0,
    points: 0,
    vp: 0,
    total: 0,
  })
})

test('computeGameCategoryBreakdown keeps Victory Points separate from Resources and Points on Cards', () => {
  // Card that converts 3 resources to 1 point and grants 2 vp per vp input
  const card = makeCard({ gold: 3, magic: 3, fight: 3, vp: 2 })
  const inputs = { ...ZERO_INPUTS, gold: 5, magic: 4, fight: 0, vp: 3 }

  const breakdown = computeGameCategoryBreakdown(card, inputs)

  // (5 + 4) / 3 = 3 from combined resources → resources bucket.
  // vp 3 * 2 = 6 → its own vp bucket (no longer rolled into resources).
  assert.equal(breakdown.resources, 3)
  assert.equal(breakdown.vp, 6)
  assert.equal(breakdown.symbols, 0)
  assert.equal(breakdown.counts, 0)
  assert.equal(breakdown.points, 0)
  assert.equal(breakdown.total, 9)
})

test('computeGameCategoryBreakdown separates monster symbols from points on cards', () => {
  const card = makeCard({
    hammer: 2,
    citizenCount: 1,
    monsterPoints: 3,
    bossCount: 5,
  })
  const inputs = {
    ...ZERO_INPUTS,
    hammer: 4,        // 4 * 2 = 8 → symbols
    citizenCount: 7,  // 7 * 1 = 7 → counts
    monsterPoints: 2, // 2 * 3 = 6 → points
    bossCount: 1,     // 1 * 5 = 5 → points
  }

  const breakdown = computeGameCategoryBreakdown(card, inputs)

  assert.equal(breakdown.symbols, 8)
  assert.equal(breakdown.counts, 7)
  assert.equal(breakdown.monsterSymbols, 5)
  assert.equal(breakdown.points, 6)
  assert.equal(breakdown.resources, 0)
  assert.equal(breakdown.total, 26)
})

test('aggregateBreakdownsForGames sums across multiple games and ignores unknown dukes', () => {
  const cards = {
    a: makeCard({ hammer: 2 }),
    b: makeCard({ citizenCount: 3 }),
  }

  const games = [
    { duke_slug: 'a', inputs: { ...ZERO_INPUTS, hammer: 5 } },     // 10 symbols
    { duke_slug: 'b', inputs: { ...ZERO_INPUTS, citizenCount: 4 } }, // 12 counts
    { duke_slug: 'c', inputs: { ...ZERO_INPUTS, hammer: 100 } },    // unknown duke - skipped
  ]

  const total = aggregateBreakdownsForGames(games, cards)
  assert.equal(total.symbols, 10)
  assert.equal(total.counts, 12)
  assert.equal(total.total, 22)
})

test('buildPlayerCategoryStats separates wins from all games', () => {
  const cards = {
    a: makeCard({ hammer: 2, monsterPoints: 1 }),
  }

  const games = [
    {
      duke_slug: 'a',
      inputs: { ...ZERO_INPUTS, hammer: 5, monsterPoints: 2 },
      is_winner: true,
    },
    {
      duke_slug: 'a',
      inputs: { ...ZERO_INPUTS, hammer: 1, monsterPoints: 8 },
      is_winner: false,
    },
  ]

  const stats = buildPlayerCategoryStats(games, cards)

  assert.equal(stats.totalGames, 2)
  assert.equal(stats.totalWins, 1)

  // All games: hammer 6*2=12 symbols, monsterPoints 10*1=10 points
  assert.equal(stats.allGames.symbols, 12)
  assert.equal(stats.allGames.points, 10)
  assert.equal(stats.allGames.total, 22)

  // Wins only: hammer 5*2=10 symbols, monsterPoints 2*1=2 points
  assert.equal(stats.winsOnly.symbols, 10)
  assert.equal(stats.winsOnly.points, 2)
  assert.equal(stats.winsOnly.total, 12)
})

test('computeCategoryShare returns 0 when total is 0 and percentages otherwise', () => {
  const empty = createEmptyCategoryBreakdown()
  assert.equal(computeCategoryShare(empty, 'resources'), 0)

  const breakdown = {
    resources: 30,
    symbols: 20,
    monsterSymbols: 10,
    counts: 10,
    points: 30,
    vp: 0,
    total: 100,
  }
  assert.equal(computeCategoryShare(breakdown, 'resources'), 30)
  assert.equal(computeCategoryShare(breakdown, 'monsterSymbols'), 10)
  assert.equal(computeCategoryShare(breakdown, 'points'), 30)
})

test('CATEGORY_KEYS exposes all six labelled categories with vp last', () => {
  assert.deepEqual([...CATEGORY_KEYS], [
    'resources',
    'symbols',
    'monsterSymbols',
    'counts',
    'points',
    'vp',
  ])
})
