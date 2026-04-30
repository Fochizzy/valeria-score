import { StyleSheet, Text, View } from 'react-native'

import { playerStatsSurface } from '../constants/analyticsPageSurface'
import { theme } from '../constants/theme'
import {
  CATEGORY_KEYS,
  CATEGORY_LABEL,
  type CategoryKey,
} from '../lib/score-category-breakdown'
import type { ShapeMonthEntry } from '../lib/global-trends'

type Props = {
  months: ShapeMonthEntry[]
}

const CATEGORY_COLOR: Record<CategoryKey, string> = {
  resources: '#8B5CF6',
  symbols: '#E7C768',
  monsterSymbols: '#F59E0B',
  counts: '#59B7FF',
  points: '#C084FC',
  vp: '#FFB4E1',
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// Returns the human label of the month immediately following the given
// month-iso (e.g. '2026-04-01' → 'May 2026'). Used for the single-month
// placeholder copy.
function labelForNextMonth(monthIso: string): string | null {
  const match = /^(\d{4})-(\d{2})-/.exec(monthIso)
  if (!match) return null
  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  if (!Number.isFinite(year) || monthIndex < 0 || monthIndex > 11) return null
  const nextMonthIndex = (monthIndex + 1) % 12
  const nextYear = monthIndex === 11 ? year + 1 : year
  return `${MONTH_NAMES[nextMonthIndex]} ${nextYear}`
}

export default function AverageGameShapeCard({ months }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Game Shape Over Time</Text>
        <Text style={styles.title}>Where Points Came From, By Month</Text>
      </View>

      <View style={styles.legendRow}>
        {CATEGORY_KEYS.map((key) => (
          <View key={key} style={styles.legendItem}>
            <View
              style={[styles.legendSwatch, { backgroundColor: CATEGORY_COLOR[key] }]}
            />
            <Text style={styles.legendLabel}>{CATEGORY_LABEL[key]}</Text>
          </View>
        ))}
      </View>

      <ChartBody months={months} />
    </View>
  )
}

function ChartBody({ months }: { months: ShapeMonthEntry[] }) {
  if (months.length === 0) {
    return (
      <Text style={styles.empty}>
        A few locked games per month is enough to start showing the shape of the meta here.
      </Text>
    )
  }

  // Single-month placeholder: a single bar isn't a meaningful comparison, so
  // we show a friendly note pointing at the next month instead.
  if (months.length === 1) {
    const only = months[0]
    const nextLabel = labelForNextMonth(only.monthIso)
    return (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderTitle}>
          First full month — comparison unlocks in {nextLabel ?? 'the next month'}
        </Text>
        <Text style={styles.placeholderBody}>
          {only.monthLabel} has {only.games} {only.games === 1 ? 'tracked game' : 'tracked games'}.
          Once another month has data, this card will show side-by-side stacked bars so you can see
          the meta shift.
        </Text>
      </View>
    )
  }

  // Multi-month: vertical stacked bars side-by-side, one column per month.
  return (
    <View style={styles.columnsRow}>
      {months.map((month) => (
        <View key={month.monthIso} style={styles.column}>
          <View style={styles.barWrap}>
            <View style={styles.bar}>
              {CATEGORY_KEYS.map((key) => {
                const share = month.shares[key]
                if (share <= 0) return null
                return (
                  <View
                    key={key}
                    style={{
                      height: `${Math.min(100, share)}%`,
                      backgroundColor: CATEGORY_COLOR[key],
                    }}
                  />
                )
              })}
            </View>
          </View>
          <Text style={styles.columnLabel} numberOfLines={1}>
            {month.monthLabel}
          </Text>
          <Text style={styles.columnGames}>
            {month.games} {month.games === 1 ? 'game' : 'games'}
          </Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: playerStatsSurface.panel,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  header: { marginBottom: 8 },

  kicker: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },

  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },

  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },

  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },

  legendLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },

  empty: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },

  placeholder: {
    backgroundColor: playerStatsSurface.panelAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },

  placeholderTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },

  placeholderBody: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },

  columnsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingTop: 4,
  },

  column: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },

  barWrap: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 6,
  },

  bar: {
    width: 28,
    height: 140,
    borderRadius: 8,
    backgroundColor: playerStatsSurface.inset,
    overflow: 'hidden',
    flexDirection: 'column-reverse',
  },

  columnLabel: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '900',
  },

  columnGames: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
})
