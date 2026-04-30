import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildAcrossGamesInsights,
  buildSelectedDukeInsights,
} from './duke-panel-insights.ts'

test('selected-duke insights highlight the strongest family for the picked duke', () => {
  const insights = buildSelectedDukeInsights({
    dukeName: 'Daniela the Huntress',
    gamesPlayed: 5,
    familyRows: [
      { family_key: 'monsters', label: 'Monsters', points_share: 26.7, avg_points_generated: 20 },
      { family_key: 'equipment', label: 'Symbols', points_share: 42.7, avg_points_generated: 32 },
    ],
    winningRows: [],
    canShowWinningProfile: false,
  })

  assert.ok(insights.length >= 1)
  assert.match(insights[0].title, /Strongest Family/)
  assert.match(insights[0].body, /Symbols/)
  assert.match(insights[0].body, /42.7%/)
  assert.match(insights[0].body, /Daniela the Huntress/)
})

test('selected-duke insights add a winning-profile callout when win-delta is positive', () => {
  const insights = buildSelectedDukeInsights({
    dukeName: 'Cornelius the Dreamer',
    gamesPlayed: 6,
    familyRows: [
      { family_key: 'equipment', label: 'Symbols', points_share: 30, avg_points_generated: 22 },
    ],
    winningRows: [
      {
        duke_slug: 'cornelius_the_dreamer',
        stat_key: 'monsterPoints',
        label: 'Monster Points',
        profile_scope: 'winning_games',
        avg_input: 4,
        avg_points_generated: 12,
        points_share: 28,
        share_delta_vs_global: 5.4,
        games_sample: 3,
      },
    ],
    canShowWinningProfile: true,
  })

  const winsInsight = insights.find((i) => i.title === 'In Wins')
  assert.ok(winsInsight)
  assert.match(winsInsight.body, /Monster Points/)
  assert.match(winsInsight.body, /\+5\.4/)
})

test('across-games insights surface the dominant family + close-finish rate', () => {
  const insights = buildAcrossGamesInsights({
    familyRows: [
      { family_key: 'monsters', label: 'Monsters', points_share: 26.9, avg_points_generated: 36 },
      { family_key: 'equipment', label: 'Symbols', points_share: 33.5, avg_points_generated: 53 },
    ],
    marginRows: [
      {
        margin_bucket: 'lte_3',
        label: '≤3 pts or closer',
        tables_sample: 6,
        tables_with_margin: 2,
        share_percentage: 33.3,
      },
      {
        margin_bucket: 'lte_5',
        label: '≤5 pts or closer',
        tables_sample: 6,
        tables_with_margin: 4,
        share_percentage: 66.7,
      },
    ],
  })

  const family = insights.find((i) => i.title === 'Biggest Family')
  const close = insights.find((i) => i.title === 'Close Finishes')
  assert.ok(family)
  assert.match(family.body, /Symbols/)
  assert.match(family.body, /33\.5%/)
  assert.ok(close)
  // Should prefer the strictest bucket (lte_3) when both have data.
  assert.match(close.body, /≤3 pts or closer/)
  assert.match(close.body, /2 of 6/)
})

test('across-games insights skip empty data', () => {
  const insights = buildAcrossGamesInsights({
    familyRows: [],
    marginRows: [],
  })
  assert.deepEqual(insights, [])
})

test('selected-duke insights skip when the duke has zero tracked games', () => {
  const insights = buildSelectedDukeInsights({
    dukeName: 'Test Duke',
    gamesPlayed: 0,
    familyRows: [
      { family_key: 'equipment', label: 'Symbols', points_share: 50, avg_points_generated: 30 },
    ],
    winningRows: [],
    canShowWinningProfile: false,
  })
  assert.deepEqual(insights, [])
})
