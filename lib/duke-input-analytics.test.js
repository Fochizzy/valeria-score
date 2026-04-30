import assert from 'node:assert/strict'
import test from 'node:test'

import * as dukeInputAnalytics from './duke-input-analytics.ts'

const {
  buildDukeInputProfileState,
  resolveDukeInputProfileRows,
} = dukeInputAnalytics

const sampleRows = [
  {
    duke_slug: 'cornelius_the_dreamer',
    stat_key: 'domainPoints',
    profile_scope: 'all_games',
    games_sample: '8',
    avg_input: '3.2',
    avg_points_generated: '11.5',
    points_share: '26.4',
    global_points_share: '18.1',
    share_delta_vs_global: '8.3',
  },
  {
    duke_slug: 'cornelius_the_dreamer',
    stat_key: 'monsterPoints',
    profile_scope: 'all_games',
    games_sample: '8',
    avg_input: '5',
    avg_points_generated: '9.8',
    points_share: '22.5',
    global_points_share: '24.2',
    share_delta_vs_global: '-1.7',
  },
  {
    duke_slug: 'cornelius_the_dreamer',
    stat_key: 'domainPoints',
    profile_scope: 'winning_games',
    games_sample: '4',
    avg_input: '4.1',
    avg_points_generated: '15.2',
    points_share: '31.7',
    global_points_share: '18.1',
    share_delta_vs_global: '13.6',
  },
  {
    duke_slug: 'cornelius_the_dreamer',
    stat_key: 'monsterPoints',
    profile_scope: 'winning_games',
    games_sample: '4',
    avg_input: '4.3',
    avg_points_generated: '8.4',
    points_share: '17.5',
    global_points_share: '24.2',
    share_delta_vs_global: '-6.7',
  },
  {
    duke_slug: 'cornelius_the_dreamer',
    stat_key: 'gold',
    profile_scope: 'all_games',
    games_sample: '8',
    avg_input: '7.5',
    avg_points_generated: '2.0',
    points_share: '5.0',
    global_points_share: '8.4',
    share_delta_vs_global: '-3.4',
  },
  {
    duke_slug: 'cornelius_the_dreamer',
    stat_key: 'magic',
    profile_scope: 'all_games',
    games_sample: '8',
    avg_input: '6.1',
    avg_points_generated: '2.0',
    points_share: '4.0',
    global_points_share: '7.3',
    share_delta_vs_global: '-3.3',
  },
  {
    duke_slug: 'cornelius_the_dreamer',
    stat_key: 'fight',
    profile_scope: 'all_games',
    games_sample: '8',
    avg_input: '4.4',
    avg_points_generated: '1.3',
    points_share: '3.2',
    global_points_share: '6.1',
    share_delta_vs_global: '-2.9',
  },
  {
    duke_slug: 'cornelius_the_dreamer',
    stat_key: 'key',
    profile_scope: 'all_games',
    games_sample: '8',
    avg_input: '1.5',
    avg_points_generated: '3.1',
    points_share: '7.1',
    global_points_share: '2.2',
    share_delta_vs_global: '4.9',
  },
]

test('resolveDukeInputProfileRows normalizes labels and numeric values', () => {
  const rows = resolveDukeInputProfileRows(sampleRows)
  const row = rows.find(
    (entry) =>
      entry.profile_scope === 'winning_games' && entry.stat_key === 'domainPoints'
  )

  assert.ok(row)
  assert.equal(row.label, 'Domain Points')
  assert.equal(row.games_sample, 4)
  assert.equal(row.avg_points_generated, 15.2)
  assert.equal(row.share_delta_vs_global, 13.6)
})

test('buildDukeInputProfileState sorts usual and winning rows independently and emits win insights', () => {
  const state = buildDukeInputProfileState(resolveDukeInputProfileRows(sampleRows), 3)

  assert.equal(state.canShowWinningProfile, true)
  assert.equal(state.usualRows[0].label, 'Domain Points')
  assert.equal(state.winningRows[0].label, 'Domain Points')
  assert.match(state.insightLines[0], /Domain Points/i)
})

test('buildDukeInputProfileState hides winner comparisons below the minimum winning sample', () => {
  const rows = resolveDukeInputProfileRows(
    sampleRows.map((row) =>
      row.profile_scope === 'winning_games'
        ? {
            ...row,
            games_sample: '2',
          }
        : row
    )
  )

  const state = buildDukeInputProfileState(rows, 3)

  assert.equal(state.canShowWinningProfile, false)
  assert.deepEqual(state.winningRows, [])
  assert.deepEqual(state.insightLines, [])
})

test('buildScoreFamilyRows groups stat rows into scoring families', () => {
  assert.equal(typeof dukeInputAnalytics.buildScoreFamilyRows, 'function')

  const familyRows = dukeInputAnalytics.buildScoreFamilyRows(
    resolveDukeInputProfileRows(sampleRows).filter((row) => row.profile_scope === 'all_games')
  )

  const domains = familyRows.find((row) => row.family_key === 'domains')
  const monsters = familyRows.find((row) => row.family_key === 'monsters')
  const resources = familyRows.find((row) => row.family_key === 'resource_conversion')

  assert.ok(domains)
  assert.ok(monsters)
  assert.ok(resources)
  assert.equal(domains.label, 'Domains')
  assert.equal(domains.points_share, 26.4)
  assert.equal(monsters.points_share, 22.5)
  assert.equal(resources.label, 'Resource Conversion')
  assert.equal(resources.points_share, 12.2)
})

test('buildDukeInputProfileState exposes family and focused section rows for the duke detail panel', () => {
  const state = buildDukeInputProfileState(resolveDukeInputProfileRows(sampleRows), 3)

  assert.equal(Array.isArray(state.familyRows), true)
  assert.equal(Array.isArray(state.resourceRows), true)
  assert.equal(Array.isArray(state.monsterRows), true)
  assert.equal(Array.isArray(state.domainRows), true)
  assert.equal(state.familyRows[0].family_key, 'domains')
  assert.deepEqual(
    state.resourceRows.map((row) => row.stat_key),
    ['gold', 'magic', 'fight', 'key']
  )
  assert.equal(
    Number(state.resourceRows.reduce((sum, row) => sum + row.points_share, 0).toFixed(1)),
    19.3
  )
  assert.deepEqual(
    state.domainRows.map((row) => row.stat_key),
    ['domainPoints']
  )
})

test('resolveGlobalInputProfileRows and resolveGlobalGameMarginRows normalize overall analytics data', () => {
  assert.equal(typeof dukeInputAnalytics.resolveGlobalInputProfileRows, 'function')
  assert.equal(typeof dukeInputAnalytics.resolveGlobalGameMarginRows, 'function')

  const [globalRow] = dukeInputAnalytics.resolveGlobalInputProfileRows([
    {
      stat_key: 'fight',
      profile_scope: 'all_games',
      games_sample: '12',
      avg_input: '8.5',
      avg_points_generated: '2.0',
      points_share: '6.4',
    },
  ])

  const [marginRow] = dukeInputAnalytics.resolveGlobalGameMarginRows([
    {
      margin_bucket: 'lte_3',
      tables_sample: '14',
      tables_with_margin: '5',
      share_percentage: '35.7',
    },
  ])

  assert.equal(globalRow.label, 'Fight')
  assert.equal(globalRow.points_share, 6.4)
  assert.equal(marginRow.margin_bucket, 'lte_3')
  assert.equal(marginRow.label, '≤3 pts or closer')
  assert.equal(marginRow.share_percentage, 35.7)
})
