import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'

import { playerStatsSurface } from '../constants/analyticsPageSurface'
import { theme } from '../constants/theme'
import type { FrequentOpponent } from '../lib/frequent-opponents'

type Props = {
  opponents: FrequentOpponent[]
  loading?: boolean
  onSelect: (playerKey: string) => void
  onLongPress?: (playerKey: string) => void
}

export default function FrequentOpponentsCard({
  opponents,
  loading,
  onSelect,
  onLongPress,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Frequent Opponents</Text>
          <Text style={styles.title}>Players You Face Most</Text>
        </View>
        {loading ? <ActivityIndicator color={theme.colors.accent} /> : null}
      </View>

      {opponents.length === 0 && !loading ? (
        <Text style={styles.empty}>
          Lock a tracked game with another player to start filling out your most-faced list.
        </Text>
      ) : null}

      <View style={styles.rows}>
        {opponents.map((opponent, index) => (
          <Pressable
            key={opponent.playerKey}
            style={({ pressed }) => [
              styles.row,
              pressed && styles.rowPressed,
            ]}
            onPress={() => onSelect(opponent.playerKey)}
            onLongPress={
              onLongPress ? () => onLongPress(opponent.playerKey) : undefined
            }
            delayLongPress={250}
          >
            <View style={styles.rankPill}>
              <Text style={styles.rankPillText}>{index + 1}</Text>
            </View>

            <View style={styles.body}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
                  {opponent.playerName}
                </Text>
                <View
                  style={[
                    styles.typePill,
                    opponent.playerType === 'guest'
                      ? styles.typePillGuest
                      : styles.typePillUser,
                  ]}
                >
                  <Text
                    style={[
                      styles.typePillText,
                      opponent.playerType === 'guest'
                        ? styles.typePillGuestText
                        : styles.typePillUserText,
                    ]}
                  >
                    {opponent.playerType === 'guest' ? 'Guest' : 'User'}
                  </Text>
                </View>
              </View>
              <Text style={styles.sub} numberOfLines={1} ellipsizeMode="tail">
                {opponent.publicPlayerId ?? 'No Player ID'}
              </Text>
            </View>

            <View style={styles.countPill}>
              <Text style={styles.countValue}>{opponent.sharedGames}</Text>
              <Text style={styles.countLabel}>
                {opponent.sharedGames === 1 ? 'game' : 'games'}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {opponents.length > 0 ? (
        <Text style={styles.hint}>Press and hold a player to jump to their stats.</Text>
      ) : null}
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
    marginBottom: 12,
  },

  headerText: {
    flex: 1,
    minWidth: 0,
  },

  kicker: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },

  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },

  empty: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 4,
  },

  rows: {
    gap: 8,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: playerStatsSurface.panelRaised,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    padding: 10,
  },

  rowPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },

  rankPill: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rankPillText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  body: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  name: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    flexShrink: 1,
  },

  typePill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },

  typePillUser: {
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
    backgroundColor: 'rgba(192, 132, 252, 0.16)',
  },

  typePillGuest: {
    borderColor: theme.colors.border,
    backgroundColor: 'rgba(89, 183, 255, 0.16)',
  },

  typePillText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  typePillUserText: {
    color: theme.colors.accent,
  },

  typePillGuestText: {
    color: '#59B7FF',
  },

  sub: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },

  countPill: {
    minWidth: 56,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: playerStatsSurface.inset,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },

  countValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },

  countLabel: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  hint: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 10,
    fontStyle: 'italic',
  },
})
