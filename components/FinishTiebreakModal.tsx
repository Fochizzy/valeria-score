import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { CompareEntry } from '../lib/compare-entries'
import { theme } from '../constants/theme'

type Props = {
  visible: boolean
  entries: CompareEntry[]
  placements: Record<string, number>
  canSave: boolean
  saving: boolean
  onSelectPlacement: (scoreId: string, placement: number) => void
  onCancel: () => void
  onSave: () => void
}

export default function FinishTiebreakModal({
  visible,
  entries,
  placements,
  canSave,
  saving,
  onSelectPlacement,
  onCancel,
  onSave,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onCancel} />

        <View style={styles.dialogWrap}>
          <View style={styles.dialog}>
            <Text style={styles.kicker}>Finish Game</Text>
            <Text style={styles.title}>Break The Tie</Text>
            <Text style={styles.message}>
              These players are tied for the top score. Choose the final order before
              locking the game.
            </Text>

            <ScrollView
              style={styles.entryScroll}
              contentContainerStyle={styles.entryStack}
              showsVerticalScrollIndicator={false}
            >
              {entries.map((entry) => {
                const selectedPlacement = placements[entry.scoreId] ?? 0

                return (
                  <View key={entry.scoreId} style={styles.entryCard}>
                    <View style={styles.entryHeader}>
                      <View style={styles.entryCopy}>
                        <Text style={styles.entryName}>
                          {entry.label}
                          {entry.isGuest ? ' (Guest)' : ''}
                        </Text>
                        <Text style={styles.entryMeta}>
                          {entry.playerId ? `${entry.playerId} - ` : ''}
                          {entry.dukeName}
                        </Text>
                      </View>

                      <View style={styles.scorePill}>
                        <Text style={styles.scorePillValue}>{entry.totalScore}</Text>
                        <Text style={styles.scorePillLabel}>PTS</Text>
                      </View>
                    </View>

                    <View style={styles.placementRow}>
                      {entries.map((_, index) => {
                        const placement = index + 1
                        const isSelected = selectedPlacement === placement

                        return (
                          <Pressable
                            key={`${entry.scoreId}:${placement}`}
                            style={({ pressed }) => [
                              styles.placementButton,
                              isSelected && styles.placementButtonSelected,
                              pressed && styles.pressed,
                            ]}
                            onPress={() => onSelectPlacement(entry.scoreId, placement)}
                          >
                            <Text
                              style={[
                                styles.placementButtonText,
                                isSelected && styles.placementButtonTextSelected,
                              ]}
                            >
                              {placement}
                            </Text>
                          </Pressable>
                        )
                      })}
                    </View>
                  </View>
                )
              })}
            </ScrollView>

            <View style={styles.actionRow}>
              <Pressable
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                onPress={onCancel}
                disabled={saving}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  (!canSave || saving) && styles.buttonDisabled,
                  pressed && canSave && !saving && styles.pressed,
                ]}
                onPress={onSave}
                disabled={!canSave || saving}
              >
                <Text style={styles.primaryButtonText}>
                  {saving ? 'Saving...' : 'Save And Finish'}
                </Text>
              </Pressable>
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
    backgroundColor: 'rgba(7, 10, 22, 0.78)',
  },

  dialogWrap: {
    width: '100%',
    maxWidth: 420,
  },

  dialog: {
    maxHeight: '84%',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.border,
    padding: 18,
    ...theme.shadow.card,
  },

  kicker: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 8,
  },

  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },

  message: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    marginBottom: 16,
  },

  entryScroll: {
    maxHeight: 340,
  },

  entryStack: {
    gap: 12,
  },

  entryCard: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    gap: 12,
  },

  entryHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },

  entryCopy: {
    flex: 1,
    minWidth: 0,
  },

  entryName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },

  entryMeta: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },

  scorePill: {
    minWidth: 62,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.border,
    backgroundColor: theme.colors.surface,
  },

  scorePillValue: {
    color: theme.colors.accent,
    fontSize: 18,
    fontWeight: '900',
  },

  scorePillLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  placementRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  placementButton: {
    minWidth: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  placementButtonSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
    ...theme.shadow.glow,
  },

  placementButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },

  placementButtonTextSelected: {
    color: theme.colors.text,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },

  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },

  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },

  primaryButton: {
    flex: 1.2,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    ...theme.shadow.glow,
  },

  primaryButtonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
})
