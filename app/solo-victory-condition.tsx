import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import ValeriaHeader from '../components/ValeriaHeader'
import { theme } from '../constants/theme'
import {
  SOLO_VICTORY_CONDITION_OPTIONS,
  parseSoloVictoryCondition,
} from '../lib/solo-mode'

export default function SoloVictoryConditionScreen() {
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{
    selectedCondition?: string
    returnToken?: string
  }>()

  const selectedCondition = parseSoloVictoryCondition(params.selectedCondition)
  const returnToken = typeof params.returnToken === 'string' ? params.returnToken : ''

  function chooseVictoryCondition(nextCondition: (typeof SOLO_VICTORY_CONDITION_OPTIONS)[number]['id']) {
    router.replace({
      pathname: '/solo-score' as never,
      params: {
        selectedCondition: nextCondition,
        returnToken: returnToken || String(Date.now()),
      },
    })
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 24,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <ValeriaHeader
        compact
        title="Victory Condition"
        subtitle="Choose how this solo game ended before saving the result."
      />

      {SOLO_VICTORY_CONDITION_OPTIONS.map((option) => {
        const active = option.id === selectedCondition
        return (
          <Pressable
            key={option.id}
            style={({ pressed }) => [
              styles.optionCard,
              active && styles.optionCardActive,
              pressed && styles.optionCardPressed,
            ]}
            onPress={() => chooseVictoryCondition(option.id)}
          >
            <View style={styles.optionTopRow}>
              <Text style={styles.optionLabel}>{active ? 'Selected' : 'Solo Finish'}</Text>
              {active ? (
                <View style={styles.activeChip}>
                  <Text style={styles.activeChipText}>Active</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.optionTitle}>{option.title}</Text>
            <Text style={styles.optionDescription}>{option.description}</Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  content: {
    paddingHorizontal: 12,
  },

  optionCard: {
    backgroundColor: 'rgba(40, 28, 72, 0.92)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  optionCardActive: {
    borderColor: theme.colors.borderAccent,
    backgroundColor: 'rgba(77, 55, 138, 0.94)',
  },

  optionCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },

  optionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },

  optionLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  activeChip: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  activeChipText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  optionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },

  optionDescription: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
})
