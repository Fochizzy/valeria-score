import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useEffect } from 'react'
import { theme } from '../constants/theme'

type SavedState = 'saved' | 'unsaved' | 'locked'

export function ScoreTotal({
  total,
  savedState = 'unsaved',
  savedAtLabel,
}: {
  total: number
  // Status line under the big number — see below.
  savedState?: SavedState
  // Optional explicit "Saved Apr 27" label for the saved state.
  savedAtLabel?: string
}) {
  const scale = useSharedValue(1)

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.05, { duration: 120 }),
      withTiming(1, { duration: 120 })
    )
  }, [scale, total])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  // Status line replaces the previous duke-name subtitle. Reads like a row in
  // a status bar: "0 pts · ⚠ unsaved" / "12 pts · ✓ saved" / "12 pts · 🔒 locked".
  const statusGlyph =
    savedState === 'saved' ? '✓' : savedState === 'locked' ? '🔒' : '⚠'
  const statusLabel =
    savedState === 'saved'
      ? savedAtLabel ?? 'saved'
      : savedState === 'locked'
        ? 'locked'
        : 'unsaved'

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <Text style={styles.label}>Total Score</Text>
      <Text style={styles.total}>{total}</Text>
      <View style={styles.statusRow}>
        <Text style={styles.statusText}>
          {total} {total === 1 ? 'pt' : 'pts'} ·{' '}
          <Text style={styles.statusBadge}>
            {statusGlyph} {statusLabel}
          </Text>
        </Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
    padding: theme.spacing.lg,
    alignItems: 'center',
    ...theme.shadow.glow,
  },

  label: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  total: {
    color: theme.colors.text,
    fontSize: 42,
    fontWeight: '900',
    marginTop: 4,
    lineHeight: 46,
  },

  statusRow: {
    marginTop: 6,
    alignItems: 'center',
  },

  statusText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },

  statusBadge: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
})
