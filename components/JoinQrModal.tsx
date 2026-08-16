import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'

import { theme } from '../constants/theme'
import { buildJoinUrl } from '../lib/join-links'

type JoinQrModalProps = {
  visible: boolean
  joinCode: string | null
  onClose: () => void
}

/**
 * Full-screen QR code for the session join link. Everyone at the table scans
 * it with their camera and lands directly in the join flow — no code typing.
 */
export default function JoinQrModal({ visible, joinCode, onClose }: JoinQrModalProps) {
  const joinUrl = joinCode ? buildJoinUrl(joinCode) : ''

  if (!joinUrl) {
    return null
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.kicker}>Scan To Join</Text>

          <View style={styles.qrWrap}>
            <QRCode
              value={joinUrl}
              size={220}
              backgroundColor="#FFFFFF"
              color="#0A0F1E"
            />
          </View>

          <Text style={styles.code}>{joinCode}</Text>
          <Text style={styles.hint}>
            Point a phone camera here, or type the code in Join Game.
          </Text>

          <Pressable
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close QR code"
          >
            <Text style={styles.closeButtonText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 18, 0.86)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xxl,
  },

  card: {
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    padding: theme.spacing.xxl,
  },

  kicker: {
    color: theme.colors.primaryLight,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: theme.spacing.lg,
  },

  qrWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },

  code: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 6,
    marginTop: theme.spacing.lg,
  },

  hint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },

  closeButton: {
    marginTop: theme.spacing.xl,
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
  },

  closeButtonText: {
    color: '#120F1C',
    fontSize: 14,
    fontWeight: '900',
  },

  pressed: {
    opacity: 0.85,
  },
})
