import React from 'react'
import { View, Text, TextInput, Image, StyleSheet, ImageSourcePropType } from 'react-native'
import { theme } from '../theme/theme'

type Props = {
  label: string
  multiplier: number
  value: number
  icon?: ImageSourcePropType
  onChange: (value: string) => void
  autoFocus?: boolean
}

export default function IconScoreInput({
  label,
  multiplier,
  value,
  icon,
  onChange,
  autoFocus = false,
}: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <View style={styles.iconWrap}>
          {icon ? (
            <Image source={icon} style={styles.icon} resizeMode="contain" />
          ) : (
            <Text style={styles.fallbackIcon}>?</Text>
          )}
        </View>

        <View style={styles.textWrap}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.multiplier}>× {multiplier}</Text>
        </View>
      </View>

      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={value ? String(value) : ''}
        onChangeText={onChange}
        autoFocus={autoFocus}
        placeholder="0"
        placeholderTextColor={theme.colors.textMuted}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: theme.spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  icon: {
    width: 28,
    height: 28,
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
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  multiplier: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  input: {
    width: 82,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
})