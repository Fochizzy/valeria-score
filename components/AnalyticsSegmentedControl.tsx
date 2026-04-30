import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { theme } from '../constants/theme'
import {
  getAnalyticsSegmentedControlLayout,
  type AnalyticsSegmentedControlLayoutMode,
} from '../lib/analytics-segmented-control-layout'

export type AnalyticsSegment = {
  key: string
  label: string
  badge?: number | string
}

type AnalyticsSegmentedControlProps = {
  segments: AnalyticsSegment[]
  activeKey: string
  onChange: (key: string) => void
  layoutMode?: AnalyticsSegmentedControlLayoutMode
}

export default function AnalyticsSegmentedControl({
  segments,
  activeKey,
  onChange,
  layoutMode = 'default',
}: AnalyticsSegmentedControlProps) {
  const layout = getAnalyticsSegmentedControlLayout(layoutMode)
  const rowStyle = [
    styles.row,
    layout.stretchToFill && styles.rowStretch,
    {
      gap: layout.rowGap,
      paddingRight: layout.rowPaddingRight,
    },
  ]

  const segmentNodes = segments.map((segment) => {
    const isActive = segment.key === activeKey

    return (
      <Pressable
        key={segment.key}
        style={({ pressed }) => [
          styles.segment,
          layout.stretchToFill && styles.segmentStretch,
          {
            minWidth: layout.segmentMinWidth,
            paddingHorizontal: layout.segmentHorizontalPadding,
            paddingVertical: layout.segmentVerticalPadding,
            gap: layout.segmentGap,
          },
          isActive && styles.segmentActive,
          pressed && styles.segmentPressed,
        ]}
        onPress={() => onChange(segment.key)}
      >
        <Text
          style={[
            styles.segmentText,
            { fontSize: layout.labelFontSize },
            isActive && styles.segmentTextActive,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
        >
          {segment.label}
        </Text>

        {typeof segment.badge !== 'undefined' ? (
          <View
            style={[
              styles.badge,
              {
                minWidth: layout.badgeMinWidth,
                paddingHorizontal: layout.badgeHorizontalPadding,
                paddingVertical: layout.badgeVerticalPadding,
              },
              isActive && styles.badgeActive,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { fontSize: layout.badgeFontSize },
                isActive && styles.badgeTextActive,
              ]}
            >
              {segment.badge}
            </Text>
          </View>
        ) : null}
      </Pressable>
    )
  })

  return (
    <View style={styles.wrap}>
      {layout.scrollable ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={rowStyle}
        >
          {segmentNodes}
        </ScrollView>
      ) : (
        <View style={rowStyle}>{segmentNodes}</View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },

  row: {
    gap: 8,
    paddingRight: 6,
  },

  rowStretch: {
    width: '100%',
  },

  segment: {
    minWidth: 112,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    // Lifted inactive surface — slightly brighter than surfaceAlt so each tab
    // reads as available rather than disabled.
    backgroundColor: 'rgba(48, 33, 80, 0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  segmentStretch: {
    flex: 1,
  },

  segmentActive: {
    // Softer purple than full theme.colors.primary so the inactive tabs don't
    // disappear visually next to it. Border + a light glow still mark it.
    backgroundColor: 'rgba(139, 92, 246, 0.55)',
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
  },

  segmentPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },

  segmentText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 1,
    minWidth: 0,
    opacity: 0.78,
  },

  segmentTextActive: {
    color: theme.colors.text,
    opacity: 1,
  },

  badge: {
    minWidth: 24,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },

  badgeActive: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  badgeText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
  },

  badgeTextActive: {
    color: theme.colors.text,
  },
})
