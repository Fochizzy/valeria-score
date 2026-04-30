import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import { playerStatsSurface } from '../constants/analyticsPageSurface'
import { theme } from '../constants/theme'
import type { HeadToHeadRecord } from '../lib/head-to-head'

type Props = {
  records: HeadToHeadRecord[]
  loading?: boolean
}

function formatMargin(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '+0'
  const sign = value > 0 ? '+' : '-'
  return `${sign}${Math.abs(value).toFixed(1)}`
}

export default function HeadToHeadCard({ records, loading }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Head-to-Head</Text>
          <Text style={styles.title}>Your Record vs Opponents</Text>
        </View>
        {loading ? <ActivityIndicator color={theme.colors.accent} /> : null}
      </View>

      {records.length === 0 && !loading ? (
        <Text style={styles.empty}>
          No shared locked games yet — once you both finish a tracked game your record will land here.
        </Text>
      ) : null}

      <View style={styles.rows}>
        {records.map((record) => {
          const recordLabel =
            record.ties > 0
              ? `${record.wins}-${record.losses}-${record.ties}`
              : `${record.wins}-${record.losses}`
          return (
            <View key={record.playerKey} style={styles.row}>
              <View style={styles.body}>
                <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
                  {record.playerName}
                </Text>
                <Text style={styles.sub}>
                  {recordLabel}
                  {' · '}
                  {record.meetings} {record.meetings === 1 ? 'game' : 'games'}
                </Text>
              </View>

              <View style={[styles.marginPill, marginPillStyle(record.avgMargin)]}>
                <Text style={styles.marginValue}>{formatMargin(record.avgMargin)}</Text>
                <Text style={styles.marginLabel}>avg pts</Text>
              </View>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function marginPillStyle(margin: number) {
  if (margin > 0) return styles.marginPositive
  if (margin < 0) return styles.marginNegative
  return null
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

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  headerText: { flex: 1, minWidth: 0 },

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

  rows: { gap: 8 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: playerStatsSurface.panelAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    gap: 10,
  },

  body: { flex: 1, minWidth: 0, gap: 2 },

  name: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },

  sub: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },

  marginPill: {
    minWidth: 64,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: playerStatsSurface.inset,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },

  marginPositive: {
    borderColor: '#70D7A5',
    backgroundColor: 'rgba(112, 215, 165, 0.15)',
  },

  marginNegative: {
    borderColor: '#FF7E8A',
    backgroundColor: 'rgba(255, 126, 138, 0.15)',
  },

  marginValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },

  marginLabel: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 2,
  },
})
