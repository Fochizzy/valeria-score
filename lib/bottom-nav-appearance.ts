export type BottomNavItemKey = 'score' | 'compare' | 'profile'

export type BottomNavAppearanceMode =
  | 'active'
  | 'inactive'
  | 'score-footer-secondary'

export type BottomNavAppearance = {
  mode: BottomNavAppearanceMode
  minHeight: number
  iconSize: number
  labelSize: number
  gap: number
  paddingVertical: number
  iconOpacity: number
  useTabSurface: boolean
}

export type BottomNavBarLayout = {
  minHeight: number
  paddingHorizontal: number
  paddingVertical: number
  gap: number
}

const BOTTOM_NAV_ITEM_KEYS: BottomNavItemKey[] = ['score', 'compare', 'profile']
const MIN_BOTTOM_NAV_BAR_HEIGHT = 70
const BOTTOM_NAV_ICON_SCALE = 4
const BOTTOM_NAV_ITEM_PADDING_VERTICAL = 2
const ACTIVE_ICON_SIZE = 24 * BOTTOM_NAV_ICON_SCALE
const INACTIVE_ICON_SIZE = 22 * BOTTOM_NAV_ICON_SCALE
const ACTIVE_ITEM_MIN_HEIGHT =
  ACTIVE_ICON_SIZE + BOTTOM_NAV_ITEM_PADDING_VERTICAL * 2
const INACTIVE_ITEM_MIN_HEIGHT =
  INACTIVE_ICON_SIZE + BOTTOM_NAV_ITEM_PADDING_VERTICAL * 2

const BOTTOM_NAV_BAR_LAYOUT = Object.freeze({
  paddingHorizontal: 4,
  paddingVertical: 4,
  gap: 2,
})

const DEFAULT_ACTIVE_APPEARANCE: BottomNavAppearance = {
  mode: 'active',
  minHeight: ACTIVE_ITEM_MIN_HEIGHT,
  iconSize: ACTIVE_ICON_SIZE,
  labelSize: 11,
  gap: 0,
  paddingVertical: BOTTOM_NAV_ITEM_PADDING_VERTICAL,
  iconOpacity: 1,
  useTabSurface: false,
}

const DEFAULT_INACTIVE_APPEARANCE: BottomNavAppearance = {
  mode: 'inactive',
  minHeight: INACTIVE_ITEM_MIN_HEIGHT,
  iconSize: INACTIVE_ICON_SIZE,
  labelSize: 11,
  gap: 0,
  paddingVertical: BOTTOM_NAV_ITEM_PADDING_VERTICAL,
  iconOpacity: 0.86,
  useTabSurface: false,
}

const SCORE_FOOTER_SECONDARY_APPEARANCE: BottomNavAppearance = {
  mode: 'score-footer-secondary',
  minHeight: INACTIVE_ITEM_MIN_HEIGHT,
  iconSize: INACTIVE_ICON_SIZE,
  labelSize: 11,
  gap: 0,
  paddingVertical: BOTTOM_NAV_ITEM_PADDING_VERTICAL,
  iconOpacity: 0.92,
  useTabSurface: false,
}

export function getBottomNavAppearance(
  itemKey: BottomNavItemKey,
  activeKey: BottomNavItemKey
): BottomNavAppearance {
  if (activeKey === 'score' && itemKey !== 'score') {
    return SCORE_FOOTER_SECONDARY_APPEARANCE
  }

  if (itemKey === activeKey) {
    return DEFAULT_ACTIVE_APPEARANCE
  }

  return DEFAULT_INACTIVE_APPEARANCE
}

export function getBottomNavBarHeight(activeKey: BottomNavItemKey) {
  return getBottomNavBarLayout(activeKey).minHeight
}

export function getBottomNavBarLayout(
  activeKey: BottomNavItemKey
): BottomNavBarLayout {
  const tallestTabHeight = Math.max(
    ...BOTTOM_NAV_ITEM_KEYS.map((itemKey) => getBottomNavAppearance(itemKey, activeKey).minHeight)
  )

  return {
    ...BOTTOM_NAV_BAR_LAYOUT,
    minHeight: Math.max(
      MIN_BOTTOM_NAV_BAR_HEIGHT,
      tallestTabHeight + BOTTOM_NAV_BAR_LAYOUT.paddingVertical * 2
    ),
  }
}
