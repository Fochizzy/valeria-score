import { Pressable, StyleSheet } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { theme } from '../constants/theme'

type Props = {
  visible: boolean
  onPress: () => void
  disabled?: boolean
  // Distance from the top of the field wrapper (label + input group). The
  // default lands the eye in the middle of a typical input that sits under
  // a 14px label with 8px marginBottom — adjust per-screen if the layout
  // differs (e.g. no label, or extra helper copy above the input).
  topOffset?: number
  // Optional accessibility labels (overrides defaults).
  hiddenLabel?: string
  visibleLabel?: string
}

export default function PasswordVisibilityToggle({
  visible,
  onPress,
  disabled = false,
  topOffset = 32,
  hiddenLabel = 'Show password',
  visibleLabel = 'Hide password',
}: Props) {
  return (
    <Pressable
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={visible ? visibleLabel : hiddenLabel}
      style={({ pressed }) => [
        styles.button,
        { top: topOffset },
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <MaterialCommunityIcons
        name={visible ? 'eye-off-outline' : 'eye-outline'}
        size={22}
        color={theme.colors.primaryLight}
      />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 10,
    padding: 6,
  },
  buttonPressed: {
    opacity: 0.65,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
})
