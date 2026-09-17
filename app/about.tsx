import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import ValeriaHeader from '../components/ValeriaHeader'
import { theme } from '../constants/theme'
import {
  ABOUT_BYLINE,
  ABOUT_CREDITS,
  ABOUT_DISCLAIMER,
  ABOUT_INTRO,
  ABOUT_TITLE,
} from '../lib/about-content'
import { performSafeBackNavigation } from '../lib/back-navigation'
import { getTrackedPreviousRoute, markTrackedBackNavigation } from '../lib/route-history'

export default function AboutScreen() {
  const insets = useSafeAreaInsets()

  // Reachable from the signed-out landing screen as well as the in-app
  // navigation menu, so the fallback is the root route rather than the
  // account-only Game Hub the shared default points at.
  function goBack() {
    performSafeBackNavigation({
      canGoBack: router.canGoBack(),
      fallbackHref: '/',
      previousHref: getTrackedPreviousRoute(),
      back: () => router.back(),
      markBackNavigation: markTrackedBackNavigation,
      replace: (href) => router.replace(href),
    })
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 24,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <ValeriaHeader title={ABOUT_TITLE} />

      <View style={styles.card}>
        <Text style={styles.lead}>{ABOUT_INTRO}</Text>
        <Text style={styles.body}>{ABOUT_CREDITS}</Text>
        <Text style={styles.body}>{ABOUT_DISCLAIMER}</Text>
      </View>

      <View style={styles.bylineCard}>
        <Text style={styles.bylineLabel}>Credits</Text>
        <Text style={styles.byline}>{ABOUT_BYLINE}</Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        onPress={goBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Text style={styles.backButtonText}>Back</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  content: {
    paddingHorizontal: 16,
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xxl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    gap: 14,
    ...theme.shadow.glow,
  },

  lead: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 24,
  },

  body: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
  },

  bylineCard: {
    marginTop: 12,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 4,
  },

  bylineLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  byline: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
  },

  backButton: {
    marginTop: 16,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 15,
    alignItems: 'center',
  },

  backButtonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },

  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
})
