import assert from 'node:assert/strict'
import test from 'node:test'

import { cards } from '../data/cards.ts'
import { buildCardsLookup } from './score-category-breakdown.ts'
import {
  buildSoloCategoryStats,
  buildSoloDukeUsageRows,
  buildSoloStatsMeta,
  buildSoloMatchupRows,
  buildSoloStrategySections,
  buildSoloStatsSummary,
} from './solo-stats.ts'

const cardsLookup = buildCardsLookup(cards)

const sampleRows = [
  {
    player_duke_slug: 'aguilar_the_gilded_knight',
    dark_lord_duke_slug: 'drakkenstrike',
    victory_condition: 'slay_all_monsters',
    winner: 'player',
    resolution: 'player_auto',
    player_total: 0,
    dark_lord_total: 0,
    player_inputs: {},
    dark_lord_inputs: {},
  },
  {
    player_duke_slug: 'aguilar_the_gilded_knight',
    dark_lord_duke_slug: 'gurika_the_guardian',
    victory_condition: 'five_stacks_exhausted',
    winner: 'dark_lord',
    resolution: 'contested',
    player_total: 36,
    dark_lord_total: 36,
    player_inputs: {
      gold: 8,
      magic: 4,
      fight: 4,
      vp: 6,
      monsterPoints: 5,
      domainCount: 2,
      domainPoints: 3,
    },
    dark_lord_inputs: {},
  },
  {
    player_duke_slug: 'cornelius_the_dreamer',
    dark_lord_duke_slug: 'drakkenstrike',
    victory_condition: 'five_stacks_exhausted',
    winner: 'player',
    resolution: 'contested',
    player_total: 51,
    dark_lord_total: 45,
    player_inputs: {
      gold: 9,
      magic: 6,
      fight: 3,
      vp: 10,
      monsterPoints: 8,
      domainCount: 3,
      domainPoints: 7,
    },
    dark_lord_inputs: {},
  },
]

const strategyRows = [
  {
    player_duke_slug: 'aguilar_the_gilded_knight',
    dark_lord_duke_slug: 'drakkenstrike',
    victory_condition: 'five_stacks_exhausted',
    winner: 'player',
    resolution: 'contested',
    player_total: 52,
    dark_lord_total: 40,
    player_inputs: {
      gold: 8,
      magic: 4,
      fight: 4,
      vp: 5,
      monstersCount: 2,
      monsterPoints: 6,
      domainCount: 4,
      domainPoints: 8,
    },
    dark_lord_inputs: {},
  },
  {
    player_duke_slug: 'aguilar_the_gilded_knight',
    dark_lord_duke_slug: 'drakkenstrike',
    victory_condition: 'five_stacks_exhausted',
    winner: 'player',
    resolution: 'contested',
    player_total: 48,
    dark_lord_total: 41,
    player_inputs: {
      gold: 7,
      magic: 4,
      fight: 4,
      vp: 5,
      monstersCount: 1,
      monsterPoints: 5,
      domainCount: 4,
      domainPoints: 7,
    },
    dark_lord_inputs: {},
  },
  {
    player_duke_slug: 'aguilar_the_gilded_knight',
    dark_lord_duke_slug: 'drakkenstrike',
    victory_condition: 'slay_all_monsters',
    winner: 'player',
    resolution: 'player_auto',
    player_total: 0,
    dark_lord_total: 0,
    player_inputs: {},
    dark_lord_inputs: {},
  },
  {
    player_duke_slug: 'aguilar_the_gilded_knight',
    dark_lord_duke_slug: 'gurika_the_guardian',
    victory_condition: 'five_stacks_exhausted',
    winner: 'player',
    resolution: 'contested',
    player_total: 44,
    dark_lord_total: 39,
    player_inputs: {
      gold: 6,
      magic: 4,
      fight: 3,
      vp: 4,
      monstersCount: 1,
      monsterPoints: 4,
      domainCount: 3,
      domainPoints: 6,
    },
    dark_lord_inputs: {},
  },
  {
    player_duke_slug: 'aguilar_the_gilded_knight',
    dark_lord_duke_slug: 'gurika_the_guardian',
    victory_condition: 'five_stacks_exhausted',
    winner: 'dark_lord',
    resolution: 'contested',
    player_total: 38,
    dark_lord_total: 40,
    player_inputs: {
      gold: 5,
      magic: 3,
      fight: 3,
      vp: 4,
      monsterPoints: 3,
      domainCount: 2,
      domainPoints: 4,
    },
    dark_lord_inputs: {},
  },
  {
    player_duke_slug: 'aguilar_the_gilded_knight',
    dark_lord_duke_slug: 'gurika_the_guardian',
    victory_condition: 'five_stacks_exhausted',
    winner: 'player',
    resolution: 'contested',
    player_total: 42,
    dark_lord_total: 37,
    player_inputs: {
      gold: 6,
      magic: 4,
      fight: 3,
      vp: 4,
      monstersCount: 1,
      monsterPoints: 4,
      domainCount: 3,
      domainPoints: 6,
    },
    dark_lord_inputs: {},
  },
  {
    player_duke_slug: 'aguilar_the_gilded_knight',
    dark_lord_duke_slug: 'gurika_the_guardian',
    victory_condition: 'five_stacks_exhausted',
    winner: 'dark_lord',
    resolution: 'contested',
    player_total: 36,
    dark_lord_total: 39,
    player_inputs: {
      gold: 4,
      magic: 3,
      fight: 3,
      vp: 3,
      monsterPoints: 2,
      domainCount: 1,
      domainPoints: 2,
    },
    dark_lord_inputs: {},
  },
  {
    player_duke_slug: 'aguilar_the_gilded_knight',
    dark_lord_duke_slug: 'gurika_the_guardian',
    victory_condition: 'five_stacks_exhausted',
    winner: 'player',
    resolution: 'contested',
    player_total: 43,
    dark_lord_total: 35,
    player_inputs: {
      gold: 6,
      magic: 4,
      fight: 3,
      vp: 4,
      monstersCount: 1,
      monsterPoints: 5,
      domainCount: 3,
      domainPoints: 7,
    },
    dark_lord_inputs: {},
  },
  {
    player_duke_slug: 'cornelius_the_dreamer',
    dark_lord_duke_slug: 'drakkenstrike',
    victory_condition: 'five_stacks_exhausted',
    winner: 'dark_lord',
    resolution: 'contested',
    player_total: 34,
    dark_lord_total: 42,
    player_inputs: {
      gold: 4,
      magic: 3,
      fight: 3,
      vp: 3,
      monsterPoints: 2,
      domainCount: 0,
      domainPoints: 1,
    },
    dark_lord_inputs: {},
  },
  {
    player_duke_slug: 'cornelius_the_dreamer',
    dark_lord_duke_slug: 'drakkenstrike',
    victory_condition: 'five_stacks_exhausted',
    winner: 'dark_lord',
    resolution: 'contested',
    player_total: 30,
    dark_lord_total: 40,
    player_inputs: {
      gold: 3,
      magic: 3,
      fight: 3,
      vp: 2,
      monsterPoints: 1,
      domainCount: 0,
      domainPoints: 0,
    },
    dark_lord_inputs: {},
  },
  {
    player_duke_slug: 'cornelius_the_dreamer',
    dark_lord_duke_slug: 'drakkenstrike',
    victory_condition: 'monster_attacks_empty_column',
    winner: 'dark_lord',
    resolution: 'dark_lord_auto',
    player_total: 0,
    dark_lord_total: 0,
    player_inputs: {},
    dark_lord_inputs: {},
  },
  {
    player_duke_slug: 'cornelius_the_dreamer',
    dark_lord_duke_slug: 'drakkenstrike',
    victory_condition: 'five_stacks_exhausted',
    winner: 'dark_lord',
    resolution: 'contested',
    player_total: 32,
    dark_lord_total: 39,
    player_inputs: {
      gold: 4,
      magic: 3,
      fight: 2,
      vp: 3,
      monsterPoints: 1,
      domainCount: 0,
      domainPoints: 1,
    },
    dark_lord_inputs: {},
  },
  {
    player_duke_slug: '',
    dark_lord_duke_slug: '',
    victory_condition: 'monster_attacks_empty_column',
    winner: 'dark_lord',
    resolution: 'dark_lord_auto',
    player_total: 0,
    dark_lord_total: 0,
    player_inputs: {},
    dark_lord_inputs: {},
  },
]

test('buildSoloStatsSummary calculates solo win-loss rates and condition tallies', () => {
  assert.deepEqual(buildSoloStatsSummary(sampleRows), {
    totalGames: 3,
    wins: 2,
    losses: 1,
    winRate: 66.7,
    lossRate: 33.3,
    avgPlayerTotal: 29,
    avgDarkLordTotal: 27,
    avgMargin: 2,
    autoWins: 1,
    autoLosses: 0,
    contestedWins: 1,
    contestedLosses: 1,
    conditionCounts: {
      slay_all_monsters: 1,
      monster_attacks_empty_column: 0,
      five_stacks_exhausted: 2,
    },
  })
})

test('buildSoloDukeUsageRows aggregates player duke usage and sorts by games then wins', () => {
  assert.deepEqual(buildSoloDukeUsageRows(sampleRows), [
    {
      dukeSlug: 'aguilar_the_gilded_knight',
      games: 2,
      wins: 1,
      losses: 1,
      winRate: 50,
      avgPlayerTotal: 18,
    },
    {
      dukeSlug: 'cornelius_the_dreamer',
      games: 1,
      wins: 1,
      losses: 0,
      winRate: 100,
      avgPlayerTotal: 51,
    },
  ])
})

test('buildSoloStatsSummary keeps duke-optional automatic results in the solo record totals', () => {
  assert.deepEqual(
    buildSoloStatsSummary([
      ...sampleRows,
      {
        player_duke_slug: '',
        dark_lord_duke_slug: '',
        victory_condition: 'monster_attacks_empty_column',
        winner: 'dark_lord',
        resolution: 'dark_lord_auto',
        player_total: 0,
        dark_lord_total: 0,
        player_inputs: {},
        dark_lord_inputs: {},
      },
    ]),
    {
      totalGames: 4,
      wins: 2,
      losses: 2,
      winRate: 50,
      lossRate: 50,
      avgPlayerTotal: 22,
      avgDarkLordTotal: 20,
      avgMargin: 2,
      autoWins: 1,
      autoLosses: 1,
      contestedWins: 1,
      contestedLosses: 1,
      conditionCounts: {
        slay_all_monsters: 1,
        monster_attacks_empty_column: 1,
        five_stacks_exhausted: 2,
      },
    }
  )
})

test('buildSoloDukeUsageRows ignores automatic solo results without a selected duke', () => {
  assert.deepEqual(
    buildSoloDukeUsageRows([
      ...sampleRows,
      {
        player_duke_slug: '',
        dark_lord_duke_slug: '',
        victory_condition: 'slay_all_monsters',
        winner: 'player',
        resolution: 'player_auto',
        player_total: 0,
        dark_lord_total: 0,
        player_inputs: {},
        dark_lord_inputs: {},
      },
    ]),
    [
      {
        dukeSlug: 'aguilar_the_gilded_knight',
        games: 2,
        wins: 1,
        losses: 1,
        winRate: 50,
        avgPlayerTotal: 18,
      },
      {
        dukeSlug: 'cornelius_the_dreamer',
        games: 1,
        wins: 1,
        losses: 0,
        winRate: 100,
        avgPlayerTotal: 51,
      },
    ]
  )
})

test('buildSoloCategoryStats reuses the score breakdown model for solo player inputs only', () => {
  const stats = buildSoloCategoryStats(sampleRows, cardsLookup)

  assert.equal(stats.totalGames, 3)
  assert.equal(stats.totalWins, 2)
  assert.equal(stats.allGames.total > 0, true)
  assert.equal(stats.winsOnly.total > 0, true)
  assert.equal(stats.winsOnly.total <= stats.allGames.total, true)
})

test('buildSoloStrategySections surfaces balanced win, risk, and matchup summaries', () => {
  const strategy = buildSoloStrategySections(strategyRows)

  assert.equal(strategy.winPatterns.strongestDuke?.dukeSlug, 'aguilar_the_gilded_knight')
  assert.equal(strategy.winPatterns.bestVictoryCondition?.victoryCondition, 'slay_all_monsters')
  assert.deepEqual(strategy.winPatterns.contestedConversion, {
    wins: 5,
    total: 10,
    winRate: 50,
  })
  assert.deepEqual(strategy.winPatterns.winningCategories, ['Points on Cards', 'Counts'])

  assert.equal(
    strategy.riskPatterns.hardestVictoryCondition?.victoryCondition,
    'monster_attacks_empty_column'
  )
  assert.equal(strategy.riskPatterns.toughestDarkLord?.dukeSlug, 'drakkenstrike')
  assert.deepEqual(strategy.riskPatterns.lossTypeSplit, {
    autoLosses: 2,
    contestedLosses: 5,
  })
  assert.equal(strategy.riskPatterns.lossTrapCategory, 'Points on Cards')

  assert.equal(strategy.matchups.best[0]?.playerDukeSlug, 'aguilar_the_gilded_knight')
  assert.equal(strategy.matchups.best[0]?.darkLordDukeSlug, 'drakkenstrike')
  assert.equal(strategy.matchups.worst[0]?.playerDukeSlug, 'cornelius_the_dreamer')
  assert.equal(strategy.matchups.worst[0]?.darkLordDukeSlug, 'drakkenstrike')
  assert.equal(strategy.matchups.mostPlayed?.playerDukeSlug, 'aguilar_the_gilded_knight')
  assert.equal(strategy.matchups.mostPlayed?.darkLordDukeSlug, 'gurika_the_guardian')
})

test('buildSoloMatchupRows excludes duke-less automatic solo results from matchup rankings', () => {
  const rows = buildSoloMatchupRows(strategyRows)

  assert.equal(
    rows.some((row) => row.playerDukeSlug.length === 0 || row.darkLordDukeSlug.length === 0),
    false
  )
})

test('buildSoloStatsMeta counts automatic solo results saved without duke selections', () => {
  assert.deepEqual(buildSoloStatsMeta(strategyRows), {
    dukelessAutomaticResults: 1,
  })
})

test('buildSoloMatchupRows returns matchup detail breakdowns for inline expansion', () => {
  const rows = buildSoloMatchupRows(strategyRows)
  const drakkenstrikeMatchup = rows.find(
    (row) =>
      row.playerDukeSlug === 'aguilar_the_gilded_knight' &&
      row.darkLordDukeSlug === 'drakkenstrike'
  )

  assert.ok(drakkenstrikeMatchup)
  assert.equal(drakkenstrikeMatchup.avgPlayerTotal, 33)
  assert.equal(drakkenstrikeMatchup.avgDarkLordTotal, 27)
  assert.deepEqual(drakkenstrikeMatchup.resolutionSplit, {
    contested: 2,
    playerAuto: 1,
    darkLordAuto: 0,
  })
  assert.deepEqual(drakkenstrikeMatchup.conditionRows, [
    {
      victoryCondition: 'five_stacks_exhausted',
      totalGames: 2,
      wins: 2,
      losses: 0,
      winRate: 100,
    },
    {
      victoryCondition: 'slay_all_monsters',
      totalGames: 1,
      wins: 1,
      losses: 0,
      winRate: 100,
    },
  ])
})
