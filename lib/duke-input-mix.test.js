import assert from 'node:assert/strict'
import test from 'node:test'

import { computeDukeInputMix } from './duke-input-mix.ts'

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

test('averages category shares across multiple games per duke', () => {
  const aguilar = makeCard('aguilar', { hammer: 2, monsterPoints: 1 })
  const cards = { aguilar }

  const games = [
    // Game 1: hammer 5*2=10 (symbols), monsterPoints 0  -> 100% symbols
    { duke_slug: 'aguilar', inputs: { ...ZERO_INPUT, hammer: 5 } },
    // Game 2: monsterPoints 10*1=10 (points), hammer 0 -> 100% points
    { duke_slug: 'aguilar', inputs: { ...ZERO_INPUT, monsterPoints: 10 } },
  ]

  const [entry] = computeDukeInputMix(games, cards)
  assert.equal(entry.games, 2)
  assert.equal(entry.shares.symbols, 50)
  assert.equal(entry.shares.points, 50)
  assert.equal(entry.shares.resources, 0)
  assert.equal(entry.shares.counts, 0)
})

test('skips games with no scoring contribution', () => {
  const aguilar = makeCard('aguilar', { hammer: 2 })
  const games = [
    { duke_slug: 'aguilar', inputs: ZERO_INPUT },
    { duke_slug: 'aguilar', inputs: { ...ZERO_INPUT, hammer: 1 } },
  ]
  const [entry] = computeDukeInputMix(games, { aguilar })
  assert.equal(entry.games, 1)
})

test('returns empty list when no games match a known duke', () => {
  const games = [{ duke_slug: 'unknown', inputs: { gold: 5 } }]
  assert.deepEqual(computeDukeInputMix(games, {}), [])
})

test('sorts dukes by game count desc', () => {
  const a = makeCard('a', { hammer: 1 })
  const b = makeCard('b', { hammer: 1 })
  const games = [
    { duke_slug: 'a', inputs: { ...ZERO_INPUT, hammer: 1 } },
    { duke_slug: 'b', inputs: { ...ZERO_INPUT, hammer: 1 } },
    { duke_slug: 'b', inputs: { ...ZERO_INPUT, hammer: 1 } },
  ]
  const result = computeDukeInputMix(games, { a, b })
  assert.deepEqual(
    result.map((r) => r.duke_slug),
    ['b', 'a']
  )
})
