import { useEffect, useRef, useState } from 'react'
import {
  Dimensions,
  Image,
  ImageBackground,
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
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Linking from 'expo-linking'
import * as SecureStore from 'expo-secure-store'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import PasswordVisibilityToggle from '../components/PasswordVisibilityToggle'
import { theme } from '../constants/theme'
import {
  CLAIM_GUEST_DISPLAY_NAME_KEY,
  CLAIM_GUEST_PUBLIC_PLAYER_ID_KEY,
  executePendingGuestClaim,
} from '../lib/claim-guest-flow'
import {
  ForgotPasswordValidationError,
  requestPasswordReset,
} from '../lib/forgot-password-flow'
import { Alert } from '../lib/themed-alert'
import { ensureProfileRow, getMyProfile } from '../lib/profile'
import {
  loadRememberedCredentials as loadStoredRememberedCredentials,
  persistRememberedCredentials,
} from '../lib/remembered-credentials'
import { supabase } from '../lib/supabase'

const logo = require('../assets/valeria_logo.png')
const backdrop = require('../assets/Citizen Backdrop.png')
const DISPLAY_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
})

const secureCredentialStore = {
  getItem: SecureStore.getItemAsync,
  setItem: SecureStore.setItemAsync,
  removeItem: SecureStore.deleteItemAsync,
}

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hydrating, setHydrating] = useState(true)
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
    setTimeout(() => {
      fieldNode.measureInWindow((_x, screenY) => {
        const screenHeight = Dimensions.get('window').height
        const targetScreenY = Math.min(140, screenHeight * 0.18)
        const delta = screenY - targetScreenY
        if (delta <= 0) return
        const next = Math.max(0, scrollOffsetY.current + delta)
        scrollRef.current?.scrollTo({ y: next, animated: true })
      })
    }, 80)
  }

  useEffect(() => {
    let mounted = true

    async function loadRememberedCredentials() {
      try {
        const remembered = await loadStoredRememberedCredentials({
          secureStore: secureCredentialStore,
          legacyStore: AsyncStorage,
        })

        if (!mounted) return

        setRememberMe(remembered.rememberMe)

        if (remembered.rememberMe) {
          setEmail(remembered.email)
          setPassword(remembered.password)
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

  async function persistRememberMe(
    nextRememberMe: boolean,
    nextEmail: string,
    nextPassword: string
  ) {
    await persistRememberedCredentials({
      secureStore: secureCredentialStore,
      legacyStore: AsyncStorage,
      rememberMe: nextRememberMe,
      email: nextEmail,
      password: nextPassword,
    })
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

      // If the user signed up with a pending guest-claim in their metadata
      // (set on the create-user screen), redeem it now that we have an
      // authenticated session. The flow is idempotent and clears the
      // metadata on success so it won't re-fire on the next login.
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      const claimOutcome = await executePendingGuestClaim(authUser?.user_metadata, {
        callClaimRpc: async (input) => {
          const { data, error: rpcError } = await supabase.rpc('claim_guest_profile', {
            p_display_name: input.displayName,
            p_public_player_id: input.publicPlayerId,
          })
          return { data, error: rpcError }
        },
        clearPendingMetadata: async () => {
          await supabase.auth.updateUser({
            data: {
              [CLAIM_GUEST_DISPLAY_NAME_KEY]: null,
              [CLAIM_GUEST_PUBLIC_PLAYER_ID_KEY]: null,
            },
          })
        },
      })

      if (claimOutcome.status === 'claimed') {
        Alert.alert(
          'Guest stats claimed',
          `Moved ${claimOutcome.result.scores_transferred} game${
            claimOutcome.result.scores_transferred === 1 ? '' : 's'
          } from "${claimOutcome.result.guest_display_name}" to your account.`
        )
      } else if (claimOutcome.status === 'failed') {
        Alert.alert("Couldn't claim guest", claimOutcome.message)
      }

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

  async function handleForgotPassword() {
    try {
      setLoading(true)

      const result = await requestPasswordReset(
        {
          email,
          redirectTo: Linking.createURL('reset-password', {
            scheme: 'valeriascore',
          }),
        },
        {
          resetPasswordForEmail: (nextEmail, options) =>
            supabase.auth.resetPasswordForEmail(nextEmail, options),
        }
      )

      Alert.alert('Check your email', result.message)
    } catch (err: any) {
      if (err instanceof ForgotPasswordValidationError) {
        Alert.alert('Missing info', err.message)
        return
      }

      Alert.alert('Reset failed', err?.message ?? 'Unknown error')
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
      <ImageBackground
        source={backdrop}
        style={styles.background}
        imageStyle={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.scrim}>
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
                <View style={styles.heroSection}>
                  <View style={styles.logoCrop}>
                    <Image source={logo} style={styles.logo} resizeMode="contain" />
                  </View>
                  <Text style={styles.brandWord}>Scoring</Text>
                  <Text style={styles.heroSubtitle}>
                    Sign in to continue to your sessions and scores.
                  </Text>
                </View>

                <View style={styles.formCard}>
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
                      editable={!hydrating && !loading}
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
                      placeholder="Password"
                      placeholderTextColor="#A79BC9"
                      style={[styles.input, styles.passwordInput]}
                      editable={!hydrating && !loading}
                    />
                    <PasswordVisibilityToggle
                      visible={passwordVisible}
                      onPress={() => setPasswordVisible((prev) => !prev)}
                      disabled={hydrating || loading}
                    />
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.linkButton,
                      pressed && styles.pressed,
                    ]}
                    onPress={handleForgotPassword}
                    disabled={loading || hydrating}
                  >
                    <Text style={styles.linkButtonText}>Forgot password?</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.rememberRow,
                      pressed && styles.pressed,
                    ]}
                    onPress={handleToggleRememberMe}
                    disabled={loading}
                  >
                    <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                      {rememberMe ? <Text style={styles.checkmark}>{'\u2713'}</Text> : null}
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
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => router.replace('/')}
                    disabled={loading}
                  >
                    <Text style={styles.secondaryButtonText}>Back</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </ImageBackground>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#141012',
  },
  background: {
    flex: 1,
  },
  backgroundImage: {
    opacity: 0.98,
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 30, 0.7)',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 16,
    paddingBottom: 32,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 18,
  },
  logoCrop: {
    width: 320,
    maxWidth: '100%',
    height: 84,
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  logo: {
    width: 320,
    height: 133,
    transform: [{ translateY: -16 }],
  },
  brandWord: {
    marginTop: -2,
    marginBottom: 8,
    color: '#F5EBFF',
    fontSize: 30,
    fontFamily: DISPLAY_FONT,
    fontWeight: '900',
    letterSpacing: 1.4,
    textAlign: 'center',
    textTransform: 'uppercase',
    textShadowColor: 'rgba(44, 19, 65, 0.95)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  heroSubtitle: {
    maxWidth: 320,
    color: '#F3E9FF',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(10, 15, 30, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  formCard: {
    backgroundColor: 'rgba(22, 17, 39, 0.92)',
    borderRadius: theme.radius.xxl,
    padding: 18,
    paddingTop: 28,
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
    // Reserve room for the eye toggle pinned to the right edge so the
    // typed password doesn't run under it.
    paddingRight: 44,
  },
  linkButton: {
    alignSelf: 'flex-end',
    marginTop: -2,
    marginBottom: 14,
  },
  linkButtonText: {
    color: theme.colors.primaryLight,
    fontSize: 13,
    fontWeight: '800',
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
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryLight,
  },
  checkmark: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 16,
  },
  rememberText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
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
})
