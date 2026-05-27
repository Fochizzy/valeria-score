import assert from 'node:assert/strict'
import test from 'node:test'

import { buildAnalyticsRouteToggleSegments } from './analytics-route-toggle.ts'

const EXPECTED_SEGMENTS = [
  { key: 'players', label: 'Players', href: '/player-stats' },
  { key: 'dukes', label: 'Dukes', href: '/duke-stats' },
  { key: 'trends', label: 'Trends', href: '/global-trends' },
  { key: 'solo', label: 'Solo', href: '/solo-stats' },
]

test('buildAnalyticsRouteToggleSegments returns the analytics screens plus solo', () => {
  assert.deepEqual(buildAnalyticsRouteToggleSegments('players'), EXPECTED_SEGMENTS)
  assert.deepEqual(buildAnalyticsRouteToggleSegments('dukes'), EXPECTED_SEGMENTS)
  assert.deepEqual(buildAnalyticsRouteToggleSegments('trends'), EXPECTED_SEGMENTS)
  assert.deepEqual(buildAnalyticsRouteToggleSegments('solo'), EXPECTED_SEGMENTS)
})
