import assert from 'node:assert/strict'
import test from 'node:test'

import { buildDukeBreakdownInsights } from './duke-breakdown-insights.ts'

test('returns most-played + dominant category + steady/swingy callouts', () => {
  const inputMix = [
    {
      duke_slug: 'aguilar_the_gilded_knight',
      games: 4,
      shares: {
        resources: 30,
        symbols: 20,
        monsterSymbols: 40,
        counts: 5,
        points: 5,
        vp: 0,
      },
    },
    {
      duke_slug: 'cornelius_the_dreamer',
      games: 2,
      shares: {
        resources: 20,
        symbols: 10,
        monsterSymbols: 50,
        counts: 10,
        points: 10,
        vp: 0,
      },
    },
  ]
  const volatility = [
    {
      duke_slug: 'aguilar_the_gilded_knight',
      games: 4,
      mean: 60,
      stddev: 4,
      min: 56,
      max: 65,
      volatilityIndex: 0.07,
    },
    {
      duke_slug: 'cornelius_the_dreamer',
      games: 3,
      mean: 50,
      stddev: 18,
      min: 30,
      max: 70,
      volatilityIndex: 0.36,
    },
  ]

  const insights = buildDukeBreakdownInsights({ inputMix, volatility })
  const titles = insights.map((i) => i.title)
  assert.ok(titles.includes('Most Played'))
  assert.ok(titles.includes('Where Points Come From'))
  assert.ok(titles.includes('Steady vs Swingy'))

  const mostPlayed = insights.find((i) => i.title === 'Most Played')
  assert.match(mostPlayed.body, /4 tracked games/)

  const points = insights.find((i) => i.title === 'Where Points Come From')
  assert.match(points.body, /Monster Symbols/)

  const swing = insights.find((i) => i.title === 'Steady vs Swingy')
  // Aguilar steady, Cornelius swingy
  assert.match(swing.body, /steadiest/)
})

test('returns no insights when both inputs are empty', () => {
  const insights = buildDukeBreakdownInsights({ inputMix: [], volatility: [] })
  assert.deepEqual(insights, [])
})

test('uses Steadiest Duke fallback when only one volatility entry qualifies', () => {
  const insights = buildDukeBreakdownInsights({
    inputMix: [
      {
        duke_slug: 'aguilar_the_gilded_knight',
        games: 5,
        shares: {
          resources: 40,
          symbols: 20,
          monsterSymbols: 20,
          counts: 10,
          points: 10,
          vp: 0,
        },
      },
    ],
    volatility: [
      {
        duke_slug: 'aguilar_the_gilded_knight',
        games: 4,
        mean: 60,
        stddev: 5,
        min: 55,
        max: 65,
        volatilityIndex: 0.08,
      },
    ],
  })
  const steadyInsight = insights.find((i) => i.title === 'Steadiest Duke')
  assert.ok(steadyInsight)
})
