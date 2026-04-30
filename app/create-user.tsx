import { useRef, useState } from 'react'
import {
  Dimensions,
  KeyboardAvoidingView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import OnboardingMasthead from '../components/OnboardingMasthead'
import PasswordVisibilityToggle from '../components/PasswordVisibilityToggle'
import { theme } from '../constants/theme'
import { supabase } from '../lib/supabase'
import { Alert } from '../lib/themed-alert'
import {
  buildSignUpClaimMetadata,
  normalizeClaimGuestInput,
} from '../lib/claim-guest-flow'
import { createUserOrRecoverExistingAccount } from '../lib/create-user-flow'
import { getOnboardingMastheadContent } from '../lib/onboarding-masthead'
import { ensureProfileRow, getMyProfile } from '../lib/profile'

const masthead = getOnboardingMastheadContent('create-user')

export default function CreateUserScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [claimGuestExpanded, setClaimGuestExpanded] = useState(false)
  const [guestDisplayName, setGuestDisplayName] = useState('')
  const [guestPlayerId, setGuestPlayerId] = useState('')
  const scrollRef = useRef<ScrollView | null>(null)
  const fieldRefs = useRef<Record<string, View | null>>({})
  const scrollOffsetY = useRef(0)

  function setFieldRef(id: string) {
    return (node: View | null) => {
      fieldRefs.current[id] = node
    }
  }

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollOffsetY.current = event.nativeEvent.contentOffset.y
  }

  function scrollFieldIntoView(id: string) {
    const fieldNode = fieldRefs.current[id]
    if (!fieldNode) return
    // Wait a tick for the keyboard to start animating in, then read the
    // field's absolute screen Y via measureInWindow (Fabric-safe — avoids
    // the broken measureLayout(scrollViewHandle, ...) path) and shift the
    // scrollview by however far it is below our target screen position.
    setTimeout(() => {
      fieldNode.measureInWindow((_x, screenY) => {
        const screenHeight = Dimensions.get('window').height
        // Aim to land the field roughly a third of the way down the screen
        // so it sits comfortably above the keyboard.
        const targetScreenY = Math.min(140, screenHeight * 0.18)
        const delta = screenY - targetScreenY
        if (delta <= 0) return
        const next = Math.max(0, scrollOffsetY.current + delta)
        scrollRef.current?.scrollTo({ y: next, animated: true })
      })
    }, 80)
  }

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

    let pendingGuestClaim
    try {
      pendingGuestClaim = claimGuestExpanded
        ? normalizeClaimGuestInput({
            displayName: guestDisplayName,
            publicPlayerId: guestPlayerId,
          })
        : null
    } catch (err: any) {
      Alert.alert('Check guest fields', err?.message ?? 'Both guest fields are required.')
      return
    }

    try {
      setLoading(true)

      const result = await createUserOrRecoverExistingAccount(
        {
          email: safeEmail,
          password,
          displayName: safeName,
          extraSignUpMetadata: buildSignUpClaimMetadata(pendingGuestClaim),
        },
        {
          signUp: (input) => supabase.auth.signUp(input),
          signInWithPassword: (input) => supabase.auth.signInWithPassword(input),
          signOut: () => supabase.auth.signOut(),
          ensureProfileRow,
          getMyProfile,
        }
      )

      if (result.nextRoute === '/login') {
        Alert.alert(
          'Confirm your email',
          'We sent a confirmation link to your email. Click it to verify your account, then log in.'
        )
        router.replace('/login')
        return
      }

      if (result.nextRoute === '/choose-player-id') {
        if (result.recoveredExistingAccount) {
          Alert.alert(
            'Profile restored',
            'That email already had an account, so we signed you in and rebuilt your profile.'
          )
        }
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          <View style={styles.content}>
            <OnboardingMasthead {...masthead} />

            <View style={styles.formCard}>
              <View ref={setFieldRef('displayName')} collapsable={false}>
                <Text style={styles.label}>Display Name</Text>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  onFocus={() => scrollFieldIntoView('displayName')}
                  autoCapitalize="words"
                  autoCorrect={false}
                  placeholder="Example: Izzy"
                  placeholderTextColor="#A79BC9"
                  style={styles.input}
                />
              </View>

              <View ref={setFieldRef('email')} collapsable={false}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => scrollFieldIntoView('email')}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  placeholderTextColor="#A79BC9"
                  style={styles.input}
                />
              </View>

              <View ref={setFieldRef('password')} collapsable={false}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => scrollFieldIntoView('password')}
                  secureTextEntry={!passwordVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#A79BC9"
                  style={[styles.input, styles.passwordInput]}
                />
                <PasswordVisibilityToggle
                  visible={passwordVisible}
                  onPress={() => setPasswordVisible((prev) => !prev)}
                  disabled={loading}
                />
              </View>

              <Pressable
                style={({ pressed }) => [styles.claimToggle, pressed && styles.pressed]}
                onPress={() => setClaimGuestExpanded((prev) => !prev)}
                disabled={loading}
              >
                <Text style={styles.claimToggleText}>
                  {claimGuestExpanded
                    ? '— Hide Guest Account Claim'
                    : '+ I previously played as a guest'}
                </Text>
              </Pressable>

              {claimGuestExpanded ? (
                <View style={styles.claimSection}>
                  <Text style={styles.claimHelper}>
                    Enter the exact display name and player ID of the guest you previously played
                    as. Your past games and stats will move to this new account.
                  </Text>

                  <View ref={setFieldRef('guestDisplayName')} collapsable={false}>
                    <Text style={styles.label}>Guest Display Name</Text>
                    <TextInput
                      value={guestDisplayName}
                      onChangeText={setGuestDisplayName}
                      onFocus={() => scrollFieldIntoView('guestDisplayName')}
                      autoCapitalize="words"
                      autoCorrect={false}
                      placeholder="Example: Mary"
                      placeholderTextColor="#A79BC9"
                      style={styles.input}
                    />
                  </View>

                  <View ref={setFieldRef('guestPlayerId')} collapsable={false}>
                    <Text style={styles.label}>Guest Player ID</Text>
                    <TextInput
                      value={guestPlayerId}
                      onChangeText={setGuestPlayerId}
                      onFocus={() => scrollFieldIntoView('guestPlayerId')}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      placeholder="Example: MARY42"
                      placeholderTextColor="#A79BC9"
                      style={styles.input}
                    />
                  </View>
                </View>
              ) : null}

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
        </ScrollView>
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
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 16,
    paddingBottom: 32,
  },
  content: {
    padding: 16,
  },
  formCard: {
    marginTop: -18,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.xxl,
    padding: 18,
    paddingTop: 32,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },
  label: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 8,
    marginTop: 2,
  },
  input: {
    backgroundColor: theme.colors.backgroundAlt,
    color: theme.colors.text,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    fontSize: 15,
  },
  passwordInput: {
    paddingRight: 44,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primaryLight,
    paddingVertical: 16,
    marginTop: 4,
    marginBottom: 10,
    ...theme.shadow.glow,
  },
  primaryButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    paddingVertical: 16,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  claimToggle: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    marginBottom: 4,
  },
  claimToggleText: {
    color: theme.colors.primaryLight,
    fontSize: 13,
    fontWeight: '900',
  },
  claimSection: {
    backgroundColor: 'rgba(123, 92, 255, 0.10)',
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(170, 145, 255, 0.26)',
    padding: 12,
    marginBottom: 12,
    gap: 4,
  },
  claimHelper: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginBottom: 6,
  },
})
