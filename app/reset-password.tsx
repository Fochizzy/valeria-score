import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  Image,
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
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import PasswordVisibilityToggle from '../components/PasswordVisibilityToggle'
import { Alert } from '../lib/themed-alert'
import {
  ResetPasswordValidationError,
  establishPasswordRecoverySession,
  updateRecoveredPassword,
} from '../lib/reset-password-flow'
import { supabase } from '../lib/supabase'

const logo = require('../assets/valeria_logo.png')

export default function ResetPasswordScreen() {
  const linkingUrl = Linking.useLinkingURL()
  const handledUrlRef = useRef<string | null>(null)
  const scrollRef = useRef<ScrollView | null>(null)
  const fieldRefs = useRef<Record<string, View | null>>({})
  const scrollOffsetY = useRef(0)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordsVisible, setPasswordsVisible] = useState(false)
  const [checkingLink, setCheckingLink] = useState(true)
  const [saving, setSaving] = useState(false)
  const [recoveryReady, setRecoveryReady] = useState(false)
  const [statusMessage, setStatusMessage] = useState('Checking your reset link...')

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

    async function prepareRecovery() {
      try {
        setCheckingLink(true)

        if (linkingUrl && handledUrlRef.current !== linkingUrl) {
          handledUrlRef.current = linkingUrl

          await establishPasswordRecoverySession(linkingUrl, {
            setSession: ({ accessToken, refreshToken }) =>
              supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              }),
          })
        }

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!mounted) return

        if (!session) {
          setRecoveryReady(false)
          setStatusMessage(
            linkingUrl
              ? 'Open the newest password reset link from your email to continue.'
              : 'Open the password reset link from your email to continue.'
          )
          return
        }

        setRecoveryReady(true)
        setStatusMessage('Choose a new password for your account.')
      } catch (err: any) {
        if (!mounted) return

        setRecoveryReady(false)
        setStatusMessage(
          err?.message ??
            'We could not open that reset link. Request a new email and try again.'
        )
      } finally {
        if (mounted) setCheckingLink(false)
      }
    }

    prepareRecovery()

    return () => {
      mounted = false
    }
  }, [linkingUrl])

  async function handleResetPassword() {
    try {
      setSaving(true)

      const result = await updateRecoveredPassword(
        {
          password,
          confirmPassword,
        },
        {
          updateUser: (payload) => supabase.auth.updateUser(payload),
        }
      )

      Alert.alert('Password updated', result.message, [
        {
          text: 'Continue',
          onPress: () => router.replace('/'),
        },
      ])
    } catch (err: any) {
      if (err instanceof ResetPasswordValidationError) {
        Alert.alert('Check your password', err.message)
        return
      }

      Alert.alert('Reset failed', err?.message ?? 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  const formDisabled = checkingLink || saving || !recoveryReady

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
            <View style={styles.heroCard}>
              <View style={styles.logoFrame}>
                <Image source={logo} style={styles.logo} resizeMode="contain" />
              </View>

              <Text style={styles.kicker}>Valeria Score</Text>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>{statusMessage}</Text>
            </View>

            <View style={styles.formCard}>
              {checkingLink ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator color="#AF92F5" size="large" />
                  <Text style={styles.loadingText}>Opening your recovery link...</Text>
                </View>
              ) : (
                <>
                  <View ref={setFieldRef('password')} collapsable={false}>
                    <Text style={styles.label}>New Password</Text>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => scrollFieldIntoView('password')}
                      secureTextEntry={!passwordsVisible}
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder="At least 6 characters"
                      placeholderTextColor="#A79BC9"
                      style={[styles.input, styles.passwordInput]}
                      editable={!formDisabled}
                    />
                    <PasswordVisibilityToggle
                      visible={passwordsVisible}
                      onPress={() => setPasswordsVisible((prev) => !prev)}
                      disabled={formDisabled}
                      hiddenLabel="Show passwords"
                      visibleLabel="Hide passwords"
                    />
                  </View>

                  <View ref={setFieldRef('confirmPassword')} collapsable={false}>
                    <Text style={styles.label}>Confirm Password</Text>
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      onFocus={() => scrollFieldIntoView('confirmPassword')}
                      secureTextEntry={!passwordsVisible}
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder="Re-enter your password"
                      placeholderTextColor="#A79BC9"
                      style={[styles.input, styles.passwordInput]}
                      editable={!formDisabled}
                    />
                    <PasswordVisibilityToggle
                      visible={passwordsVisible}
                      onPress={() => setPasswordsVisible((prev) => !prev)}
                      disabled={formDisabled}
                      hiddenLabel="Show passwords"
                      visibleLabel="Hide passwords"
                    />
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryButton,
                      pressed && styles.pressed,
                      formDisabled && styles.buttonDisabled,
                    ]}
                    onPress={handleResetPassword}
                    disabled={formDisabled}
                  >
                    <Text style={styles.primaryButtonText}>
                      {saving ? 'Saving Password...' : 'Save New Password'}
                    </Text>
                  </Pressable>
                </>
              )}

              <Pressable
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                onPress={() => router.replace('/login')}
                disabled={saving}
              >
                <Text style={styles.secondaryButtonText}>Back to Login</Text>
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
    backgroundColor: '#140F1F',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
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
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  loadingText: {
    color: '#E2D4FF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
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
  passwordInput: {
    paddingRight: 44,
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
