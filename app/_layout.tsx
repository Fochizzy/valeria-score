import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { theme } from '../constants/theme'

export default function Layout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            fontWeight: '900',
            color: theme.colors.text,
          },
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
          headerBackTitleVisible: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Login' }} />
        <Stack.Screen name="create-user" options={{ title: 'Create User' }} />
        <Stack.Screen name="choose-player-id" options={{ title: 'Choose Player ID' }} />
        <Stack.Screen name="create-session" options={{ title: 'Create Session' }} />
        <Stack.Screen name="create-game" options={{ title: 'Create Session' }} />
        <Stack.Screen name="join-game" options={{ title: 'Join Game' }} />
        <Stack.Screen name="session/[id]" options={{ title: 'Session Hub' }} />
        <Stack.Screen name="duke-select" options={{ title: 'Choose Duke' }} />
        <Stack.Screen name="score" options={{ title: 'Score' }} />
        <Stack.Screen name="compare" options={{ title: 'Compare Scores' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        <Stack.Screen name="gallery" options={{ title: 'Duke Gallery' }} />
        <Stack.Screen name="guest-player" options={{ title: 'Guest Player' }} />
        <Stack.Screen name="player-stats" options={{ title: 'Player Stats' }} />
        <Stack.Screen name="duke-stats" options={{ title: 'Duke Stats' }} />
      </Stack>
    </>
  )
}