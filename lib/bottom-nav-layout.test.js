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

test('bottom clearance still includes the safe-area inset (home indicator clearance)', () => {
  // 10 (base) + 0 (inset) + 72 + 16 = 98
  assert.equal(getBottomNavClearance(0), 98)
  // safe area 34 → 10 + 34 + 72 + 16 = 132
  assert.equal(getBottomNavClearance(34), 132)
})

test('top clearance ignores the safe-area inset (the layout already pads it)', () => {
  // 6 (base) + 72 + 16 = 94 regardless of inset.
  assert.equal(getBottomNavTopClearance(0), 94)
  assert.equal(getBottomNavTopClearance(50), 94)
  assert.equal(getBottomNavTopClearance(Number.NaN), 94)
})

test('clearance clamps invalid bottom insets to zero', () => {
  assert.equal(getBottomNavBottomOffset(-12), 10)
  assert.equal(getBottomNavTopOffset(Number.NaN), 6)
  assert.equal(getBottomNavClearance(Number.NaN), 98)
})
