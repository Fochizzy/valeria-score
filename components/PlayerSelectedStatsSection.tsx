import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native'

import { playerStatsSurface } from '../constants/analyticsPageSurface'
import { theme } from '../constants/theme'
import { cardImages } from '../data/cardImages'
import { formatDukeName } from '../lib/duke-names'
import type { PlayerDukeRow, PlayerLeaderboardRow } from '../lib/player-stats-data'
import {
  formatPlayerDukeSummary,
  type SelectedPlayerInsights,
} from '../lib/player-stats-insights'

type SummaryItem = {
  label: string
  value: string
}

type PlayerSelectedStatsSectionProps = {
  player: PlayerLeaderboardRow | null
  summaryItems: SummaryItem[]
  insights: SelectedPlayerInsights
  loading: boolean
  dukeRows: PlayerDukeRow[]
}

export default function PlayerSelectedStatsSection({
  player,
  summaryItems,
  insights,
  loading,
  dukeRows,
}: PlayerSelectedStatsSectionProps) {
  if (!player) return null

  const detailCards = [
    {
      key: 'favorite',
      kicker: 'Favorite Duke',
      title: insights.favoriteDuke
        ? formatDukeName(insights.favoriteDuke.dukeSlug)
        : 'No duke data',
      body: insights.favoriteDuke
        ? `${insights.favoriteDuke.gamesPlayed} games - WR ${insights.favoriteDuke.winRate.toFixed(1)}%`
        : 'Play a tracked duke game to unlock favorite-duke callouts.',
    },
    {
      key: 'best',
      kicker: 'Best With',
      title: insights.bestDuke ? formatDukeName(insights.bestDuke.dukeSlug) : 'No duke data',
      body: insights.bestDuke
        ? `WR ${insights.bestDuke.winRate.toFixed(1)}% - Norm ${insights.bestDuke.avgFinishPercentile.toFixed(1)}`
        : 'Three tracked games with a duke are required.',
    },
  ]

  return (
    <View style={styles.sectionCard}>
      <View style={styles.selectedHeader}>
        <View>
          <Text style={styles.sectionTitle}>{player.player_name}</Text>
          <Text style={styles.selectedSub}>
            {player.public_player_id ?? 'No Player ID'} -{' '}
            {player.player_type === 'guest' ? 'Guest' : 'User'}
          </Text>
        </View>
      </View>

      <View style={styles.summaryStrip}>
        {summaryItems.map((item) => (
          <View key={item.label} style={styles.summaryStatCard}>
            <Text style={styles.summaryStatValue}>{item.value}</Text>
            <Text style={styles.summaryStatLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.insightCardsRow}>
        {detailCards.map((card) => (
          <View key={card.key} style={styles.insightCard}>
            <Text style={styles.insightCardKicker}>{card.kicker}</Text>
            <Text style={styles.insightCardTitle}>{card.title}</Text>
            <Text style={styles.insightCardText}>{card.body}</Text>
          </View>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : dukeRows.length === 0 ? (
        <Text style={styles.emptyText}>No duke stats for current filter.</Text>
      ) : (
        dukeRows.map((row) => (
          <View key={row.duke_slug} style={styles.dukeCard}>
            <View style={styles.dukeCardLeft}>
              <View style={styles.dukeThumbWrap}>
                {cardImages[row.duke_slug] ? (
                  <Image
                    source={cardImages[row.duke_slug]}
                    style={styles.dukeThumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.dukeThumbFallback}>
                    <Text style={styles.dukeThumbFallbackText}>No Image</Text>
                  </View>
                )}
              </View>

              <View style={styles.dukeCardMeta}>
                <Text style={styles.dukeStatName}>{formatDukeName(row.duke_slug)}</Text>
                <Text style={styles.dukeStatSub}>{formatPlayerDukeSummary(row)}</Text>
              </View>
            </View>

            <View style={styles.dukeCardRight}>
              <Text style={styles.dukeStatValue}>{row.avg_score.toFixed(1)}</Text>
              <Text style={styles.dukeStatLabel}>Avg Score</Text>
              <Text style={styles.dukeStatMeta}>Norm {row.avg_finish_percentile.toFixed(1)}</Text>
            </View>
          </View>
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

  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },

  selectedSub: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },

  summaryStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 12,
  },

  summaryStatCard: {
    flexGrow: 1,
    minWidth: 110,
    backgroundColor: playerStatsSurface.panelRaised,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  summaryStatValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },

  summaryStatLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },

  insightCardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },

  insightCard: {
    width: '48.5%',
    backgroundColor: playerStatsSurface.panelAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },

  insightCardKicker: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
  },

  insightCardTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },

  insightCardText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
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

  dukeCard: {
    backgroundColor: playerStatsSurface.panelAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  dukeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },

  dukeThumbWrap: {
    width: 54,
    height: 54,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: playerStatsSurface.inset,
    marginRight: 10,
  },

  dukeThumb: {
    width: '100%',
    height: '100%',
  },

  dukeThumbFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },

  dukeThumbFallbackText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },

  dukeCardMeta: {
    flex: 1,
    minWidth: 0,
  },

  dukeStatName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 3,
  },

  dukeStatSub: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 17,
  },

  dukeCardRight: {
    alignItems: 'flex-end',
  },

  dukeStatValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },

  dukeStatLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },

  dukeStatMeta: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
})
