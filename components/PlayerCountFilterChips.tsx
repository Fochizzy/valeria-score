import { Pressable, StyleSheet, Text, View } from 'react-native'

import { playerStatsSurface } from '../constants/analyticsPageSurface'
import { theme } from '../constants/theme'
import {
  PLAYER_COUNT_FILTER_LABEL,
  PLAYER_COUNT_FILTERS,
  type PlayerCountFilter,
} from '../lib/player-count-filter'

type Props = {
  value: PlayerCountFilter
  onChange: (next: PlayerCountFilter) => void
  label?: string
}

export default function PlayerCountFilterChips({ value, onChange, label }: Props) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.row}>
        {PLAYER_COUNT_FILTERS.map((key) => {
          const active = value === key
          return (
            <Pressable
              key={key}
              onPress={() => onChange(key)}
              style={({ pressed }) => [
                styles.chip,
                active && styles.chipActive,
                pressed && styles.chipPressed,
              ]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {PLAYER_COUNT_FILTER_LABEL[key]}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },

  label: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 6,
  },

  row: {
    flexDirection: 'row',
    gap: 6,
  },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: playerStatsSurface.panelAlt,
  },

  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
  },

  chipPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },

  chipText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '900',
  },

  chipTextActive: {
    color: theme.colors.text,
  },
})
