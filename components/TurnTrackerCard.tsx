import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'

import { theme } from '../constants/theme'
import {
  advanceRound,
  buildTurnTrackerStorageKey,
  createInitialTurnTrackerState,
  cycleSeatCount,
  parseTurnTrackerState,
  rewindRound,
  type TurnTrackerState,
} from '../lib/turn-tracker'

type TurnTrackerCardProps = {
  sessionId: string
}

/**
 * Table utility: tracks the current round and who holds the first-player
 * token, rotating it left each round. Local to this device — the score
 * keeper runs it for the table, like a dice tray.
 */
export default function TurnTrackerCard({ sessionId }: TurnTrackerCardProps) {
  const [state, setState] = useState<TurnTrackerState | null>(null)
  const hydratedForSessionRef = useRef('')

  useEffect(() => {
    let mounted = true

    hydratedForSessionRef.current = ''
    setState(null)

    AsyncStorage.getItem(buildTurnTrackerStorageKey(sessionId))
      .then((raw) => {
        if (!mounted) return
        hydratedForSessionRef.current = sessionId
        setState(parseTurnTrackerState(raw) ?? createInitialTurnTrackerState())
      })
      .catch(() => {
        if (!mounted) return
        hydratedForSessionRef.current = sessionId
        setState(createInitialTurnTrackerState())
      })

    return () => {
      mounted = false
    }
  }, [sessionId])

  useEffect(() => {
    if (!state || hydratedForSessionRef.current !== sessionId) return

    AsyncStorage.setItem(
      buildTurnTrackerStorageKey(sessionId),
      JSON.stringify(state)
    ).catch(() => {})
  }, [sessionId, state])

  if (!state) {
    return null
  }

  function update(next: TurnTrackerState) {
    setState(next)
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  return (
    <View style={styles.card}>
      <View style={styles.roundBlock}>
        <Text style={styles.label}>Round</Text>

        <View style={styles.roundControls}>
          <Pressable
            style={({ pressed }) => [
              styles.stepButton,
              pressed && styles.pressed,
              state.round <= 1 && styles.stepButtonDisabled,
            ]}
            onPress={() => update(rewindRound(state))}
            disabled={state.round <= 1}
            accessibilityRole="button"
            accessibilityLabel="Previous round"
          >
            <Text style={styles.stepButtonText}>−</Text>
          </Pressable>

          <Text style={styles.roundValue}>{state.round}</Text>

          <Pressable
            style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}
            onPress={() => update(advanceRound(state))}
            accessibilityRole="button"
            accessibilityLabel="Next round"
          >
            <Text style={styles.stepButtonText}>+</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.seatBlock}>
        <Text style={styles.label}>First Player</Text>
        <Text style={styles.seatValue}>Seat {state.firstSeat}</Text>

        <Pressable
          style={({ pressed }) => [styles.seatCountChip, pressed && styles.pressed]}
          onPress={() => update(cycleSeatCount(state))}
          accessibilityRole="button"
          accessibilityLabel="Change number of seats"
        >
          <Text style={styles.seatCountChipText}>{state.seatCount} seats</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },

  roundBlock: {
    flex: 1,
  },

  label: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  roundControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },

  stepButton: {
    width: 34,
    height: 34,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepButtonDisabled: {
    opacity: 0.35,
  },

  stepButtonText: {
    color: theme.colors.accent,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },

  roundValue: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '900',
    minWidth: 30,
    textAlign: 'center',
  },

  divider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.lg,
  },

  seatBlock: {
    alignItems: 'flex-start',
  },

  seatValue: {
    color: theme.colors.gold,
    fontSize: 16,
    fontWeight: '900',
  },

  seatCountChip: {
    marginTop: 4,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
  },

  seatCountChipText: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
  },

  pressed: {
    opacity: 0.8,
  },
})
