import { StyleSheet, Text, View } from 'react-native'

import { playerStatsSurface } from '../constants/analyticsPageSurface'
import { theme } from '../constants/theme'
import { formatDukeName } from '../lib/duke-names'
import type { DukeVsGlobalRow } from '../lib/duke-vs-global'

type Props = {
  rows: DukeVsGlobalRow[]
}

function formatDelta(value: number, suffix = ''): string {
  if (!Number.isFinite(value) || value === 0) return `+0${suffix}`
  const sign = value > 0 ? '+' : '-'
  return `${sign}${Math.abs(value).toFixed(1)}${suffix}`
}

function deltaColor(delta: number) {
  if (delta > 0) return styles.deltaPositive
  if (delta < 0) return styles.deltaNegative
  return null
}

export default function DukeVsGlobalCard({ rows }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.kicker}>You vs Global</Text>
          <Text style={styles.title}>Per-Duke Comparison</Text>
        </View>
      </View>

      {rows.length === 0 ? (
        <Text style={styles.empty}>
          Play a few locked games with a duke to compare your numbers against everyone else&apos;s.
        </Text>
      ) : null}

      <View style={styles.headerCols}>
        <Text style={styles.colHeader}>Duke</Text>
        <Text style={[styles.colHeader, styles.colNumeric]}>WR Δ</Text>
        <Text style={[styles.colHeader, styles.colNumeric]}>AVG Δ</Text>
      </View>

      <View style={styles.rows}>
        {rows.map((row) => (
          <View key={row.duke_slug} style={styles.row}>
            <View style={styles.dukeMeta}>
              <Text style={styles.dukeName} numberOfLines={1} ellipsizeMode="tail">
                {formatDukeName(row.duke_slug)}
              </Text>
              <Text style={styles.dukeSub}>
                You: {row.player_games} g · {row.player_win_rate.toFixed(1)}% WR · {row.player_avg_score.toFixed(1)} avg
                {row.global_games > 0
                  ? `\nGlobal: ${row.global_games} g · ${row.global_win_rate.toFixed(1)}% WR · ${row.global_avg_score.toFixed(1)} avg`
                  : ''}
              </Text>
            </View>

            <Text
              style={[
                styles.deltaValue,
                styles.colNumeric,
                deltaColor(row.win_rate_delta),
              ]}
            >
              {formatDelta(row.win_rate_delta, '%')}
            </Text>
            <Text
              style={[
                styles.deltaValue,
                styles.colNumeric,
                deltaColor(row.avg_score_delta),
              ]}
            >
              {formatDelta(row.avg_score_delta)}
            </Text>
          </View>
        ))}
      </View>
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

  headerRow: { marginBottom: 10 },

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
    marginTop: 4,
  },

  headerCols: {
    flexDirection: 'row',
    paddingHorizontal: 6,
    marginTop: 6,
    marginBottom: 6,
  },

  colHeader: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flex: 1,
  },

  colNumeric: {
    textAlign: 'right',
    minWidth: 60,
    flex: 0,
  },

  rows: { gap: 6 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: playerStatsSurface.panelAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
  },

  dukeMeta: { flex: 1, minWidth: 0 },

  dukeName: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  dukeSub: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
    marginTop: 2,
  },

  deltaValue: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  deltaPositive: { color: '#70D7A5' },
  deltaNegative: { color: '#FF7E8A' },
})
