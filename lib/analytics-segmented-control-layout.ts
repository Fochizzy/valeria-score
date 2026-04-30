export type AnalyticsSegmentedControlLayoutMode = 'default' | 'fit' | 'fitCompact'

export function getAnalyticsSegmentedControlLayout(
  mode: AnalyticsSegmentedControlLayoutMode = 'default'
) {
  if (mode === 'fitCompact') {
    return {
      scrollable: false,
      stretchToFill: true,
      rowGap: 6,
      rowPaddingRight: 0,
      segmentMinWidth: 0,
      segmentHorizontalPadding: 8,
      segmentVerticalPadding: 10,
      segmentGap: 4,
      labelFontSize: 12,
      badgeMinWidth: 20,
      badgeHorizontalPadding: 5,
      badgeVerticalPadding: 2,
      badgeFontSize: 10,
    }
  }

  if (mode === 'fit') {
    return {
      scrollable: false,
      stretchToFill: true,
      rowGap: 8,
      rowPaddingRight: 0,
      segmentMinWidth: 0,
      segmentHorizontalPadding: 12,
      segmentVerticalPadding: 11,
      segmentGap: 6,
      labelFontSize: 13,
      badgeMinWidth: 22,
      badgeHorizontalPadding: 6,
      badgeVerticalPadding: 2,
      badgeFontSize: 11,
    }
  }

  return {
    scrollable: true,
    stretchToFill: false,
    rowGap: 8,
    rowPaddingRight: 6,
    segmentMinWidth: 112,
    segmentHorizontalPadding: 14,
    segmentVerticalPadding: 11,
    segmentGap: 8,
    labelFontSize: 13,
    badgeMinWidth: 24,
    badgeHorizontalPadding: 7,
    badgeVerticalPadding: 2,
    badgeFontSize: 11,
  }
}
