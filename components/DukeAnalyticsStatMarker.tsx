import { Image, StyleSheet, Text, View } from 'react-native'

import { theme } from '../constants/theme'
import { scoreIcons } from '../data/scoreIcons'
import { getDukeAnalyticsStatMarker } from '../lib/duke-analytics-marker'

type DukeAnalyticsStatMarkerProps = {
  statKey: string
  fallbackLabel: string
}

export default function DukeAnalyticsStatMarker({
  statKey,
  fallbackLabel,
}: DukeAnalyticsStatMarkerProps) {
  const marker = getDukeAnalyticsStatMarker(statKey)

  if (!marker.iconKey) {
    return <Text style={styles.fallbackLabel}>{fallbackLabel}</Text>
  }

  return (
    <View style={styles.badge}>
      <Image
        source={scoreIcons[marker.iconKey]}
        style={styles.icon}
        resizeMode="contain"
        accessibilityLabel={marker.accessibilityLabel}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  icon: {
    width: 26,
    height: 26,
  },

  fallbackLabel: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
})
