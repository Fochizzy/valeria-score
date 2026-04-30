import { StyleSheet, Text, View } from 'react-native'

import { playerStatsSurface } from '../constants/analyticsPageSurface'
import { theme } from '../constants/theme'
import { formatDukeName } from '../lib/duke-names'
import {
  classifyVolatility,
  type DukeVolatilityEntry,
} from '../lib/duke-volatility'

type Props = {
  entries: DukeVolatilityEntry[]
}

const LABEL_COLORS = {
  Steady: '#70D7A5',
  Moderate: '#E7C768',
  Swingy: '#FF7E8A',
}

export default function DukeVolatilityCard({ entries }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Score Volatility</Text>
        <Text style={styles.title}>Steady vs Swingy Dukes</Text>
      </View>

      {entries.length === 0 ? (
        <Text style={styles.empty}>
          Need at least a couple of locked games per duke to call out high-variance picks.
        </Text>
      ) : null}

      <View style={styles.rows}>
        {entries.map((entry) => {
          const label = classifyVolatility(entry.stddev, entry.mean)
          return (
            <View key={entry.duke_slug} style={styles.row}>
              <View style={styles.metaCol}>
                <Text style={styles.dukeName} numberOfLines={1} ellipsizeMode="tail">
                  {formatDukeName(entry.duke_slug)}
                </Text>
                <Text style={styles.dukeSub}>
                  Mean {entry.mean.toFixed(1)} · σ {entry.stddev.toFixed(1)} · {entry.games}{' '}
                  {entry.games === 1 ? 'game' : 'games'}
                </Text>
                <Text style={styles.range}>
                  Range {entry.min} – {entry.max}
                </Text>
              </View>

              <View
                style={[
                  styles.labelPill,
                  { borderColor: LABEL_COLORS[label] },
                ]}
              >
                <Text style={[styles.labelText, { color: LABEL_COLORS[label] }]}>
                  {label}
                </Text>
              </View>
            </View>
          )
        })}
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

  header: { marginBottom: 10 },

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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    gap: 10,
  },

  metaCol: { flex: 1, minWidth: 0 },

  dukeName: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  dukeSub: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  range: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },

  labelPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  labelText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
})
