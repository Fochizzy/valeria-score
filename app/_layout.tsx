import { Stack, usePathname } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { StyleSheet, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import BottomNav from '../components/BottomNav'
import ThemedAlertHost from '../components/ThemedAlertHost'
import { theme } from '../constants/theme'

const PATHS_WITHOUT_TOP_NAV = [
  '/login',
  '/create-user',
  '/reset-password',
  '/choose-player-id',
  '/create-session',
  '/manage-data',
  '/duke-select',
]

function shouldShowBottomNav(pathname: string) {
  if (!pathname || pathname === '/') return false
  return !PATHS_WITHOUT_TOP_NAV.some((blocked) => pathname.startsWith(blocked))
}

const manageAccountSwipeBackScreenOptions = Object.freeze({
  gestureEnabled: true,
  fullScreenGestureEnabled: true,
  animationMatchesGesture: true,
})

export default function Layout() {
  const pathname = usePathname()
  const showBottomNav = shouldShowBottomNav(pathname)

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />

        <View style={styles.container}>
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
            <Stack.Screen name="choose-player-id" />
            <Stack.Screen name="create-session" />
            <Stack.Screen name="join-game" />
            <Stack.Screen name="duke-select" />
            <Stack.Screen name="score" />
            <Stack.Screen name="compare" />
            <Stack.Screen name="victory" />
            <Stack.Screen name="profile" options={manageAccountSwipeBackScreenOptions} />
            <Stack.Screen name="gallery" />
            <Stack.Screen name="guest-player" />
            <Stack.Screen name="player-stats" />
            <Stack.Screen name="duke-stats" />
            <Stack.Screen name="global-trends" />
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
