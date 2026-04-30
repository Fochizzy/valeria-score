import { StyleSheet, Text, View } from 'react-native'

import { playerStatsSurface } from '../constants/analyticsPageSurface'
import { theme } from '../constants/theme'
import {
  formatPercentileLabel,
  type PercentileResult,
} from '../lib/percentile-vs-global'

type Props = {
  title: string
  metricLabel: string
  result: PercentileResult | null
}

export default function PercentileBadge({ title, metricLabel, result }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>{metricLabel}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{formatPercentileLabel(result)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: playerStatsSurface.panelAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
  },

  kicker: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },

  title: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 4,
  },

  value: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '900',
  },
})
