import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getBottomNavBottomOffset,
  getBottomNavClearance,
  getBottomNavContentGap,
  getBottomNavTopClearance,
  getBottomNavTopOffset,
} from './bottom-nav-layout.ts'

test('bottom nav uses the compact base offsets when there is no safe-area inset', () => {
  assert.equal(getBottomNavBottomOffset(0), 10)
  assert.equal(getBottomNavTopOffset(0), 6)
})

test('content gap is independent of mode now that the bar height is fixed', () => {
  assert.equal(getBottomNavContentGap('default'), 16)
  assert.equal(getBottomNavContentGap('score'), 16)
})

test('bottom clearance ignores the safe-area inset because the layout already pads it', () => {
  // 10 (base) + 72 + 16 = 98
  assert.equal(getBottomNavClearance(0), 98)
  assert.equal(getBottomNavClearance(34), 98)
})

test('top clearance ignores the safe-area inset (the layout already pads it)', () => {
  // 6 (base) + 72 + 16 = 94 regardless of inset.
  assert.equal(getBottomNavTopClearance(0), 94)
  assert.equal(getBottomNavTopClearance(50), 94)
  assert.equal(getBottomNavTopClearance(Number.NaN), 94)
})

test('clearance clamps invalid insets to the compact defaults', () => {
  assert.equal(getBottomNavBottomOffset(-12), 10)
  assert.equal(getBottomNavTopOffset(Number.NaN), 6)
  assert.equal(getBottomNavClearance(Number.NaN), 98)
})
