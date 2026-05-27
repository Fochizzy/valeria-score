import { useEffect } from 'react'
import { Stack, useGlobalSearchParams, usePathname, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { BackHandler, Platform, StyleSheet, View } from 'react-native'
import * as Linking from 'expo-linking'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import ActiveSessionVictoryWatcher from '../components/ActiveSessionVictoryWatcher'
import BottomNav from '../components/BottomNav'
import ThemedAlertHost from '../components/ThemedAlertHost'
import { theme } from '../constants/theme'
import { extractSessionTokensFromUrl } from '../lib/auth-link-session'
import { supabase } from '../lib/supabase'
import {
  buildTrackedRouteHref,
  getTrackedPreviousRoute,
  markTrackedBackNavigation,
  noteTrackedRouteVisit,
} from '../lib/route-history'
import { shouldShowBottomNav } from '../lib/top-nav-visibility'

const manageAccountSwipeBackScreenOptions = Object.freeze({
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
  animationMatchesGesture: true,
})

export default function Layout() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useGlobalSearchParams() as Record<
    string,
    string | string[] | undefined
  >
  const showBottomNav = shouldShowBottomNav(pathname)
  const trackedRouteHref = buildTrackedRouteHref(pathname, searchParams)

  // Handle deep links from Supabase email confirmation / password reset.
  // When the user taps the link in their email, Supabase verifies the token
  // then redirects to valeriascore://...#access_token=...&refresh_token=...
  // We extract those fragments and set the session in supabase-js.
  useEffect(() => {
    function hydrateSessionFromUrl(url: string) {
      const tokens = extractSessionTokensFromUrl(url)
      if (!tokens) return

      supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      })
    }

    // Check if the app was opened via a deep link (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) hydrateSessionFromUrl(url)
    })

    // Listen for deep links while the app is already open (warm start)
    const subscription = Linking.addEventListener('url', (event) => {
      hydrateSessionFromUrl(event.url)
    })

    return () => subscription.remove()
  }, [])

  useEffect(() => {
    noteTrackedRouteVisit(trackedRouteHref)
  }, [trackedRouteHref])

  useEffect(() => {
    if (Platform.OS !== 'android') return

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        const previousHref = getTrackedPreviousRoute()

        if (router.canGoBack()) {
          markTrackedBackNavigation()
          router.back()
          return true
        }

        if (pathname === '/') {
          return false
        }

        if (!previousHref) {
          return false
        }

        markTrackedBackNavigation()
        router.replace(previousHref)
        return true
      }
    )

    return () => subscription.remove()
  }, [router, trackedRouteHref])

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />

        <View style={styles.container}>
          <ActiveSessionVictoryWatcher />

          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: {
                backgroundColor: theme.colors.background,
              },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="reset-password" />
            <Stack.Screen name="create-user" />
            <Stack.Screen name="auth-callback" />
            <Stack.Screen name="choose-player-id" />
            <Stack.Screen name="create-session" />
            <Stack.Screen name="join-game" />
            <Stack.Screen name="duke-select" />
            <Stack.Screen name="score" />
            <Stack.Screen name="compare" />
            <Stack.Screen name="victory" />
            <Stack.Screen name="profile" options={manageAccountSwipeBackScreenOptions} />
            <Stack.Screen name="guest-player" />
            <Stack.Screen name="player-stats" />
            <Stack.Screen name="duke-stats" />
            <Stack.Screen name="global-trends" />
            <Stack.Screen name="solo-stats" />
            <Stack.Screen name="manage-data" options={manageAccountSwipeBackScreenOptions} />
          </Stack>

          {showBottomNav ? <BottomNav /> : null}
        </View>

        <ThemedAlertHost />
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
})
