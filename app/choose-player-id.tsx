import { useMemo, useState } from 'react'
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { normalizePlayerId, setMyPlayerId } from '../lib/profile'
import { theme } from '../constants/theme'

const logo = require('../assets/valeria_logo.jpeg')

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
          <View style={styles.heroCard}>
            <View style={styles.logoWrap}>
              <Image source={logo} style={styles.logo} resizeMode="contain" />
            </View>

            <Text style={styles.kicker}>Public Identity</Text>
            <Text style={styles.title}>Choose Player ID</Text>
            <Text style={styles.subtitle}>
              Other players will use this public ID to recognize you in shared games.
            </Text>
          </View>

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
              Use letters, numbers, hyphen, or underscore.
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
    padding: 20,
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xxl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
    ...theme.shadow.glow,
  },
  logoWrap: {
    width: 180,
    height: 108,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    marginBottom: 14,
  },
  logo: {
    width: 148,
    height: 82,
  },
  kicker: {
    color: theme.colors.primaryLight,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 6,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
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