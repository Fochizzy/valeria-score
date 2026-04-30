import { StyleSheet, Text, View } from 'react-native'

import { playerStatsSurface } from '../constants/analyticsPageSurface'
import { theme } from '../constants/theme'
import { formatDukeName } from '../lib/duke-names'
import type { DukeInputMixEntry } from '../lib/duke-input-mix'
import {
  CATEGORY_KEYS,
  CATEGORY_LABEL,
  type CategoryKey,
} from '../lib/score-category-breakdown'

type Props = {
  entries: DukeInputMixEntry[]
  loading?: boolean
}

const CATEGORY_COLOR: Record<CategoryKey, string> = {
  resources: '#8B5CF6',
  symbols: '#E7C768',
  monsterSymbols: '#F59E0B',
  counts: '#59B7FF',
  points: '#C084FC',
  vp: '#FFB4E1',
}

export default function DukeInputMixHeatmapCard({ entries, loading }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>Input Mix Heatmap</Text>
          <Text style={styles.title}>How Each Duke Earns Its Points</Text>
        </View>
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

      {entries.length === 0 ? (
        <Text style={styles.empty}>
          {loading
            ? 'Crunching the numbers...'
            : 'No locked games yet — the heatmap fills in once people start finishing tracked games.'}
        </Text>
      ) : null}

      <View style={styles.rows}>
        {entries.map((entry) => (
          <View key={entry.duke_slug} style={styles.row}>
            <View style={styles.metaCol}>
              <Text style={styles.dukeName} numberOfLines={1} ellipsizeMode="tail">
                {formatDukeName(entry.duke_slug)}
              </Text>
              <Text style={styles.gamesLabel}>
                {entry.games} {entry.games === 1 ? 'game' : 'games'}
              </Text>
            </View>

            <View style={styles.barTrack}>
              {CATEGORY_KEYS.map((key) => {
                const share = entry.shares[key]
                if (share <= 0) return null
                return (
                  <View
                    key={key}
                    style={{
                      width: `${Math.min(100, share)}%`,
                      backgroundColor: CATEGORY_COLOR[key],
                    }}
                  />
                )
              })}
            </View>
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

  rows: { gap: 8 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: playerStatsSurface.panelAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
  },

  metaCol: {
    width: 132,
    minWidth: 90,
    flexShrink: 0,
  },

  dukeName: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  gamesLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },

  barTrack: {
    flex: 1,
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    backgroundColor: playerStatsSurface.inset,
    overflow: 'hidden',
  },
})
