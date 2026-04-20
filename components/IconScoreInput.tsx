import React from 'react'
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ImageSourcePropType,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { theme } from '../constants/theme'

type Props = {
  type: string
  label: string
  multiplier: number
  value: number
  icon?: ImageSourcePropType
  onChange: (nextValue: number) => void
  disabled?: boolean
}

const statColors: Record<string, string> = {
  gold: theme.colors.gold ?? '#E7C768',
  magic: theme.colors.magic ?? '#8FB3FF',
  fight: theme.colors.fight ?? '#F08A7E',
  vp: '#F7A8D7',
  hammer: '#F5B971',
  helmet: '#7CC7FF',
  key: '#B99CFF',
  holy: '#F5E48C',
  citizenCount: '#7BD88F',
  monstersCount: '#F08A7E',
  monsterPoints: '#FF9C6B',
  bossCount: '#FF6B6B',
  lieutenantCount: '#C084FC',
  beastCount: '#F59E0B',
  minionCount: '#94A3B8',
  domainCount: '#5EEAD4',
  domainPoints: '#60A5FA',
  citizen: '#7BD88F',
  monster: '#F08A7E',
  boss: '#FF6B6B',
  lieutenant: '#C084FC',
  beast: '#F59E0B',
  minion: '#94A3B8',
  domain: '#5EEAD4',
}

function nextTen(value: number) {
  if (value <= 0) return 10
  return Math.ceil((value + 1) / 10) * 10
}

function previousTen(value: number) {
  if (value <= 0) return 0
  const prev = Math.floor((value - 1) / 10) * 10
  return Math.max(0, prev)
}

export default function IconScoreInput({
  type,
  label,
  multiplier,
  value,
  icon,
  onChange,
  disabled = false,
}: Props) {
  const color = statColors[type] || theme.colors.primary

  const increment = async () => {
    if (disabled) return
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onChange(value + 1)
  }

  const decrement = async () => {
    if (disabled) return
    await Haptics.selectionAsync()
    onChange(Math.max(0, value - 1))
  }

  const jumpUp = async () => {
    if (disabled) return
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    onChange(nextTen(value))
  }

  const jumpDown = async () => {
    if (disabled) return
    await Haptics.selectionAsync()
    onChange(previousTen(value))
  }

  return (
    <View style={[styles.row, { borderColor: color }, disabled && styles.rowDisabled]}>
      <View style={styles.left}>
        <View
          style={[
            styles.iconWrap,
            {
              borderColor: color,
              backgroundColor: `${color}15`,
              shadowColor: color,
            },
          ]}
        >
          {icon ? (
            <Image source={icon} style={styles.icon} resizeMode="contain" />
          ) : (
            <Text style={styles.fallbackIcon}>?</Text>
          )}
        </View>

        <View style={styles.textWrap}>
          <Text style={[styles.label, { color }]}>{label}</Text>
          <Text style={styles.multiplier}>× {multiplier}</Text>
          <Text style={styles.hint}>Hold to jump by 10</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable
          style={[styles.button, styles.minusButton, disabled && styles.buttonDisabled]}
          onPress={decrement}
          onLongPress={jumpDown}
          delayLongPress={250}
          disabled={disabled}
        >
          <Text style={styles.buttonText}>−</Text>
        </Pressable>

        <View style={[styles.valueBox, { borderColor: color }]}>
          <Text style={styles.valueText}>{value}</Text>
        </View>

        <Pressable
          style={[
            styles.button,
            styles.plusButton,
            { backgroundColor: color, shadowColor: color },
            disabled && styles.buttonDisabled,
          ]}
          onPress={increment}
          onLongPress={jumpUp}
          delayLongPress={250}
          disabled={disabled}
        >
          <Text style={styles.buttonText}>+</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },

  rowDisabled: {
    opacity: 0.6,
  },

  left: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },

  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
    borderWidth: 2,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },

  icon: {
    width: 30,
    height: 30,
  },

  fallbackIcon: {
    color: theme.colors.textSecondary,
    fontWeight: '700',
    fontSize: 18,
  },

  textWrap: {
    flex: 1,
  },

  label: {
    fontSize: 16,
    fontWeight: '800',
  },

  multiplier: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },

  hint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 3,
  },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  button: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  minusButton: {
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft ?? theme.colors.border,
  },

  plusButton: {
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 4,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  buttonText: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '800',
  },

  valueBox: {
    minWidth: 72,
    height: 46,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundAlt ?? theme.colors.background,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.spacing.sm,
  },

  valueText: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
})