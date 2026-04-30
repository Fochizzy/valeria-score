import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native'
import { theme } from '../constants/theme'

type CountBadgeProps = {
  value: number | string
  size?: 'sm' | 'md' | 'lg'
  backgroundColor?: string
  borderColor?: string
  textColor?: string
  style?: StyleProp<ViewStyle>
}

const SIZE_STYLES = StyleSheet.create({
  sm: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 8,
  },
  md: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 10,
  },
  lg: {
    minWidth: 40,
    height: 40,
    paddingHorizontal: 12,
  },
})

const TEXT_STYLES = StyleSheet.create({
  sm: {
    fontSize: 11,
  },
  md: {
    fontSize: 12,
  },
  lg: {
    fontSize: 14,
  },
})

export default function CountBadge({
  value,
  size = 'md',
  backgroundColor = 'rgba(139, 92, 246, 0.14)',
  borderColor = theme.colors.borderAccent ?? theme.colors.accent,
  textColor = theme.colors.accent,
  style,
}: CountBadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        SIZE_STYLES[size],
        {
          backgroundColor,
          borderColor,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          TEXT_STYLES[size],
          {
            color: textColor,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  text: {
    fontWeight: '900',
  },
})
