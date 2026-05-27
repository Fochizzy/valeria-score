import { useEffect, useLayoutEffect, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router, useNavigation } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'
import { ensureProfileRow, getMyProfile } from '../lib/profile'
import { discardCurrentTrackedRoute } from '../lib/route-history'
import { theme } from '../constants/theme'

const logo = require('../assets/valeria_logo.png')

export default function IndexScreen() {
  const navigation = useNavigation()
  const [checkingAuth, setCheckingAuth] = useState(true)

  useLayoutEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      headerLeft: () => null,
    })
  }, [navigation])

  useEffect(() => {
    let mounted = true

    async function bootstrap() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!mounted) return

        if (!session) {
          setCheckingAuth(false)
          return
        }

        await ensureProfileRow()
        const profile = await getMyProfile()

        if (!mounted) return

        if (!profile?.public_player_id) {
          discardCurrentTrackedRoute()
          router.replace('/choose-player-id')
          return
        }

        discardCurrentTrackedRoute()
        router.replace('/create-session')
      } catch (error) {
        console.error('Bootstrap failed', error)
        if (mounted) setCheckingAuth(false)
      }
    }

    bootstrap()

    return () => {
      mounted = false
    }
  }, [])

  if (checkingAuth) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.loadingCard}>
          <ActivityIndicator color={theme.colors.accent} size="large" />
          <Text style={styles.loadingText}>Loading Valeria Score...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.logoWrap}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
          </View>

          <Text style={styles.kicker}>Valeria Score</Text>
          <Text style={styles.title}>Track Every Final Score</Text>
          <Text style={styles.subtitle}>
            A cleaner, faster scoring table for Valeria sessions, duke selection, and live comparison.
          </Text>
        </View>

        <View style={styles.actionsCard}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.primaryButtonText}>Login</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={() => router.push('/create-user')}
          >
            <Text style={styles.secondaryButtonText}>Create User</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loadingCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xxl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 22,
    alignItems: 'center',
    marginBottom: 14,
    ...theme.shadow.glow,
  },
  logoWrap: {
    width: 210,
    height: 128,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    marginBottom: 16,
  },
  logo: {
    width: 178,
    height: 96,
  },
  kicker: {
    color: theme.colors.primaryLight,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  actionsCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    gap: 10,
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
  secondaryButton: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.94,
  },
})
