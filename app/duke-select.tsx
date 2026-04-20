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
import DukePicker from '../components/DukePicker'
import { cards } from '../data/cards'
import { cardImages } from '../data/cardImages'
import { theme } from '../constants/theme'

export default function DukeSelectScreen() {
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
    const q = query.trim().toLowerCase()
    if (!q) return dukeCards

    return dukeCards.filter((card) => card.name.toLowerCase().includes(q))
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
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {!selectedCard ? (
        <>
          <View style={styles.topBar}>
            <Text style={styles.title}>Dukes</Text>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{filteredDukes.length}</Text>
            </View>
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

  countPill: {
    minWidth: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: 'rgba(220, 203, 255, 0.12)',
    borderWidth: 1,
    borderColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

  countPillText: {
    color: theme.colors.accent,
    fontSize: 12,
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
    ...theme.shadow.glowStrong,
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
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },

  selectedLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  selectedName: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 14,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },

  secondaryButton: {
    flex: 1,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
  },

  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },

  primaryButton: {
    flex: 1,
    backgroundColor: theme.colors.accent,
    borderRadius: 18,
    paddingVertical: 14,
    ...theme.shadow.glow,
  },

  primaryButtonText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },

  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
})