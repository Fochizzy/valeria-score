import { useEffect, useRef } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

import { theme } from '../../constants/theme'
import { isCompleteJoinCode, normalizeJoinCode } from '../../lib/join-links'
import { joinSessionByCode } from '../../lib/sessions'
import { supabase } from '../../lib/supabase'
import { Alert } from '../../lib/themed-alert'

/**
 * Deep-link target for valeriascore://join/ABC123 (the table QR code).
 * Auto-joins the session and drops the player straight onto the score screen.
 */
export default function JoinByLinkScreen() {
  const params = useLocalSearchParams<{ code?: string }>()
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const code = normalizeJoinCode(
      typeof params.code === 'string' ? params.code : ''
    )

    async function joinFromLink() {
      if (!isCompleteJoinCode(code)) {
        router.replace('/join-game')
        return
      }

      const {
        data: { session: authSession },
      } = await supabase.auth.getSession()

      if (!authSession) {
        Alert.alert(
          'Sign in first',
          'Log in, then scan the table QR code again to join the game.'
        )
        router.replace('/')
        return
      }

      try {
        const session = await joinSessionByCode(code)

        if (!session?.id) {
          Alert.alert('Game not found', 'No session matches that join code.')
          router.replace({ pathname: '/join-game', params: { code } })
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
        router.replace({ pathname: '/join-game', params: { code } })
      }
    }

    void joinFromLink()
  }, [params.code])

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
        <Text style={styles.text}>Joining the table...</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  card: {
    alignItems: 'center',
    gap: theme.spacing.md,
  },

  text: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
})
