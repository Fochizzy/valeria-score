import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native'

import { theme } from '../constants/theme'
import { cardImages } from '../data/cardImages'
import type { ResolvedDukeStatsRow } from '../lib/duke-stats-data'

function pct(value: number | null | undefined) {
  return `${Number(value ?? 0).toFixed(1)}%`
}

type DukeLeaderboardSectionProps = {
  rows: ResolvedDukeStatsRow[]
  totalRows: number
  loading: boolean
  selectedDukeSlug: string | null
  inputAnalyticsAvailable: boolean
  onSelect: (dukeSlug: string) => void
  onOpenSessions: () => void
}

export default function DukeLeaderboardSection({
  rows,
  totalRows,
  loading,
  selectedDukeSlug,
  inputAnalyticsAvailable,
  onSelect,
  onOpenSessions,
}: DukeLeaderboardSectionProps) {
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.subtitle}>Press and hold a duke to jump to its detail view.</Text>
      </View>

      {loading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={styles.stateTitle}>Loading duke analytics...</Text>
          <Text style={styles.stateText}>Pulling tracked performance and trend data.</Text>
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>
            {totalRows === 0 ? 'No duke analytics yet' : 'No matching dukes'}
          </Text>
          <Text style={styles.stateText}>
            {totalRows === 0
              ? 'Finish a tracked game to generate duke performance analytics and leaderboard stats.'
              : 'Try a different search to widen the leaderboard results.'}
          </Text>

          {totalRows === 0 ? (
            <Text style={styles.linkText} onPress={onOpenSessions}>
              Open Sessions
            </Text>
          ) : null}
        </View>
      ) : (
        rows.map((row, index) => {
          const isSelected = row.duke_slug === selectedDukeSlug

          return (
            <Pressable
              key={row.duke_slug}
              style={({ pressed }) => [
                styles.card,
                isSelected && styles.cardSelected,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => onSelect(row.duke_slug)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.rankLabel}>#{index + 1}</Text>

                <View style={styles.headerBadgeRow}>
                  {isSelected ? (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText}>Selected</Text>
                    </View>
                  ) : null}

                  <View style={styles.winBadge}>
                    <Text style={styles.winBadgeText}>{pct(row.win_percentage)} WR</Text>
                  </View>
                </View>
              </View>

              <View style={styles.topRow}>
                <View style={styles.imageWrap}>
                  {cardImages[row.duke_slug] ? (
                    <Image
                      source={cardImages[row.duke_slug]}
                      style={styles.dukeImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.imageFallback}>
                      <Text style={styles.imageFallbackText}>No Image</Text>
                    </View>
                  )}
                </View>

                <View style={styles.headerMeta}>
                  <Text style={styles.dukeName} numberOfLines={2}>
                    {row.duke_name}
                  </Text>
                  <Text style={styles.subMeta}>{row.games_played === 1 ? '1 game' : `${row.games_played} games`} · Best {row.best_score}</Text>
                  <Text style={styles.subMeta}>Most wins: {row.most_wins_player_name}</Text>
                </View>
              </View>

              <View style={styles.statGrid}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{Number(row.avg_score).toFixed(1)}</Text>
                  <Text style={styles.statLabel}>AVG</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statValue}>
                    {Number(row.avg_score_per_player).toFixed(1)}
                  </Text>
                  <Text style={styles.statLabel}>AVG / PLAYER</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{pct(row.second_percentage)}</Text>
                  <Text style={styles.statLabel}>2nd</Text>
                </View>
              </View>

              {inputAnalyticsAvailable ? (
                <View style={styles.teaserRow}>
                  <View style={styles.teaserCard}>
                    <Text style={styles.teaserLabel}>Scores Through</Text>
                    <Text style={styles.teaserText}>{row.scores_through_summary}</Text>
                  </View>

                  <View style={styles.teaserCard}>
                    <Text style={styles.teaserLabel}>Winning Edge</Text>
                    <Text style={styles.teaserText}>{row.winning_edge_summary}</Text>
                  </View>
                </View>
              ) : null}

              <View style={styles.metaRows}>
                <Text style={styles.metaLine}>
                  Top average: {row.best_avg_player_name} · {Number(row.avg_with_duke ?? 0).toFixed(1)}
                </Text>
              </View>
            </Pressable>
          )
        })
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  header: {
    marginBottom: 12,
  },

  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },

  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },

  stateCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    alignItems: 'flex-start',
  },

  stateTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 10,
    marginBottom: 4,
  },

  stateText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },

  linkText: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 10,
  },

  card: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 10,
  },

  cardSelected: {
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
    ...theme.shadow.glow,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  rankLabel: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },

  headerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  selectedBadge: {
    backgroundColor: 'rgba(255, 215, 102, 0.16)',
    borderColor: theme.colors.accent,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  selectedBadgeText: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: '900',
  },

  winBadge: {
    backgroundColor: 'rgba(112, 215, 165, 0.12)',
    borderColor: theme.colors.success,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  winBadgeText: {
    color: theme.colors.success,
    fontSize: 12,
    fontWeight: '900',
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  imageWrap: {
    width: 72,
    height: 72,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundAlt,
    marginRight: 12,
  },

  dukeImage: {
    width: '100%',
    height: '100%',
  },

  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },

  imageFallbackText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },

  headerMeta: {
    flex: 1,
    minWidth: 0,
  },

  dukeName: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },

  subMeta: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },

  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },

  statBox: {
    flex: 1,
    minWidth: 0,
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },

  statValue: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },

  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },

  teaserRow: {
    gap: 8,
    marginBottom: 10,
  },

  teaserCard: {
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
  },

  teaserLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  teaserText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
  },

  metaRows: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 10,
  },

  metaLine: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },

  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
})
