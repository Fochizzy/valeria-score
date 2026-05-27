import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '../constants/theme'
import { getAuthLinkFallbackRoute } from '../lib/auth-link-session'

export default function NotFoundScreen() {
  const linkingUrl = Linking.useLinkingURL()
  const [checkingAuthLink, setCheckingAuthLink] = useState(true)

  useEffect(() => {
    let mounted = true

    async function recoverAuthRoute() {
      const incomingUrl = linkingUrl ?? (await Linking.getInitialURL())
      const fallbackRoute = getAuthLinkFallbackRoute(incomingUrl)

      if (fallbackRoute) {
        router.replace(fallbackRoute)
        return
      }

      if (mounted) {
        setCheckingAuthLink(false)
      }
    }

    void recoverAuthRoute()

    return () => {
      mounted = false
    }
  }, [linkingUrl])

  if (checkingAuthLink) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.card}>
          <ActivityIndicator color={theme.colors.accent} size="large" />
          <Text style={styles.title}>Opening your link</Text>
          <Text style={styles.body}>
            We are checking whether this is an account confirmation or password
            recovery link.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Page not found</Text>
        <Text style={styles.body}>
          That link does not match a screen in the app. If you were opening an
          email link, request a fresh email and try again.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => router.replace('/login')}
        >
          <Text style={styles.buttonText}>Go to login</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xxl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 24,
    alignItems: 'center',
    gap: 14,
    ...theme.shadow.glow,
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  body: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  button: {
    marginTop: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    alignSelf: 'stretch',
    ...theme.shadow.glow,
  },
  buttonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  buttonPressed: {
    opacity: 0.9,
  },
})
