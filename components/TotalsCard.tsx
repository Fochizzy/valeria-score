import { StyleSheet, Text, View } from 'react-native'
import { theme } from '../constants/theme'

type Props = {
  total: number
  ruleCount: number
}

export function TotalsCard({ total, ruleCount }: Props) {
  return (
    <View style={styles.card}>
      <View>
        <Text style={styles.kicker}>Current Score</Text>
        <Text style={styles.total}>{total}</Text>
      </View>

      <View style={styles.pill}>
        <Text style={styles.pillText}>{ruleCount} active inputs</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.border,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...theme.shadow.card,
  },

  kicker: {
    color: theme.colors.textMuted,
    fontWeight: '800',
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  total: {
    color: theme.colors.text,
    fontSize: 34,
    fontWeight: '900',
  },

  pill: {
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  pillText: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 12,
  },
})