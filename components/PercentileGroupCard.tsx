import { StyleSheet, Text, View } from 'react-native'

import { playerStatsSurface } from '../constants/analyticsPageSurface'
import { theme } from '../constants/theme'
import PercentileBadge from './PercentileBadge'
import type { PercentileResult } from '../lib/percentile-vs-global'

type Props = {
  winRate: PercentileResult | null
  avgScore: PercentileResult | null
  podiumRate: PercentileResult | null
  // When the leaderboard pool is small the percentile reads as misleading;
  // pass the population size so we can annotate the card.
  totalPlayers?: number
}

export default function PercentileGroupCard({ winRate, avgScore, podiumRate, totalPlayers }: Props) {
  const sample = Math.max(
    winRate?.total ?? 0,
    avgScore?.total ?? 0,
    podiumRate?.total ?? 0,
    totalPlayers ?? 0
  )
  const isSmallSample = sample > 0 && sample < 5

  return (
    <View style={styles.card}>
      <Text style={styles.title}>How You Stack Up</Text>
      {isSmallSample ? (
        <Text style={styles.smallSampleHint}>
          Small sample ({sample} {sample === 1 ? 'player' : 'players'}) — percentiles fill out as more players join.
        </Text>
      ) : null}

      <View style={styles.row}>
        <PercentileBadge title="Win Rate" metricLabel="WR" result={winRate} />
        <PercentileBadge title="Avg Score" metricLabel="AVG" result={avgScore} />
        <PercentileBadge title="Podium Rate" metricLabel="PODIUM" result={podiumRate} />
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

  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },

  smallSampleHint: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    fontStyle: 'italic',
    lineHeight: 16,
    marginBottom: 10,
  },

  row: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
})
