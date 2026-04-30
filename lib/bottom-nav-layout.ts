import {
  getBottomNavBarLayout as getSharedBottomNavBarLayout,
  type BottomNavBarLayout,
  type BottomNavItemKey,
} from './bottom-nav-appearance.ts'

const BASE_BOTTOM_OFFSET = 10
const BASE_TOP_OFFSET = 6

// Compact dimensions matching the redesigned top nav: a single row of 32px
// icons + 6/6 vertical padding + 1px borders ≈ 56px. The clearance also
// reserves a comfortable gap so the page title sits below the bar.
const COMPACT_BAR_MIN_HEIGHT = 72
const COMPACT_CONTENT_GAP = 16

export type BottomNavClearanceMode = 'default' | 'score'

function normalizeInset(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, value)
}

export function getBottomNavBottomOffset(safeAreaBottom: number) {
  return BASE_BOTTOM_OFFSET + normalizeInset(safeAreaBottom)
}

export function getBottomNavTopOffset(safeAreaTop: number) {
  return BASE_TOP_OFFSET + normalizeInset(safeAreaTop)
}

function resolveBottomNavActiveKey(
  mode: BottomNavClearanceMode = 'default'
): BottomNavItemKey {
  return mode === 'score' ? 'score' : 'compare'
}

export function getBottomNavBarLayout(
  activeKey: BottomNavItemKey
): BottomNavBarLayout {
  return getSharedBottomNavBarLayout(activeKey)
}

export function getBottomNavContentGap(_mode: BottomNavClearanceMode = 'default') {
  void _mode
  return COMPACT_CONTENT_GAP
}

function compactClearance(safeArea: number) {
  return safeArea + COMPACT_BAR_MIN_HEIGHT + COMPACT_CONTENT_GAP
}

export function getBottomNavClearance(
  safeAreaBottom: number,
  _mode: BottomNavClearanceMode = 'default'
) {
  void _mode
  return compactClearance(getBottomNavBottomOffset(safeAreaBottom))
}

export function getBottomNavTopClearance(
  _safeAreaTop: number,
  _mode: BottomNavClearanceMode = 'default'
) {
  // The floating top nav lives inside the layout's SafeAreaView, which already
  // pads past the status bar. Don't double-count the safe-area inset here —
  // just reserve the bar's own height (72) plus the small base offset (6) and
  // the content gap (16).
  void _safeAreaTop
  void _mode
  return compactClearance(BASE_TOP_OFFSET)
}

void resolveBottomNavActiveKey
