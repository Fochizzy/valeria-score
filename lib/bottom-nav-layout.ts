import {
  getBottomNavBarLayout as getSharedBottomNavBarLayout,
  type BottomNavBarLayout,
  type BottomNavItemKey,
} from './bottom-nav-appearance.ts'

export const BOTTOM_NAV_BASE_BOTTOM_OFFSET = 10
export const BOTTOM_NAV_BASE_TOP_OFFSET = 6
export const BOTTOM_NAV_TAB_MIN_HEIGHT = 78
export const BOTTOM_NAV_BAR_BORDER_WIDTH = 1
export const BOTTOM_NAV_BAR_PADDING_TOP = 12
export const BOTTOM_NAV_BAR_PADDING_BOTTOM = 7
export const BOTTOM_NAV_BRANDING_PADDING = 6
export const BOTTOM_NAV_BRANDING_LINE_HEIGHT = 12
export const BOTTOM_NAV_CONTENT_GAP = 16

// Keep the shared clearance math aligned with the actual floating bottom-nav
// chrome so scrollable screens clear the full menu bar instead of an outdated
// compact-shell estimate. Every term here is a style the bar actually applies,
// including the top border — Yoga counts borders in the border-box height, so
// leaving it out made the constant one pixel short of what renders and stopped
// styles.bar's minHeight from ever binding.
export const BOTTOM_NAV_BAR_HEIGHT =
  BOTTOM_NAV_BAR_BORDER_WIDTH +
  BOTTOM_NAV_BAR_PADDING_TOP +
  BOTTOM_NAV_TAB_MIN_HEIGHT +
  BOTTOM_NAV_BRANDING_PADDING * 2 +
  BOTTOM_NAV_BRANDING_LINE_HEIGHT +
  BOTTOM_NAV_BAR_PADDING_BOTTOM

export type BottomNavClearanceMode = 'default' | 'score'

function normalizeInset(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, value)
}

export function getBottomNavBottomOffset(safeAreaBottom: number) {
  // The app shell already wraps screens in SafeAreaView, so the floating
  // bottom nav sits inside the safe area. Keep a fixed offset above that
  // padded edge instead of double-counting the device inset here.
  void safeAreaBottom
  return BOTTOM_NAV_BASE_BOTTOM_OFFSET
}

export function getBottomNavTopOffset(safeAreaTop: number) {
  return BOTTOM_NAV_BASE_TOP_OFFSET + normalizeInset(safeAreaTop)
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
  return BOTTOM_NAV_CONTENT_GAP
}

function compactClearance(safeArea: number) {
  return safeArea + BOTTOM_NAV_BAR_HEIGHT + BOTTOM_NAV_CONTENT_GAP
}

export function getBottomNavClearance(
  safeAreaBottom: number,
  _mode: BottomNavClearanceMode = 'default'
) {
  // Same reasoning as getBottomNavBottomOffset(): the layout already applies
  // bottom safe-area padding, so content only needs room for the bar itself,
  // its fixed offset, and the visual gap above it.
  void safeAreaBottom
  void _mode
  return compactClearance(BOTTOM_NAV_BASE_BOTTOM_OFFSET)
}

export function getBottomNavTopClearance(
  _safeAreaTop: number,
  _mode: BottomNavClearanceMode = 'default'
) {
  // The floating top nav lives inside the layout's SafeAreaView, which already
  // pads past the status bar. Don't double-count the safe-area inset here —
  // just reserve the bar's actual shell height plus the small base offset and
  // the content gap.
  void _safeAreaTop
  void _mode
  return compactClearance(BOTTOM_NAV_BASE_TOP_OFFSET)
}

void resolveBottomNavActiveKey
