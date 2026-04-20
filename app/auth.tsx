import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../lib/supabase'
import { theme } from '../constants/theme'

const logo = require('../assets/valeria_logo.jpeg')

export default function AuthScreen() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const signUp = async () => {
    try {
      setLoading(true)

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
          },
        },
      })

      if (error) throw error
      Alert.alert('Success', 'Account created. You can now use the app.')
      router.replace('/home')
    } catch (err: any) {
      Alert.alert('Sign up failed', err.message ?? 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const signIn = async () => {
    try {
      setLoading(true)

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) throw error
      router.replace('/home')
    } catch (err: any) {
      Alert.alert('Sign in failed', err.message ?? 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboard}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.heroCard}>
            <View style={styles.logoFrame}>
              <Image source={logo} style={styles.logo} resizeMode="contain" />
            </View>

            <Text style={styles.kicker}>Valeria Score Ledger</Text>
            <Text style={styles.title}>Enter the Realm</Text>
            <Text style={styles.subtitle}>
              Sign in to track your duke, record final scoring, and compare totals across the table.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Player Access</Text>

            <TextInput
              placeholder="Display Name"
              placeholderTextColor={theme.colors.textMuted}
              value={displayName}
              onChangeText={setDisplayName}
              style={styles.input}
              autoCapitalize="words"
            />

            <TextInput
              placeholder="Email"
              placeholderTextColor={theme.colors.textMuted}
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TextInput
              placeholder="Password"
              placeholderTextColor={theme.colors.textMuted}
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              secureTextEntry
            />

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={signUp}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Working...' : 'Create Account'}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={signIn}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Sign In</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  keyboard: {
    flex: 1,
    backgroundColor: '#140F1F',
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#140F1F',
  },
  heroCard: {
    backgroundColor: '#1E152C',
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4F3A72',
  },
  logoFrame: {
    width: 180,
    height: 108,
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
    width: 150,
    height: 84,
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
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  formCard: {
    backgroundColor: '#1E152C',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#4F3A72',
  },
  sectionTitle: {
    color: '#E6D8FF',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 14,
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
    paddingVertical: 15,
    marginTop: 6,
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
    paddingVertical: 15,
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#E2D4FF',
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 16,
  },
  buttonPressed: {
    opacity: 0.92,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
})