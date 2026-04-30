import assert from 'node:assert/strict'
import test from 'node:test'

import { getInsightStripRowLayout } from './insight-strip-layout.ts'

test('default insight strips keep the first card fully inset from the left edge', () => {
  assert.deepEqual(getInsightStripRowLayout(false), {
    gap: 10,
    paddingLeft: 12,
    paddingRight: 12,
    wrapMarginTop: 8,
  })
})

test('compact insight strips keep a smaller but still visible left inset', () => {
  assert.deepEqual(getInsightStripRowLayout(true), {
    gap: 8,
    paddingLeft: 10,
    paddingRight: 8,
    wrapMarginTop: 8,
  })
})
