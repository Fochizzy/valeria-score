import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { theme } from '../constants/theme'
import { manageAccountModalPalette } from '../lib/manage-account-menu'

export type ActionDialogModalAction = {
  id: string
  text: string
  style?: 'default' | 'cancel' | 'destructive'
  disabled?: boolean
  onPress?: () => void
}

type Props = {
  visible: boolean
  kicker?: string
  title: string
  message?: string
  actions: ActionDialogModalAction[]
  dismissible?: boolean
  onRequestClose: () => void
}

export default function ActionDialogModal({
  visible,
  kicker,
  title,
  message,
  actions,
  dismissible = true,
  onRequestClose,
}: Props) {
  function handleBackdropPress() {
    if (!dismissible) return
    onRequestClose()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleBackdropPress}
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={handleBackdropPress} />

        <View style={styles.dialogWrap}>
          <View style={styles.dialog}>
            {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}

            <View style={styles.actions}>
              {actions.map((action) => (
                <Pressable
                  key={action.id}
                  style={({ pressed }) => [
                    styles.actionButton,
                    action.style === 'cancel' && styles.cancelButton,
                    action.style === 'destructive' && styles.destructiveButton,
                    pressed && !action.disabled && styles.pressed,
                    action.disabled && styles.disabled,
                  ]}
                  onPress={action.onPress}
                  disabled={action.disabled}
                >
                  <Text style={styles.actionText}>{action.text}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: manageAccountModalPalette.backdrop,
  },

  dialogWrap: {
    width: '100%',
    maxWidth: 380,
  },

  dialog: {
    backgroundColor: manageAccountModalPalette.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: manageAccountModalPalette.border,
    padding: 18,
    ...theme.shadow.card,
  },

  kicker: {
    color: manageAccountModalPalette.text,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
    opacity: 0.88,
  },

  title: {
    color: manageAccountModalPalette.text,
    fontSize: 23,
    fontWeight: '900',
    marginBottom: 8,
  },

  message: {
    color: manageAccountModalPalette.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    marginBottom: 16,
  },

  actions: {
    gap: 10,
  },

  actionButton: {
    minHeight: 52,
    backgroundColor: manageAccountModalPalette.surfaceRaised,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: manageAccountModalPalette.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  cancelButton: {
    backgroundColor: manageAccountModalPalette.surface,
  },

  destructiveButton: {
    borderColor: theme.colors.error,
    backgroundColor: 'rgba(84, 41, 116, 0.98)',
  },

  actionText: {
    color: manageAccountModalPalette.text,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },

  disabled: {
    opacity: 0.55,
  },
})
