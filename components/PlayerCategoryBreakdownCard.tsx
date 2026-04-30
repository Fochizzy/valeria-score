import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native'

import { playerStatsSurface } from '../constants/analyticsPageSurface'
import { theme } from '../constants/theme'
import { scoreIcons } from '../data/scoreIcons'
import {
  CATEGORY_KEYS,
  CATEGORY_LABEL,
  computeCategoryShare,
  type CategoryBreakdown,
  type CategoryKey,
  type PlayerCategoryStats,
} from '../lib/score-category-breakdown'

type Props = {
  stats: PlayerCategoryStats | null
  loading?: boolean
  emptyHint?: string
  kicker?: string
  title?: string
}

// Pick one representative icon per category, drawing from the score-page icons.
const CATEGORY_ICONS: Record<CategoryKey, any> = {
  resources: scoreIcons.gold,
  symbols: scoreIcons.hammer,
  monsterSymbols: scoreIcons.beastCount,
  counts: scoreIcons.citizenCount,
  points: scoreIcons.monsterPoints,
  vp: scoreIcons.vp,
}

const CATEGORY_BAR_COLOR: Record<CategoryKey, string> = {
  resources: '#8B5CF6',
  symbols: '#E7C768',
  monsterSymbols: '#F59E0B',
  counts: '#59B7FF',
  points: '#C084FC',
  vp: '#FFB4E1',
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0%'
  return `${Math.round(value)}%`
}

function formatPoints(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return value.toLocaleString()
}

function BreakdownBlock({
  title,
  subtitle,
  breakdown,
}: {
  title: string
  subtitle: string
  breakdown: CategoryBreakdown
}) {
  return (
    <View style={styles.block}>
      <View style={styles.blockHeader}>
        <Text style={styles.blockTitle}>{title}</Text>
        <Text style={styles.blockSubtitle}>{subtitle}</Text>
      </View>

      {breakdown.total <= 0 ? (
        <Text style={styles.blockEmpty}>No scoring data yet.</Text>
      ) : (
        <View style={styles.rows}>
          {CATEGORY_KEYS.map((key) => {
            const share = computeCategoryShare(breakdown, key)
            const points = breakdown[key]
            return (
              <View key={key} style={styles.row}>
                <View style={styles.rowHeader}>
                  <View style={styles.rowLabelGroup}>
                    <View style={styles.iconWrap}>
                      <Image
                        source={CATEGORY_ICONS[key]}
                        style={styles.icon}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={styles.rowLabel}>{CATEGORY_LABEL[key]}</Text>
                  </View>

                  <Text style={styles.rowValue}>
                    {formatPercent(share)}
                    <Text style={styles.rowPoints}>  {formatPoints(points)} pts</Text>
                  </Text>
                </View>

                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${Math.min(100, Math.max(0, share))}%`,
                        backgroundColor: CATEGORY_BAR_COLOR[key],
                      },
                    ]}
                  />
                </View>
              </View>
            )
          })}
        </View>
      )}
    </View>
  )
}

export default function PlayerCategoryBreakdownCard({
  stats,
  loading,
  emptyHint,
  kicker = 'Point Distribution',
  title = 'Where Their Points Come From',
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>{kicker}</Text>
          <Text style={styles.title}>{title}</Text>
        </View>
        {loading ? <ActivityIndicator color={theme.colors.accent} /> : null}
      </View>

      {!stats || stats.totalGames === 0 ? (
        <Text style={styles.empty}>
          {emptyHint ??
            'No locked games for this player yet — distribution will appear once games are tracked.'}
        </Text>
      ) : stats.totalGames === stats.totalWins && stats.totalWins > 0 ? (
        <BreakdownBlock
          title="All Games"
          subtitle={`${stats.totalGames} game${stats.totalGames === 1 ? '' : 's'} · all wins`}
          breakdown={stats.allGames}
        />
      ) : (
        <>
          <BreakdownBlock
            title="All Games"
            subtitle={`${stats.totalGames} game${stats.totalGames === 1 ? '' : 's'}`}
            breakdown={stats.allGames}
          />

          <View style={styles.divider} />

          <BreakdownBlock
            title="Wins Only"
            subtitle={
              stats.totalWins === 0
                ? 'No wins yet'
                : `${stats.totalWins} winning game${stats.totalWins === 1 ? '' : 's'}`
            }
            breakdown={stats.winsOnly}
          />
        </>
      )}
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

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },

  headerText: {
    flex: 1,
    minWidth: 0,
  },

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

  empty: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },

  block: {
    marginTop: 4,
  },

  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },

  blockTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },

  blockSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  blockEmpty: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    paddingVertical: 6,
  },

  rows: {
    gap: 10,
  },

  row: {
    gap: 6,
  },

  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },

  rowLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },

  iconWrap: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  icon: {
    width: 22,
    height: 22,
  },

  rowLabel: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 1,
  },

  rowValue: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  rowPoints: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },

  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: playerStatsSurface.inset,
    overflow: 'hidden',
  },

  barFill: {
    height: '100%',
    borderRadius: 4,
  },

  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 14,
  },
})
