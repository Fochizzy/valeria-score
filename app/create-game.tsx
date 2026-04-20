import { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { createGameSession } from '../lib/create-session'
import { theme } from '../constants/theme'

const logo = require('../assets/valeria_logo.jpeg')

export default function CreateGameScreen() {
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    try {
      setLoading(true)

      const result = await createGameSession()
      const sessionId = String(result.session.id)
      const joinCode = String(result.session.join_code)

      router.replace({
        pathname: '/session/[id]',
        params: {
          id: sessionId,
          joinCode,
        },
      })
    } catch (err: any) {
      Alert.alert('Create game failed', err?.message ?? 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.logoFrame}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </View>

        <Text style={styles.kicker}>Host a Table</Text>
        <Text style={styles.title}>Create Session</Text>
        <Text style={styles.subtitle}>
          Start a new session, get a join code, and continue to the session hub.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed,
            loading && styles.disabled,
          ]}
          onPress={handleCreate}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating...' : 'Create Session'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  content: {
    padding: 20,
    justifyContent: 'center',
    flexGrow: 1,
  },

  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },

  logoFrame: {
    width: 180,
    height: 108,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundAlt,
    marginBottom: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  logo: {
    width: '100%',
    height: '100%',
  },

  kicker: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },

  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 8,
  },

  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },

  formCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    ...theme.shadow.card,
  },

  button: {
    backgroundColor: theme.colors.accent,
    borderRadius: 18,
    paddingVertical: 15,
    ...theme.shadow.glow,
  },

  buttonText: {
    color: theme.colors.background,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },

  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },

  disabled: {
    opacity: 0.5,
  },
})