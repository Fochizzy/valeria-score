import { useMemo, useState } from 'react'
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import DukePicker from '../components/DukePicker'
import CountBadge from '../components/CountBadge'
import { cards } from '../data/cards'
import { cardImages } from '../data/cardImages'
import { theme } from '../constants/theme'
import { filterDukesByQuery } from '../lib/duke-search'

const logo = require('../assets/valeria_logo.png')

export default function DukeSelectScreen() {
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{
    sessionId?: string
    joinCode?: string
  }>()

  const [query, setQuery] = useState('')
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)

  const dukeCards = useMemo(() => {
    return cards.filter((card) => card.slug !== '00_duke')
  }, [])

  const filteredDukes = useMemo(() => {
    return filterDukesByQuery(dukeCards, query)
  }, [dukeCards, query])

  const selectedCard = useMemo(() => {
    if (!selectedSlug) return null
    return dukeCards.find((card) => card.slug === selectedSlug) ?? null
  }, [dukeCards, selectedSlug])

  function handleUseDuke() {
    if (!selectedCard) return

    router.replace({
      pathname: '/score',
      params: {
        selectedSlug: selectedCard.slug,
        sessionId: typeof params.sessionId === 'string' ? params.sessionId : '',
        joinCode: typeof params.joinCode === 'string' ? params.joinCode : '',
      },
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
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.heroCard}>
        <View style={styles.logoWrap}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </View>
        <Text style={styles.heroTitle}>Choose Duke</Text>
      </View>

      {!selectedCard ? (
        <>
          <View style={styles.topBar}>
            <Text style={styles.title}>Dukes</Text>
            <CountBadge value={filteredDukes.length} />
          </View>

          <View style={styles.searchCard}>
            <TextInput
              style={styles.search}
              value={query}
              onChangeText={setQuery}
              placeholder="Search dukes"
              placeholderTextColor={theme.colors.textMuted}
            />
          </View>

          <View style={styles.sectionCard}>
            <DukePicker
              dukes={filteredDukes.map((duke) => ({
                slug: duke.slug,
                name: duke.name,
              }))}
              selectedSlug={selectedSlug}
              onSelect={setSelectedSlug}
            />
          </View>
        </>
      ) : (
        <View style={styles.selectedCard}>
          <View style={styles.selectedImageWrap}>
            {cardImages[selectedCard.slug] ? (
              <Image
                source={cardImages[selectedCard.slug]}
                style={styles.selectedImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.noImageState}>
                <Text style={styles.noImageTitle}>Image Not Found</Text>
                <Text style={styles.noImageText}>{selectedCard.name}</Text>
              </View>
            )}
          </View>

          <Text style={styles.selectedLabel}>Selected Duke</Text>
          <Text style={styles.selectedName}>{selectedCard.name}</Text>

          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => setSelectedSlug(null)}
            >
              <Text style={styles.secondaryButtonText}>Change</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleUseDuke}
            >
              <Text style={styles.primaryButtonText}>Use Duke</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  content: {
    padding: 12,
    paddingBottom: 24,
  },

  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    ...theme.shadow.card,
  },

  logoWrap: {
    width: 180,
    height: 68,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logo: {
    width: '100%',
    height: '100%',
  },

  kicker: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },

  heroTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },

  heroSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 2,
  },

  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
  },

  searchCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    marginBottom: 10,
    ...theme.shadow.card,
  },

  search: {
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    fontWeight: '700',
  },

  sectionCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    ...theme.shadow.card,
  },

  selectedCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
    padding: 14,
    ...theme.shadow.glow,
  },

  selectedImageWrap: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundAlt,
    marginBottom: 14,
  },

  selectedImage: {
    width: '100%',
    height: '100%',
  },

  noImageState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  noImageTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },

  noImageText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '700',
  },

  selectedLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
  },

  selectedName: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 14,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },

  secondaryButton: {
    flex: 1,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },

  primaryButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.glow,
  },

  primaryButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },

  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
})
