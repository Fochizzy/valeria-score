import assert from 'node:assert/strict'
import test from 'node:test'

import { getAnalyticsSegmentedControlLayout } from './analytics-segmented-control-layout.ts'

test('default segmented controls stay scrollable with roomy chip sizing', () => {
  assert.deepEqual(getAnalyticsSegmentedControlLayout(), {
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
  })
})

test('fit layout spreads segments across one row without the scroll view sizing', () => {
  assert.deepEqual(getAnalyticsSegmentedControlLayout('fit'), {
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
  })
})

test('fitCompact layout shrinks label and badge spacing for narrow phones', () => {
  assert.deepEqual(getAnalyticsSegmentedControlLayout('fitCompact'), {
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
  })
})
