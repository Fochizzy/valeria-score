import { useMemo, useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import OnboardingMasthead from '../components/OnboardingMasthead'
import { Alert } from '../lib/themed-alert'
import { normalizePlayerId, setMyPlayerId } from '../lib/profile'
import { theme } from '../constants/theme'
import { getOnboardingMastheadContent } from '../lib/onboarding-masthead'

const masthead = getOnboardingMastheadContent('choose-player-id')

export default function ChoosePlayerIdScreen() {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  const preview = useMemo(() => normalizePlayerId(value), [value])

  async function handleContinue() {
    const normalized = normalizePlayerId(value)

    if (normalized.length < 3) {
      Alert.alert('Player ID error', 'Player ID must be at least 3 characters.')
      return
    }

    try {
      setSaving(true)
      await setMyPlayerId(normalized)
      router.replace('/create-session')
    } catch (err: any) {
      Alert.alert('Player ID error', err?.message ?? 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <OnboardingMasthead {...masthead} />

          <View style={styles.formCard}>
            <Text style={styles.label}>Player ID</Text>

            <TextInput
              value={value}
              onChangeText={(text) => setValue(normalizePlayerId(text))}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="Example: IZZY"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
              maxLength={20}
            />

            <Text style={styles.helpText}>
              Use letters, numbers, hyphen, or underscore. If you already played as a
              guest, reuse that same Player ID and we&apos;ll link that guest profile to
              this account.
            </Text>

            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>Preview</Text>
              <Text style={styles.previewValue}>{preview || 'YOUR_ID'}</Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                saving && styles.disabled,
              ]}
              onPress={handleContinue}
              disabled={saving}
            >
              <Text style={styles.primaryButtonText}>
                {saving ? 'Saving...' : 'Continue'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  formCard: {
    marginTop: -18,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.xxl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    paddingTop: 32,
    ...theme.shadow.card,
  },
  label: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  helpText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 8,
    marginBottom: 14,
  },
  previewCard: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  previewLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  previewValue: {
    color: theme.colors.accent,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: 15,
    alignItems: 'center',
    ...theme.shadow.glow,
  },
  primaryButtonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.94,
  },
  disabled: {
    opacity: 0.6,
  },
})
