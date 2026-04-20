import { useState } from 'react'
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
import { supabase } from '../lib/supabase'
import { ensureProfileRow, getMyProfile } from '../lib/profile'

const logo = require('../assets/valeria_logo.jpeg')

export default function CreateUserScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreateUser() {
    const safeEmail = email.trim().toLowerCase()
    const safeName = displayName.trim()

    if (!safeEmail || !password) {
      Alert.alert('Missing info', 'Enter an email and password.')
      return
    }

    if (password.length < 6) {
      Alert.alert('Password too short', 'Use at least 6 characters.')
      return
    }

    try {
      setLoading(true)

      const { data, error } = await supabase.auth.signUp({
        email: safeEmail,
        password,
        options: {
          data: {
            display_name: safeName,
          },
        },
      })

      if (error) throw error

      if (!data.session) {
        Alert.alert(
          'Check your email',
          'Your account was created. Confirm your email, then log in.'
        )
        router.replace('/login')
        return
      }

      await ensureProfileRow()
      const profile = await getMyProfile()

      if (!profile?.public_player_id) {
        router.replace('/choose-player-id')
        return
      }

      router.replace('/create-session')
    } catch (err: any) {
      Alert.alert('Create user failed', err?.message ?? 'Unknown error')
    } finally {
      setLoading(false)
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
            <Text style={styles.title}>Create User</Text>
            <Text style={styles.subtitle}>
              Create your account, then choose your public player ID.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              autoCorrect={false}
              placeholder="Example: Izzy"
              placeholderTextColor="#A79BC9"
              style={styles.input}
            />

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
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="At least 6 characters"
              placeholderTextColor="#A79BC9"
              style={styles.input}
            />

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleCreateUser}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Creating User...' : 'Create User'}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              onPress={() => router.replace('/')}
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