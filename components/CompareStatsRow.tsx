import { Pressable, StyleSheet, Text, View } from 'react-native'
import { theme } from '../constants/theme'

const pageSurface = {
  panelAlt: 'rgba(31, 22, 52, 0.78)',
}

type Props = {
  onPressPlayerStats: () => void
  onPressDukeStats: () => void
  onPressGlobalTrends: () => void
}

const LINKS = [
  {
    key: 'playerStats',
    kicker: 'Deep Dive',
    title: 'Player Statistics',
    sub: 'Leaderboard & breakdown.',
  },
  {
    key: 'dukeStats',
    kicker: 'Roster',
    title: 'Duke Statistics',
    sub: 'Win rates by duke.',
  },
  {
    key: 'globalTrends',
    kicker: 'Meta',
    title: 'Global Trends',
    sub: 'Tier list & shape.',
  },
] as const

export default function CompareStatsRow({
  onPressPlayerStats,
  onPressDukeStats,
  onPressGlobalTrends,
}: Props) {
  const handlerByKey: Record<(typeof LINKS)[number]['key'], () => void> = {
    playerStats: onPressPlayerStats,
    dukeStats: onPressDukeStats,
    globalTrends: onPressGlobalTrends,
  }

  return (
    <View style={styles.row}>
      {LINKS.map((link) => (
        <Pressable
          key={link.key}
          style={({ pressed }) => [
            styles.card,
            pressed && styles.cardPressed,
          ]}
          onPress={handlerByKey[link.key]}
        >
          <Text style={styles.kicker}>{link.kicker}</Text>
          <Text style={styles.title} numberOfLines={2}>{link.title}</Text>
          <Text style={styles.sub} numberOfLines={2}>{link.sub}</Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },

  card: {
    flex: 1,
    backgroundColor: pageSurface.panelAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 12,
  },

  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },

  kicker: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  title: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },

  sub: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
})
