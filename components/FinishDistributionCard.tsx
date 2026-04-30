import { StyleSheet, Text, View } from 'react-native'

import { playerStatsSurface } from '../constants/analyticsPageSurface'
import { theme } from '../constants/theme'
import {
  computeFinishShares,
  type FinishDistribution,
} from '../lib/finish-distribution'

type Props = {
  distribution: FinishDistribution
}

const BUCKET_COLOR: Record<keyof FinishDistribution, string> = {
  '1st': '#E7C768',
  '2nd': '#C4C7D6',
  '3rd': '#C8865A',
  '4th+': '#5B6378',
  total: 'transparent',
}

const BUCKET_LABEL = ['1st', '2nd', '3rd', '4th+'] as const

export default function FinishDistributionCard({ distribution }: Props) {
  const shares = computeFinishShares(distribution)
  const hasData = distribution.total > 0

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.kicker}>Finish Distribution</Text>
        <Text style={styles.subTotal}>
          {hasData
            ? `${distribution.total} game${distribution.total === 1 ? '' : 's'}`
            : 'No locked games yet'}
        </Text>
      </View>

      <View style={styles.barTrack}>
        {hasData
          ? BUCKET_LABEL.map((bucket) => {
              if (shares[bucket] <= 0) return null
              const width: `${number}%` = `${shares[bucket]}%`
              return (
                <View
                  key={bucket}
                  style={[
                    styles.barSegment,
                    { width, backgroundColor: BUCKET_COLOR[bucket] },
                  ]}
                />
              )
            })
          : null}
      </View>

      <View style={styles.legendRow}>
        {BUCKET_LABEL.map((bucket) => (
          <View key={bucket} style={styles.legendItem}>
            <View
              style={[
                styles.legendSwatch,
                { backgroundColor: BUCKET_COLOR[bucket] },
              ]}
            />
            <Text style={styles.legendLabel}>{bucket}</Text>
            <Text style={styles.legendValue}>
              {distribution[bucket]}
              <Text style={styles.legendShare}>
                {hasData ? `  ${Math.round(shares[bucket])}%` : ''}
              </Text>
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

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  kicker: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },

  subTotal: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  barTrack: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    backgroundColor: playerStatsSurface.inset,
    overflow: 'hidden',
    marginBottom: 12,
  },

  barSegment: {
    height: '100%',
  },

  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: '40%',
  },

  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },

  legendLabel: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
    minWidth: 32,
  },

  legendValue: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '900',
    flexShrink: 1,
  },

  legendShare: {
    color: theme.colors.textMuted,
    fontWeight: '700',
  },
})
