import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { theme } from '../constants/theme'
import { getInsightStripRowLayout } from '../lib/insight-strip-layout'
import type { InsightItem } from '../lib/p3-insights'

type InsightStripProps = {
  items: InsightItem[]
  title?: string
  compact?: boolean
}

export default function InsightStrip({
  items,
  title = 'Highlights',
  compact = false,
}: InsightStripProps) {
  if (!items.length) return null

  const rowLayout = getInsightStripRowLayout(compact ? 'compact' : 'default')

  return (
    <View style={[styles.wrap, { marginTop: rowLayout.wrapMarginTop }]}>
      <Text style={styles.title}>{title}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.row,
          {
            gap: rowLayout.gap,
            paddingLeft: rowLayout.paddingLeft,
            paddingRight: rowLayout.paddingRight,
          },
        ]}
      >
        {items.map((item) => (
          <View key={item.label} style={[styles.card, compact && styles.cardCompact]}>
            <Text style={[styles.label, compact && styles.labelCompact]}>{item.label}</Text>
            <Text style={[styles.value, compact && styles.valueCompact]} numberOfLines={2}>
              {item.value}
            </Text>
            <Text style={[styles.detail, compact && styles.detailCompact]} numberOfLines={2}>
              {item.detail}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },

  title: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 12,
  },

  row: {},

  card: {
    width: 170,
    minHeight: 116,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    justifyContent: 'space-between',
    ...theme.shadow.card,
  },

  cardCompact: {
    width: 146,
    minHeight: 94,
    borderRadius: 18,
    padding: 10,
  },

  label: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  labelCompact: {
    marginBottom: 6,
  },

  value: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 22,
  },

  valueCompact: {
    fontSize: 16,
    lineHeight: 20,
  },

  detail: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 10,
  },

  detailCompact: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },
})
