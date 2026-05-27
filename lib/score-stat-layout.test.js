import assert from 'node:assert/strict'
import test from 'node:test'

import { groupScoreScreenStats } from './score-stat-layout.ts'

test('groupScoreScreenStats keeps victory points in resources after mana', () => {
  const visibleStats = [
    { key: 'gold', label: 'Gold', section: 'resources', icon: null },
    { key: 'fight', label: 'Fight', section: 'resources', icon: null },
    { key: 'magic', label: 'Mana', section: 'resources', icon: null },
    { key: 'vp', label: 'Victory Points', section: 'points', icon: null },
    {
      key: 'monsterPoints',
      label: 'Monster Points',
      section: 'points',
      icon: null,
    },
  ]

  const grouped = groupScoreScreenStats(visibleStats)

  assert.deepEqual(
    grouped.resources.map((item) => item.key),
    ['gold', 'fight', 'magic', 'vp']
  )
  assert.equal(
    grouped.points.some((item) => item.key === 'vp'),
    false
  )
})

test('groupScoreScreenStats moves monster symbol rows out of points on cards', () => {
  const visibleStats = [
    { key: 'hammer', label: 'Worker Symbol', section: 'equipment', icon: null },
    { key: 'holy', label: 'Holy Symbols', section: 'equipment', icon: null },
    { key: 'bossCount', label: 'Boss', section: 'monsterSymbols', icon: null },
    {
      key: 'lieutenantCount',
      label: 'Lieutenant',
      section: 'monsterSymbols',
      icon: null,
    },
    { key: 'beastCount', label: 'Beast', section: 'monsterSymbols', icon: null },
    { key: 'minionCount', label: 'Minion', section: 'monsterSymbols', icon: null },
    {
      key: 'monsterPoints',
      label: 'Monster Points',
      section: 'points',
      icon: null,
    },
  ]

  const grouped = groupScoreScreenStats(visibleStats)

  assert.deepEqual(
    grouped.monsterSymbols.map((item) => item.key),
    ['bossCount', 'lieutenantCount', 'beastCount', 'minionCount']
  )
  assert.deepEqual(
    grouped.points.map((item) => item.key),
    ['monsterPoints']
  )
})
