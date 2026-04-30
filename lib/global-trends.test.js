import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildAverageShapeOverTime,
  buildMetaSnapshot,
  buildTierList,
} from './global-trends.ts'

const ZERO_MULT = {
  gold: 0, magic: 0, fight: 0, vp: 0,
  hammer: 0, helmet: 0, key: 0, holy: 0,
  citizenCount: 0, monstersCount: 0, domainCount: 0,
  monsterPoints: 0, bossCount: 0, lieutenantCount: 0,
  beastCount: 0, minionCount: 0, domainPoints: 0,
}
const ZERO_INPUT = { ...ZERO_MULT }

function makeCard(slug, mults) {
  return { slug, name: slug, image: null, multipliers: { ...ZERO_MULT, ...mults } }
}

test('meta snapshot finds top played + top scoring within window', () => {
  const now = '2026-04-27T00:00:00Z'
  const rows = [
    { duke_slug: 'a', total_score: 50, updated_at: '2026-04-25T00:00:00Z' },
    { duke_slug: 'a', total_score: 60, updated_at: '2026-04-25T00:00:00Z' },
    { duke_slug: 'a', total_score: 70, updated_at: '2026-04-25T00:00:00Z' },
    { duke_slug: 'b', total_score: 90, updated_at: '2026-04-26T00:00:00Z' },
    { duke_slug: 'b', total_score: 100, updated_at: '2026-04-26T00:00:00Z' },
    { duke_slug: 'c', total_score: 1000, updated_at: '2025-01-01T00:00:00Z' }, // outside window
  ]

  const snap = buildMetaSnapshot(rows, { windowDays: 7, nowIso: now })
  assert.equal(snap.totalGames, 5)
  assert.equal(snap.uniqueDukes, 2)
  assert.equal(snap.topPlayed.duke_slug, 'a')
  assert.equal(snap.topScoring.duke_slug, 'b')
})

test('meta snapshot returns nulls when nothing falls in the window', () => {
  const snap = buildMetaSnapshot([], { windowDays: 7, nowIso: '2026-04-27T00:00:00Z' })
  assert.equal(snap.totalGames, 0)
  assert.equal(snap.topPlayed, null)
  assert.equal(snap.topScoring, null)
})

test('tier list buckets by win_percentage with sample threshold', () => {
  const rows = [
    { duke_slug: 's', games_played: 10, win_percentage: 60, avg_score: 80 },
    { duke_slug: 'a', games_played: 10, win_percentage: 40, avg_score: 70 },
    { duke_slug: 'b', games_played: 10, win_percentage: 25, avg_score: 50 },
    { duke_slug: 'c', games_played: 10, win_percentage: 10, avg_score: 30 },
    { duke_slug: 'tiny', games_played: 1, win_percentage: 100, avg_score: 200 },
  ]

  const tiers = buildTierList(rows, { minGames: 5 })
  const bySlug = Object.fromEntries(tiers.map((t) => [t.duke_slug, t.tier]))
  assert.equal(bySlug.s, 'S')
  assert.equal(bySlug.a, 'A')
  assert.equal(bySlug.b, 'B')
  assert.equal(bySlug.c, 'C')
  assert.equal(bySlug.tiny, 'Unranked')
})

test('tier list sorts S first then by win % desc', () => {
  const rows = [
    { duke_slug: 'late_s', games_played: 10, win_percentage: 51, avg_score: 70 },
    { duke_slug: 'top_s', games_played: 10, win_percentage: 80, avg_score: 70 },
  ]
  const tiers = buildTierList(rows)
  assert.deepEqual(tiers.map((t) => t.duke_slug), ['top_s', 'late_s'])
})

test('average shape over time buckets games into months', () => {
  const cards = { a: makeCard('a', { hammer: 2, monsterPoints: 1 }) }
  const rows = [
    {
      duke_slug: 'a',
      inputs: { ...ZERO_INPUT, hammer: 5 },
      updated_at: '2026-03-15T12:00:00Z',
    }, // 100% symbols
    {
      duke_slug: 'a',
      inputs: { ...ZERO_INPUT, monsterPoints: 4 },
      updated_at: '2026-03-20T12:00:00Z',
    }, // 100% points
    {
      duke_slug: 'a',
      inputs: { ...ZERO_INPUT, hammer: 5 },
      updated_at: '2026-04-10T12:00:00Z',
    },
  ]
  const months = buildAverageShapeOverTime(rows, cards)
  assert.equal(months.length, 2)
  assert.equal(months[0].monthIso, '2026-03-01')
  assert.equal(months[1].monthIso, '2026-04-01')
  assert.equal(months[0].games, 2)
  // Average of (100% symbols) and (100% points) → 50/50.
  assert.equal(months[0].shares.symbols, 50)
  assert.equal(months[0].shares.points, 50)
})
