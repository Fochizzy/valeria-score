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

test('default menu lists items in Home Page → Manage Data → Duke Statistics → Player Statistics → Global Trends → Logout order with no Cancel entry', () => {
  assert.deepEqual(buildManageAccountMenuActions(), [
    { id: 'newSession', text: 'Home Page' },
    { id: 'manageData', text: 'Manage Data' },
    { id: 'dukeStatistics', text: 'Duke Statistics' },
    { id: 'playerStatistics', text: 'Player Statistics' },
    { id: 'globalTrends', text: 'Global Trends' },
    { id: 'logout', text: 'Logout', style: 'destructive' },
  ])
})

test('includeDeleteSession appends a destructive Delete Session before Logout', () => {
  assert.deepEqual(buildManageAccountMenuActions({ includeDeleteSession: true }), [
    { id: 'newSession', text: 'Home Page' },
    { id: 'manageData', text: 'Manage Data' },
    { id: 'dukeStatistics', text: 'Duke Statistics' },
    { id: 'playerStatistics', text: 'Player Statistics' },
    { id: 'globalTrends', text: 'Global Trends' },
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
  })
  assert.deepEqual(
    actions.map((a) => a.id),
    [
      'newSession',
      'manageData',
      'dukeStatistics',
      'playerStatistics',
      'globalTrends',
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
