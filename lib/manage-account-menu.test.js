import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildBoundManageAccountMenuActions,
  buildManageAccountMenuActions,
  manageAccountAlertCopy,
} from './manage-account-menu.ts'

test('manageAccountAlertCopy uses the Go to title', () => {
  assert.equal(manageAccountAlertCopy.title, 'Go to')
})

test('default menu lists items in Game Hub, Manage Data, Duke Statistics, Player Statistics, Global Trends, Solo Statistics, then Logout with no Cancel entry', () => {
  assert.deepEqual(buildManageAccountMenuActions(), [
    { id: 'newSession', text: 'Game Hub' },
    { id: 'manageData', text: 'Manage Data' },
    { id: 'dukeStatistics', text: 'Duke Statistics' },
    { id: 'playerStatistics', text: 'Player Statistics' },
    { id: 'globalTrends', text: 'Global Trends' },
    { id: 'soloStatistics', text: 'Solo Statistics' },
    { id: 'logout', text: 'Logout', style: 'destructive' },
  ])
})

test('includeDeleteSession appends a destructive Delete Session before Logout', () => {
  assert.deepEqual(buildManageAccountMenuActions({ includeDeleteSession: true }), [
    { id: 'newSession', text: 'Game Hub' },
    { id: 'manageData', text: 'Manage Data' },
    { id: 'dukeStatistics', text: 'Duke Statistics' },
    { id: 'playerStatistics', text: 'Player Statistics' },
    { id: 'globalTrends', text: 'Global Trends' },
    { id: 'soloStatistics', text: 'Solo Statistics' },
    { id: 'deleteSession', text: 'Delete Session', style: 'destructive' },
    { id: 'logout', text: 'Logout', style: 'destructive' },
  ])
})

test('buildBoundManageAccountMenuActions includes every navigation action plus logout when all handlers are wired', () => {
  const noop = () => {}
  const actions = buildBoundManageAccountMenuActions({
    onManageData: noop,
    onNewSession: noop,
    onLogout: noop,
    onDukeStatistics: noop,
    onPlayerStatistics: noop,
    onGlobalTrends: noop,
    onSoloStatistics: noop,
  })
  assert.deepEqual(
    actions.map((a) => a.id),
    [
      'newSession',
      'manageData',
      'dukeStatistics',
      'playerStatistics',
      'globalTrends',
      'soloStatistics',
      'logout',
    ]
  )
})

test('actions whose handler is missing are omitted entirely (not rendered disabled)', () => {
  const noop = () => {}
  const actions = buildBoundManageAccountMenuActions({
    onManageData: noop,
    onNewSession: noop,
    onLogout: noop,
  })
  const ids = actions.map((a) => a.id)
  assert.equal(ids.includes('dukeStatistics'), false)
  assert.equal(ids.includes('playerStatistics'), false)
  assert.equal(ids.includes('globalTrends'), false)
  assert.equal(ids.includes('soloStatistics'), false)
  assert.deepEqual(ids, ['newSession', 'manageData', 'logout'])
})

test('deleteSession is omitted when its handler is undefined even if includeDeleteSession is true', () => {
  const noop = () => {}
  const actions = buildBoundManageAccountMenuActions(
    { onManageData: noop, onNewSession: noop, onLogout: noop },
    { includeDeleteSession: true }
  )
  assert.equal(actions.some((a) => a.id === 'deleteSession'), false)
})
