import { Image, StyleSheet, Text, View } from 'react-native'

import { playerStatsSurface } from '../constants/analyticsPageSurface'
import { theme } from '../constants/theme'
import { cardImages } from '../data/cardImages'
import { formatDukeName } from '../lib/duke-names'
import type { MetaSnapshot } from '../lib/global-trends'

type Props = {
  snapshot: MetaSnapshot
}

export default function MetaSnapshotCard({ snapshot }: Props) {
  const { topPlayed, topScoring } = snapshot
  // When the same duke leads both metrics, collapse the duo into one
  // celebratory card rather than printing the same name twice.
  const sameDuke =
    !!topPlayed && !!topScoring && topPlayed.duke_slug === topScoring.duke_slug

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Meta Snapshot</Text>
        <Text style={styles.title}>Last {snapshot.windowDays} Days</Text>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryValue}>{snapshot.totalGames}</Text>
          <Text style={styles.summaryLabel}>Games</Text>
        </View>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryValue}>{snapshot.uniqueDukes}</Text>
          <Text style={styles.summaryLabel}>Unique Dukes</Text>
        </View>
      </View>

      {sameDuke && topPlayed && topScoring ? (
        <CombinedLeaderCard
          slug={topPlayed.duke_slug}
          games={topPlayed.games}
          avgScore={topScoring.avg_score}
        />
      ) : (
        <View style={styles.calloutRow}>
          <View style={styles.calloutCard}>
            <Text style={styles.calloutKicker}>Most Played</Text>
            <Text style={styles.calloutTitle}>
              {topPlayed ? formatDukeName(topPlayed.duke_slug) : '—'}
            </Text>
            <Text style={styles.calloutSub}>
              {topPlayed
                ? `${topPlayed.games} games`
                : 'No games yet in this window.'}
            </Text>
          </View>

          <View style={styles.calloutCard}>
            <Text style={styles.calloutKicker}>Top Scoring</Text>
            <Text style={styles.calloutTitle}>
              {topScoring ? formatDukeName(topScoring.duke_slug) : '—'}
            </Text>
            <Text style={styles.calloutSub}>
              {topScoring
                ? `${topScoring.avg_score.toFixed(1)} avg · ${topScoring.games} games`
                : 'Need at least 2 locked games.'}
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}

function CombinedLeaderCard({
  slug,
  games,
  avgScore,
}: {
  slug: string
  games: number
  avgScore: number
}) {
  const portrait = cardImages[slug]
  return (
    <View style={styles.combinedCard}>
      <View style={styles.combinedThumbWrap}>
        {portrait ? (
          <Image source={portrait} style={styles.combinedThumb} resizeMode="cover" />
        ) : (
          <View style={[styles.combinedThumb, styles.combinedThumbFallback]}>
            <Text style={styles.combinedThumbFallbackText}>
              {formatDukeName(slug).charAt(0)}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.combinedBody}>
        <Text style={styles.combinedKicker}>Most Played · Top Scoring</Text>
        <Text style={styles.combinedTitle} numberOfLines={1} ellipsizeMode="tail">
          {formatDukeName(slug)}
        </Text>
        <Text style={styles.combinedSub}>
          {games} {games === 1 ? 'game' : 'games'} · {avgScore.toFixed(1)} avg
        </Text>
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

  header: { marginBottom: 12 },

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

  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },

  summaryBox: {
    flex: 1,
    backgroundColor: playerStatsSurface.panelRaised,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    alignItems: 'center',
  },

  summaryValue: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
  },

  summaryLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },

  calloutRow: {
    flexDirection: 'row',
    gap: 8,
  },

  calloutCard: {
    flex: 1,
    backgroundColor: playerStatsSurface.panelAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
    padding: 12,
  },

  calloutKicker: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },

  calloutTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },

  calloutSub: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },

  combinedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: playerStatsSurface.panelAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
    padding: 12,
    ...theme.shadow.glow,
  },

  // Square thumb (rounded corners) for visual consistency with the selected-
  // duke card on the score screen and the tier list rows.
  combinedThumbWrap: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  combinedThumb: {
    width: '100%',
    height: '100%',
  },

  combinedThumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.32)',
  },

  combinedThumbFallbackText: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '900',
  },

  combinedBody: {
    flex: 1,
    minWidth: 0,
  },

  combinedKicker: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },

  combinedTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },

  combinedSub: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
})
