import assert from 'node:assert/strict'
import test from 'node:test'

import {
  BOTTOM_NAV_BAR_BORDER_WIDTH,
  BOTTOM_NAV_BAR_HEIGHT,
  BOTTOM_NAV_BAR_PADDING_BOTTOM,
  BOTTOM_NAV_BAR_PADDING_TOP,
  BOTTOM_NAV_BRANDING_LINE_HEIGHT,
  BOTTOM_NAV_BRANDING_PADDING,
  BOTTOM_NAV_CONTENT_GAP,
  BOTTOM_NAV_TAB_MIN_HEIGHT,
  getBottomNavBottomOffset,
  getBottomNavClearance,
  getBottomNavContentGap,
  getBottomNavTopClearance,
  getBottomNavTopOffset,
} from './bottom-nav-layout.ts'

// Each term is asserted on its own rather than only through the sum. Checking
// the total against a recomputation of the same constants would still pass if
// a term the bar actually renders were dropped from the formula, which is how
// the 1px top border went missing.
test('the bar height accounts for every box term the nav renders', () => {
  assert.equal(BOTTOM_NAV_BAR_BORDER_WIDTH, 1)
  assert.equal(BOTTOM_NAV_BAR_PADDING_TOP, 12)
  assert.equal(BOTTOM_NAV_TAB_MIN_HEIGHT, 78)
  assert.equal(BOTTOM_NAV_BRANDING_PADDING, 6)
  assert.equal(BOTTOM_NAV_BRANDING_LINE_HEIGHT, 12)
  assert.equal(BOTTOM_NAV_BAR_PADDING_BOTTOM, 7)
  assert.equal(BOTTOM_NAV_CONTENT_GAP, 16)

  // 1 border + 12 top padding + 78 tabs + (6 + 12 + 6) branding + 7 bottom.
  assert.equal(BOTTOM_NAV_BAR_HEIGHT, 122)
})

test('bottom nav uses the compact base offsets when there is no safe-area inset', () => {
  assert.equal(getBottomNavBottomOffset(0), 10)
  assert.equal(getBottomNavTopOffset(0), 6)
})

test('content gap is independent of mode now that the bar height is fixed', () => {
  assert.equal(getBottomNavContentGap('default'), 16)
  assert.equal(getBottomNavContentGap('score'), 16)
})

test('bottom clearance ignores the safe-area inset because the layout already pads it', () => {
  // 10 (base) + 122 (real menu bar footprint) + 16 = 148
  assert.equal(getBottomNavClearance(0), 148)
  assert.equal(getBottomNavClearance(34), 148)
})

test('top clearance ignores the safe-area inset (the layout already pads it)', () => {
  // 6 (base) + 122 + 16 = 144 regardless of inset.
  assert.equal(getBottomNavTopClearance(0), 144)
  assert.equal(getBottomNavTopClearance(50), 144)
  assert.equal(getBottomNavTopClearance(Number.NaN), 144)
})

test('clearance clamps invalid insets to the compact defaults', () => {
  assert.equal(getBottomNavBottomOffset(-12), 10)
  assert.equal(getBottomNavTopOffset(Number.NaN), 6)
  assert.equal(getBottomNavClearance(Number.NaN), 148)
})
