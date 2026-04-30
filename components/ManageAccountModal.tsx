import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'

import { theme } from '../constants/theme'
import {
  manageAccountModalPalette,
  type ManageAccountModalAction,
} from '../lib/manage-account-menu'

type Props = {
  visible: boolean
  title: string
  message: string
  actions: ManageAccountModalAction[]
  onRequestClose: () => void
}

// Custom navigation modal — replaces the generic ActionDialogModal layout so
// it can render an X close button in the top-right and apply the destructive
// (red outline) treatment to the Logout action without affecting the rest of
// the alert system.
export default function ManageAccountModal({
  visible,
  title,
  message,
  actions,
  onRequestClose,
}: Props) {
  const handleAction = (action: ManageAccountModalAction) => {
    onRequestClose()
    action.onPress?.()
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onRequestClose}
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onRequestClose} />

        <View style={styles.dialogWrap}>
          <View style={styles.dialog}>
            <Pressable
              onPress={onRequestClose}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
              hitSlop={10}
              accessibilityLabel="Close navigation"
            >
              <Text style={styles.closeIcon}>×</Text>
            </Pressable>

            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}

            <View style={styles.actions}>
              {actions.map((action) => {
                const isDestructive = action.style === 'destructive'
                return (
                  <Pressable
                    key={action.id}
                    style={({ pressed }) => [
                      styles.actionButton,
                      isDestructive && styles.destructiveButton,
                      pressed && !action.disabled && styles.pressed,
                      action.disabled && styles.disabled,
                    ]}
                    onPress={() => handleAction(action)}
                    disabled={action.disabled}
                  >
                    <Text
                      style={[
                        styles.actionText,
                        isDestructive && styles.destructiveText,
                      ]}
                    >
                      {action.text}
                    </Text>
                  </Pressable>
                )
              })}
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
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    ...theme.shadow.card,
  },

  close: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },

  closeIcon: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '900',
  },

  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
    paddingRight: 36,
  },

  message: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    opacity: 0.92,
    marginBottom: 16,
    paddingRight: 36,
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

  destructiveButton: {
    // Subtle red outline keeps Logout visually distinct without making it
    // shout — the fill stays the same dark purple as the other actions.
    borderColor: 'rgba(255, 110, 120, 0.65)',
    backgroundColor: 'rgba(70, 36, 110, 0.95)',
  },

  actionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },

  destructiveText: {
    color: '#FFB8BF',
  },

  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },

  disabled: {
    opacity: 0.55,
  },
})
