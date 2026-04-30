import assert from 'node:assert/strict'
import test from 'node:test'

import { buildAnalyticsRouteToggleSegments } from './analytics-route-toggle.ts'

const EXPECTED_SEGMENTS = [
  { key: 'players', label: 'Players', href: '/player-stats' },
  { key: 'dukes', label: 'Dukes', href: '/duke-stats' },
  { key: 'trends', label: 'Trends', href: '/global-trends' },
]

test('buildAnalyticsRouteToggleSegments returns the three analytics screens', () => {
  assert.deepEqual(buildAnalyticsRouteToggleSegments('players'), EXPECTED_SEGMENTS)
  assert.deepEqual(buildAnalyticsRouteToggleSegments('dukes'), EXPECTED_SEGMENTS)
  assert.deepEqual(buildAnalyticsRouteToggleSegments('trends'), EXPECTED_SEGMENTS)
})
