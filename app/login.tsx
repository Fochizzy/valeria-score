import { useEffect, useState } from 'react'
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
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'
import { supabase } from '../lib/supabase'
import { ensureProfileRow, getMyProfile } from '../lib/profile'

const logo = require('../assets/valeria_logo.jpeg')

const REMEMBER_ME_KEY = 'remember_me_enabled'
const REMEMBERED_EMAIL_KEY = 'remembered_email'
const REMEMBERED_PASSWORD_KEY = 'remembered_password'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hydrating, setHydrating] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadRememberedCredentials() {
      try {
        const [enabledValue, savedEmail, savedPassword] = await Promise.all([
          AsyncStorage.getItem(REMEMBER_ME_KEY),
          AsyncStorage.getItem(REMEMBERED_EMAIL_KEY),
          AsyncStorage.getItem(REMEMBERED_PASSWORD_KEY),
        ])

        if (!mounted) return

        const enabled = enabledValue === 'true'
        setRememberMe(enabled)

        if (enabled) {
          setEmail(savedEmail ?? '')
          setPassword(savedPassword ?? '')
        }
      } catch (err) {
        console.error('Failed to load remembered credentials', err)
      } finally {
        if (mounted) setHydrating(false)
      }
    }

    loadRememberedCredentials()

    return () => {
      mounted = false
    }
  }, [])

  async function persistRememberMe(nextRememberMe: boolean, nextEmail: string, nextPassword: string) {
    if (nextRememberMe) {
      await Promise.all([
        AsyncStorage.setItem(REMEMBER_ME_KEY, 'true'),
        AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, nextEmail),
        AsyncStorage.setItem(REMEMBERED_PASSWORD_KEY, nextPassword),
      ])
      return
    }

    await Promise.all([
      AsyncStorage.setItem(REMEMBER_ME_KEY, 'false'),
      AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY),
      AsyncStorage.removeItem(REMEMBERED_PASSWORD_KEY),
    ])
  }

  async function handleLogin() {
    const safeEmail = email.trim().toLowerCase()

    if (!safeEmail || !password) {
      Alert.alert('Missing info', 'Enter your email and password.')
      return
    }

    try {
      setLoading(true)

      const { error } = await supabase.auth.signInWithPassword({
        email: safeEmail,
        password,
      })

      if (error) throw error

      await persistRememberMe(rememberMe, safeEmail, password)

      await ensureProfileRow()
      const profile = await getMyProfile()

      if (!profile?.public_player_id) {
        router.replace('/choose-player-id')
        return
      }

      router.replace('/create-session')
    } catch (err: any) {
      Alert.alert('Login failed', err?.message ?? 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleRememberMe() {
    const nextValue = !rememberMe
    setRememberMe(nextValue)

    if (!nextValue) {
      try {
        await persistRememberMe(false, '', '')
      } catch (err) {
        console.error('Failed to clear remembered credentials', err)
      }
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={styles.heroCard}>
            <View style={styles.logoFrame}>
              <Image source={logo} style={styles.logo} resizeMode="contain" />
            </View>

            <Text style={styles.kicker}>Valeria Score</Text>
            <Text style={styles.title}>Login</Text>
            <Text style={styles.subtitle}>
              Sign in to continue to your sessions and scores.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="#A79BC9"
              style={styles.input}
              editable={!hydrating && !loading}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Password"
              placeholderTextColor="#A79BC9"
              style={styles.input}
              editable={!hydrating && !loading}
            />

            <Pressable
              style={({ pressed }) => [
                styles.rememberRow,
                pressed && styles.pressed,
              ]}
              onPress={handleToggleRememberMe}
              disabled={loading}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <Text style={styles.rememberText}>Remember Me</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                (loading || hydrating) && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={loading || hydrating}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Logging In...' : 'Login'}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              onPress={() => router.replace('/')}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#140F1F',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  heroCard: {
    backgroundColor: '#1E152C',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#4F3A72',
  },
  logoFrame: {
    width: 200,
    height: 120,
    borderRadius: 18,
    backgroundColor: '#2A1E3E',
    borderWidth: 1,
    borderColor: '#9272D8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    padding: 8,
  },
  logo: {
    width: 170,
    height: 96,
  },
  kicker: {
    color: '#BCAEE0',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    color: '#FFF8FF',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#CFC3E8',
    textAlign: 'center',
    lineHeight: 21,
    fontSize: 14,
  },
  formCard: {
    backgroundColor: '#1E152C',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#4F3A72',
  },
  label: {
    color: '#E6D8FF',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
    marginTop: 2,
  },
  input: {
    backgroundColor: '#180F23',
    color: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#5A4380',
    fontSize: 15,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6A4D98',
    backgroundColor: '#2A1E3E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#7046C9',
    borderColor: '#AF92F5',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 16,
  },
  rememberText: {
    color: '#E2D4FF',
    fontSize: 14,
    fontWeight: '800',
  },
  primaryButton: {
    backgroundColor: '#7046C9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#AF92F5',
    paddingVertical: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#2A1E3E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#6A4D98',
    paddingVertical: 16,
  },
  secondaryButtonText: {
    color: '#E2D4FF',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.92,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
})