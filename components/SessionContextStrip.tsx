import { useEffect, useRef } from 'react'
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { theme } from '../constants/theme'

type SessionContextTone = 'default' | 'accent' | 'success' | 'warning'

export type SessionContextItem = {
  label: string
  value: string
  tone?: SessionContextTone
  onPress?: () => void
  disabled?: boolean
  // Show a small animated pulse dot before the value (e.g. for "Waiting" status).
  showPulse?: boolean
  // Show a copy/share glyph after the value to advertise tap-to-copy.
  showCopyIcon?: boolean
}

type Props = {
  items: SessionContextItem[]
}

type ToneStyles = {
  backgroundColor: string
  borderColor: string
  valueColor: string
}

function getToneStyles(tone: SessionContextTone = 'default'): ToneStyles {
  switch (tone) {
    case 'accent':
      return {
        backgroundColor: 'rgba(139, 92, 246, 0.14)',
        borderColor: theme.colors.borderAccent ?? theme.colors.accent,
        valueColor: theme.colors.accent,
      }
    case 'success':
      return {
        backgroundColor: 'rgba(112, 215, 165, 0.12)',
        borderColor: theme.colors.success,
        valueColor: theme.colors.success,
      }
    case 'warning':
      return {
        backgroundColor: theme.colors.surfaceAlt,
        borderColor: theme.colors.border,
        valueColor: theme.colors.gold,
      }
    default:
      return {
        backgroundColor: theme.colors.surfaceAlt,
        borderColor: theme.colors.border,
        valueColor: theme.colors.text,
      }
  }
}

function PulseDot({ color }: { color: string }) {
  const animatedValue = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [animatedValue])

  const ringScale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.4],
  })
  const ringOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0],
  })

  return (
    <View style={pulseStyles.wrap}>
      <Animated.View
        style={[
          pulseStyles.ring,
          {
            backgroundColor: color,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      <View style={[pulseStyles.dot, { backgroundColor: color }]} />
    </View>
  )
}

function SessionContextPill({ item }: { item: SessionContextItem }) {
  const tone = getToneStyles(item.tone)
  const valueRow = (
    <View style={styles.valueRow}>
      {item.showPulse ? <PulseDot color={tone.valueColor} /> : null}
      <Text
        style={[styles.value, { color: tone.valueColor }]}
        numberOfLines={1}
      >
        {item.value}
      </Text>
      {item.showCopyIcon ? (
        <MaterialCommunityIcons
          name="content-copy"
          size={13}
          color={tone.valueColor}
          style={styles.copyIcon}
        />
      ) : null}
    </View>
  )

  const content = (
    <>
      <Text style={styles.label}>{item.label}</Text>
      {valueRow}
    </>
  )

  if (item.onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.pill,
          {
            backgroundColor: tone.backgroundColor,
            borderColor: tone.borderColor,
          },
          pressed && styles.pressed,
          item.disabled && styles.disabled,
        ]}
        onPress={item.onPress}
        disabled={item.disabled}
      >
        {content}
      </Pressable>
    )
  }

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: tone.backgroundColor,
          borderColor: tone.borderColor,
        },
      ]}
    >
      {content}
    </View>
  )
}

export default function SessionContextStrip({ items }: Props) {
  return (
    <View style={styles.wrap}>
      {items.map((item) => (
        <SessionContextPill
          key={`${item.label}-${item.value}`}
          item={item}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },

  pill: {
    minHeight: 54,
    minWidth: 92,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    flexGrow: 1,
  },

  label: {
    color: theme.colors.textMuted ?? '#A99BC8',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 3,
  },

  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  value: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '900',
  },

  copyIcon: {
    marginLeft: 6,
  },

  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },

  disabled: {
    opacity: 0.5,
  },
})

const pulseStyles = StyleSheet.create({
  wrap: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  ring: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
})
