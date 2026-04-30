import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { playerStatsSurface } from '../constants/analyticsPageSurface'
import { theme } from '../constants/theme'
import type { PlayerLeaderboardRow } from '../lib/player-stats-data'

type PlayerLeaderboardSectionProps = {
  leaderboard: PlayerLeaderboardRow[]
  loading: boolean
  stackedLayout: boolean
  selectedPlayerKey: string | null
  onSelect: (playerKey: string) => void
  onLongPress?: (playerKey: string) => void
}

export default function PlayerLeaderboardSection({
  leaderboard,
  loading,
  stackedLayout,
  selectedPlayerKey,
  onSelect,
  onLongPress,
}: PlayerLeaderboardSectionProps) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Leaderboard</Text>
      <Text style={styles.sectionSubtitle}>
        Press and hold a player to jump to their stats.
      </Text>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : leaderboard.length === 0 ? (
        <Text style={styles.emptyText}>No players found for this filter.</Text>
      ) : (
        leaderboard.map((player, index) => (
          <Pressable
            key={player.player_key}
            style={({ pressed }) => [
              styles.playerCard,
              stackedLayout && styles.playerCardCompact,
              selectedPlayerKey === player.player_key && styles.playerCardSelected,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => onSelect(player.player_key)}
            onLongPress={
              onLongPress ? () => onLongPress(player.player_key) : undefined
            }
            delayLongPress={250}
          >
            <View style={[styles.leftMeta, stackedLayout && styles.leftMetaCompact]}>
              <View style={styles.rankPill}>
                <Text style={styles.rankPillText}>{index + 1}</Text>
              </View>

              <View style={styles.playerMeta}>
                <View style={[styles.playerTopRow, stackedLayout && styles.playerTopRowCompact]}>
                  <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                    {player.player_name}
                  </Text>
                  <View
                    style={[
                      styles.typePill,
                      player.player_type === 'guest'
                        ? styles.typePillGuest
                        : styles.typePillUser,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typePillText,
                        player.player_type === 'guest'
                          ? styles.typePillGuestText
                          : styles.typePillUserText,
                      ]}
                    >
                      {player.player_type === 'guest' ? 'Guest' : 'User'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.playerSub} numberOfLines={1} ellipsizeMode="tail">
                  {player.public_player_id ?? 'No Player ID'}
                </Text>
              </View>
            </View>

            <View style={[styles.rightStats, stackedLayout && styles.rightStatsCompact]}>
              <View style={[styles.miniStat, stackedLayout && styles.miniStatCompact]}>
                <Text style={styles.miniStatValue}>{player.win_rate.toFixed(1)}%</Text>
                <Text style={styles.miniStatLabel}>WR</Text>
              </View>

              <View style={[styles.miniStat, stackedLayout && styles.miniStatCompact]}>
                <Text style={styles.miniStatValue}>{player.games_played}</Text>
                <Text style={styles.miniStatLabel}>G</Text>
              </View>

              <View style={[styles.miniStat, stackedLayout && styles.miniStatCompact]}>
                <Text style={styles.miniStatValue}>{player.avg_score.toFixed(1)}</Text>
                <Text style={styles.miniStatLabel}>AVG</Text>
              </View>
            </View>
          </Pressable>
        ))
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: playerStatsSurface.panel,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },

  sectionSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 12,
  },

  loadingWrap: {
    paddingVertical: 16,
    alignItems: 'center',
  },

  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },

  playerCard: {
    backgroundColor: playerStatsSurface.panelAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  playerCardCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },

  playerCardSelected: {
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
    ...theme.shadow.glow,
  },

  leftMeta: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },

  leftMetaCompact: {
    flex: 0,
    width: '100%',
    paddingRight: 0,
    marginBottom: 12,
    alignItems: 'flex-start',
  },

  rankPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  rankPillText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  playerMeta: {
    flex: 1,
    minWidth: 0,
  },

  playerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },

  playerTopRowCompact: {
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },

  playerName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    flexShrink: 1,
  },

  playerSub: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },

  playerSupportText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },

  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
  },

  typePillGuest: {
    backgroundColor: 'rgba(255, 126, 138, 0.12)',
    borderColor: theme.colors.error,
  },

  typePillUser: {
    backgroundColor: 'rgba(112, 215, 165, 0.12)',
    borderColor: theme.colors.success,
  },

  typePillText: {
    fontSize: 10,
    fontWeight: '900',
  },

  typePillGuestText: {
    color: theme.colors.error,
  },

  typePillUserText: {
    color: theme.colors.success,
  },

  rightStats: {
    flexDirection: 'row',
    gap: 8,
  },

  rightStatsCompact: {
    width: '100%',
    justifyContent: 'space-between',
  },

  miniStat: {
    minWidth: 54,
    backgroundColor: playerStatsSurface.inset,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },

  miniStatCompact: {
    flex: 1,
    minWidth: 0,
  },

  miniStatValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },

  miniStatLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },

  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
})
