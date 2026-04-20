import { useEffect, useRef } from 'react'
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { theme } from '../constants/theme'

type Props = {
  label: string
  ruleText: string
  value: number
  onChange: (value: number) => void
  icon: any
  disabled?: boolean
}

const HOLD_START_DELAY = 350
const HOLD_REPEAT_MS = 85
const HOLD_STEP = 10

function getAccent(label: string) {
  const safe = label.toLowerCase()

  if (safe.includes('gold')) {
    return {
      ring: theme.colors.gold,
      tintBg: 'rgba(231, 199, 104, 0.14)',
      shadow: theme.colors.gold,
    }
  }

  if (safe.includes('mana') || safe.includes('magic')) {
    return {
      ring: theme.colors.magic,
      tintBg: 'rgba(89, 183, 255, 0.14)',
      shadow: theme.colors.magic,
    }
  }

  if (safe.includes('fight')) {
    return {
      ring: theme.colors.fight,
      tintBg: 'rgba(240, 138, 126, 0.14)',
      shadow: theme.colors.fight,
    }
  }

  if (safe.includes('victory')) {
    return {
      ring: '#C084FC',
      tintBg: 'rgba(192, 132, 252, 0.14)',
      shadow: '#C084FC',
    }
  }

  if (
    safe.includes('monster') ||
    safe.includes('boss') ||
    safe.includes('beast') ||
    safe.includes('minion')
  ) {
    return {
      ring: '#FF8D7A',
      tintBg: 'rgba(255, 141, 122, 0.14)',
      shadow: '#FF8D7A',
    }
  }

  if (safe.includes('domain') || safe.includes('citizen')) {
    return {
      ring: '#7CC5FF',
      tintBg: 'rgba(124, 197, 255, 0.14)',
      shadow: '#7CC5FF',
    }
  }

  return {
    ring: theme.colors.borderAccent ?? theme.colors.accent,
    tintBg: 'rgba(220, 203, 255, 0.10)',
    shadow: theme.colors.borderAccent ?? '#A78BFA',
  }
}

export function ScoreRow({
  label,
  ruleText,
  value,
  onChange,
  icon,
  disabled = false,
}: Props) {
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const repeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const holdingRef = useRef(false)

  const accent = getAccent(label)

  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [])

  function clearTimers() {
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current)
      startTimeoutRef.current = null
    }

    if (repeatIntervalRef.current) {
      clearInterval(repeatIntervalRef.current)
      repeatIntervalRef.current = null
    }

    holdingRef.current = false
  }

  function clamp(nextValue: number) {
    return Math.max(0, Math.floor(nextValue))
  }

  async function bump(delta: number) {
    if (disabled) return
    onChange(clamp(value + delta))
    await Haptics.selectionAsync()
  }

  async function bumpHold(delta: number) {
    if (disabled) return
    onChange(clamp(value + delta))
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  function handlePress(delta: number) {
    if (disabled) return
    if (holdingRef.current) return
    void bump(delta)
  }

  function startHold(delta: number) {
    if (disabled) return

    clearTimers()

    startTimeoutRef.current = setTimeout(() => {
      holdingRef.current = true
      void bumpHold(delta * HOLD_STEP)

      repeatIntervalRef.current = setInterval(() => {
        void bumpHold(delta * HOLD_STEP)
      }, HOLD_REPEAT_MS)
    }, HOLD_START_DELAY)
  }

  function endHold() {
    clearTimers()
  }

  return (
    <View
      style={[
        styles.row,
        { borderColor: accent.ring, shadowColor: accent.shadow },
        disabled && styles.rowDisabled,
      ]}
    >
      <View style={styles.left}>
        <View
          style={[
            styles.iconWrap,
            {
              borderColor: accent.ring,
              backgroundColor: accent.tintBg,
              shadowColor: accent.shadow,
            },
          ]}
        >
          <Image source={icon} style={styles.icon} resizeMode="contain" />
        </View>

        <View style={styles.meta}>
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>

          <View
            style={[
              styles.rulePill,
              {
                borderColor: accent.ring,
                backgroundColor: accent.tintBg,
              },
            ]}
          >
            <Text style={styles.rule}>{ruleText}</Text>
          </View>

          <Text style={styles.holdHint}>Hold to jump by 10</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable
          style={({ pressed }) => [
            styles.stepButton,
            { borderColor: accent.ring },
            pressed && styles.pressed,
            disabled && styles.disabledButton,
          ]}
          onPress={() => handlePress(-1)}
          onPressIn={() => startHold(-1)}
          onPressOut={endHold}
          onLongPress={() => {}}
          delayLongPress={HOLD_START_DELAY}
          disabled={disabled}
        >
          <Text style={styles.stepButtonText}>−</Text>
        </Pressable>

        <View style={[styles.valueWrap, { borderColor: accent.ring }]}>
          <Text style={styles.value}>{value}</Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.stepButton,
            styles.plusButton,
            { borderColor: accent.ring, shadowColor: accent.shadow },
            pressed && styles.pressed,
            disabled && styles.disabledButton,
          ]}
          onPress={() => handlePress(1)}
          onPressIn={() => startHold(1)}
          onPressOut={endHold}
          onLongPress={() => {}}
          delayLongPress={HOLD_START_DELAY}
          disabled={disabled}
        >
          <Text style={styles.stepButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 78,
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  rowDisabled: {
    opacity: 0.58,
  },

  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    paddingRight: 10,
  },

  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },

  icon: {
    width: 22,
    height: 22,
  },

  meta: {
    flex: 1,
    minWidth: 0,
  },

  label: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 5,
  },

  rulePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
  },

  rule: {
    color: theme.colors.textSecondary ?? theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },

  holdHint: {
    color: theme.colors.textMuted ?? '#B8A8D4',
    fontSize: 10,
    fontWeight: '700',
  },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  stepButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundAlt,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  plusButton: {
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },

  stepButtonText: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 22,
    marginTop: -1,
  },

  valueWrap: {
    minWidth: 56,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: theme.colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  value: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
  },

  disabledButton: {
    opacity: 0.5,
  },

  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.92,
  },
})