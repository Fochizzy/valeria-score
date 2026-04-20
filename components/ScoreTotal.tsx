import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { useEffect } from 'react'
import { theme } from '../constants/theme'

export function ScoreTotal({
  total,
  subtitle,
}: {
  total: number
  subtitle?: string
}) {
  const scale = useSharedValue(1)

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.05, { duration: 120 }),
      withTiming(1, { duration: 120 })
    )
  }, [total])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <Text style={styles.label}>Total Score</Text>
      <Text style={styles.total}>{total}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
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
    ...theme.shadow.glowStrong,
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

  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
})