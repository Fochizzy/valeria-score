import { StyleSheet, Text, View } from 'react-native'
import { theme } from '../constants/theme'
import { useIsOnline } from '../lib/connectivity'

/**
 * Global connectivity banner. Score inputs keep saving to this device while
 * offline, so the copy reassures rather than alarms.
 */
export default function OfflineBanner() {
  const online = useIsOnline()

  if (online) {
    return null
  }

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.title}>You&apos;re offline</Text>
      <Text style={styles.body}>
        Scores you enter stay saved on this device and sync when you reconnect.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: theme.colors.surfaceRaised,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSoft,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },

  title: {
    color: theme.colors.gold,
    fontSize: 13,
    fontWeight: '900',
  },

  body: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
})
