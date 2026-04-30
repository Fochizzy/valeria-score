import assert from 'node:assert/strict'
import test from 'node:test'

import { getDukeAnalyticsStatMarker } from './duke-analytics-marker.ts'

test('getDukeAnalyticsStatMarker returns icon-backed markers for duke stat rows', () => {
  assert.deepEqual(getDukeAnalyticsStatMarker('gold'), {
    iconKey: 'gold',
    accessibilityLabel: 'Gold',
  })

  assert.deepEqual(getDukeAnalyticsStatMarker('domainPoints'), {
    iconKey: 'domainPoints',
    accessibilityLabel: 'Domain Points',
  })
})

test('getDukeAnalyticsStatMarker falls back cleanly for unknown stats', () => {
  assert.deepEqual(getDukeAnalyticsStatMarker('unknown'), {
    iconKey: null,
    accessibilityLabel: 'unknown',
  })
})
