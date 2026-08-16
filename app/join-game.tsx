import React, { useMemo, useState } from 'react'
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import ValeriaHeader from '../components/ValeriaHeader'
import { joinSessionByCode } from '../lib/sessions'
import { Alert } from '../lib/themed-alert'

const citizenBackdrop = require('../assets/Citizen Backdrop.png')

export default function JoinGameScreen() {
  const router = useRouter()
  // Prefilled when the user arrives from a scanned QR link that could not
  // auto-join (e.g. they had to sign in first).
  const params = useLocalSearchParams<{ code?: string }>()
  const [joinCode, setJoinCode] = useState(
    typeof params.code === 'string' ? params.code : ''
  )
  const [loading, setLoading] = useState(false)

  const normalizedCode = useMemo(
    () => joinCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6),
    [joinCode]
  )

  async function handleJoin() {
    if (normalizedCode.length !== 6) {
      Alert.alert('Invalid code', 'Enter the 6-character join code.')
      return
    }

    try {
      setLoading(true)

      const session = await joinSessionByCode(normalizedCode)

      if (!session?.id) {
        Alert.alert('Game not found', 'No session matches that join code.')
        return
      }

      router.replace({
        pathname: '/score',
        params: {
          sessionId: String(session.id),
          joinCode: String(session.join_code),
        },
      })
    } catch (error: any) {
      Alert.alert('Unable to join', error?.message ?? 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handlePasteClean(value: string) {
    setJoinCode(value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6))
  }

  return (
    <ImageBackground
      source={citizenBackdrop}
      style={styles.pageBackground}
      imageStyle={styles.pageBackgroundImage}
      resizeMode="cover"
    >
      <View style={styles.pageScrim}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ValeriaHeader
            compact
            showBack
            title="Join Game"
            subtitle="Paste a 6-character code"
          />

          <View style={styles.heroCard}>
            <Text style={styles.kicker}>Session Entry</Text>
            <Text style={styles.heroTitle}>Reconnect To A Table</Text>
            <Text style={styles.heroSubtitle}>
              Paste the 6-character code from your message to jump back into a live Valeria session.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>Join Code</Text>

            <TextInput
              value={normalizedCode}
              onChangeText={handlePasteClean}
              placeholder="Enter 6-character code"
              placeholderTextColor="#8E7FA8"
              autoCapitalize="characters"
              autoCorrect={false}
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              importantForAutofill="yes"
              maxLength={6}
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={handleJoin}
            />

            <View style={styles.buttonRow}>
              <Pressable
                style={[styles.secondaryButton]}
                onPress={() => setJoinCode('')}
                disabled={loading}
              >
                <Text style={styles.secondaryButtonText}>Clear</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.primaryButton,
                  (loading || normalizedCode.length !== 6) && styles.buttonDisabled,
                ]}
                onPress={handleJoin}
                disabled={loading || normalizedCode.length !== 6}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Joining...' : 'Join Game'}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  pageBackground: {
    flex: 1,
    backgroundColor: '#120F1C',
  },
  pageBackgroundImage: {
    opacity: 1,
  },
  pageScrim: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 30, 0.76)',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: 12,
    paddingBottom: 24,
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#302544',
    marginBottom: 12,
    backgroundColor: 'rgba(26, 22, 40, 0.68)',
    padding: 14,
  },
  kicker: {
    color: '#CDBDFA',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroTitle: {
    color: '#FFF8FF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
  },
  heroSubtitle: {
    color: '#D7CAEF',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: 'rgba(26, 22, 40, 0.68)',
    borderWidth: 1,
    borderColor: '#302544',
    borderRadius: 18,
    padding: 12,
  },
  label: {
    color: '#F4EEFF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#221C33',
    color: '#F4EEFF',
    borderWidth: 1,
    borderColor: '#3C3054',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
  },
  buttonRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#E7DDFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#120F1C',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryButton: {
    width: 96,
    backgroundColor: '#221C33',
    borderWidth: 1,
    borderColor: '#3C3054',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#F4EEFF',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
})
