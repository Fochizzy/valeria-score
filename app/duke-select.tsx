import { useCallback, useMemo, useState } from 'react'
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
import { cards } from '../data/cards'
import { cardImages } from '../data/cardImages'
import { theme } from '../constants/theme'
import { copyJoinCodeWithFeedback } from '../lib/copy-join-code-client'
import { filterDukesByQuery } from '../lib/duke-search'
import { parseSoloSideRole } from '../lib/solo-mode'

const logo = require('../assets/Valeria_Only.png')

const portraitDukeSlugs = new Set([
  'cornelius_the_dreamer',
  'mulholland_the_brave',
  'sir_gustavo_the_wrathborn',
  'sir_roberts_of_stoneblood',
  'tsoukalos_the_conspirator',
])

export default function DukeSelectScreen() {
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{
    sessionId?: string
    joinCode?: string
    returnTo?: string
    soloRole?: string
    returnToken?: string
  }>()
  const currentJoinCode = typeof params.joinCode === 'string' ? params.joinCode : ''
  const returnTo = typeof params.returnTo === 'string' ? params.returnTo : ''
  const soloRole = parseSoloSideRole(params.soloRole)
  const returnToken = typeof params.returnToken === 'string' ? params.returnToken : ''

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
  const selectedPreviewIsPortrait = selectedCard ? portraitDukeSlugs.has(selectedCard.slug) : false
  const isSoloSelection = returnTo === '/solo-score' || Boolean(soloRole)
  const showJoinCode = Boolean(currentJoinCode) && !isSoloSelection
  const heroTitleText =
    soloRole === 'dark_lord'
      ? 'Pick the Dark Lord Duke'
      : soloRole === 'player'
        ? 'Pick Your Solo Duke'
        : 'Pick Your Duke'
  const handleCopyJoinCode = useCallback(async () => {
    await copyJoinCodeWithFeedback(currentJoinCode)
  }, [currentJoinCode])

  function handleUseDuke() {
    if (!selectedCard) return

    if (returnTo === '/solo-score' && soloRole) {
      router.replace({
        pathname: '/solo-score' as never,
        params: {
          selectedSlug: selectedCard.slug,
          soloRole,
          returnToken: returnToken || String(Date.now()),
        },
      })
      return
    }

    router.replace({
      pathname: '/score',
      params: {
        selectedSlug: selectedCard.slug,
        sessionId: typeof params.sessionId === 'string' ? params.sessionId : '',
        joinCode: typeof params.joinCode === 'string' ? params.joinCode : '',
      },
    })
  }

  const heroCard = (
    <View style={styles.heroCard}>
      <View style={styles.logoWrap}>
        <View style={styles.logoCrop}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </View>
      </View>
      {showJoinCode ? (
        <View style={styles.heroTitleRow}>
          <Text style={[styles.heroTitle, styles.heroTitleWithChip]}>{heroTitleText}</Text>
          <Pressable
            style={({ pressed }) => [
              styles.joinCodeChip,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => void handleCopyJoinCode()}
            accessibilityRole="button"
            accessibilityLabel={`Copy game code ${currentJoinCode}`}
            accessibilityHint="Copies the game code"
          >
            <Text style={styles.joinCodeLabel}>Game Code</Text>
            <Text style={styles.joinCodeValue}>{currentJoinCode}</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={styles.heroTitle}>{heroTitleText}</Text>
      )}
    </View>
  )

  if (selectedCard) {
    return (
      <View style={styles.screen}>
        <View
          style={[
            styles.content,
            styles.selectedContent,
            {
              paddingTop: insets.top + 6,
              paddingBottom: insets.bottom + 8,
            },
          ]}
        >
          {heroCard}

          <View style={styles.selectedCard}>
            <View
              style={[
                styles.selectedImageWrap,
                selectedPreviewIsPortrait && styles.selectedImageWrapPortrait,
              ]}
            >
              {cardImages[selectedCard.slug] ? (
                <Image
                  source={cardImages[selectedCard.slug]}
                  style={styles.selectedImage}
                  resizeMode={selectedPreviewIsPortrait ? 'contain' : 'cover'}
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
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleUseDuke}
              >
                <Text style={styles.primaryButtonText}>Use this Duke</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.ghostButton,
                  pressed && styles.ghostButtonPressed,
                ]}
                onPress={() => setSelectedSlug(null)}
              >
                <Text style={styles.ghostButtonText}>Change</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      {heroCard}

      <View style={styles.searchCard}>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Search dukes"
          placeholderTextColor={theme.colors.textMuted}
        />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
      </ScrollView>
    </View>
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

  selectedContent: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 8,
  },

  heroCard: {
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
  },

  heroTitleRow: {
    width: '100%',
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },

  logoWrap: {
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoCrop: {
    width: 196,
    maxWidth: '100%',
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  logo: {
    width: 196,
    height: 72,
  },

  heroTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: 10,
  },

  heroTitleWithChip: {
    flex: 1,
    textAlign: 'left',
    marginTop: 0,
    marginRight: 12,
  },

  joinCodeChip: {
    minWidth: 108,
    minHeight: 40,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.card,
  },

  joinCodeLabel: {
    color: theme.colors.textMuted,
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 1,
  },

  joinCodeValue: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },

  scrollArea: {
    flex: 1,
  },

  searchCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    marginHorizontal: 12,
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
    flex: 1,
    minHeight: 0,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
    padding: 10,
    ...theme.shadow.glow,
  },

  selectedImageWrap: {
    width: '100%',
    flex: 1,
    minHeight: 0,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundAlt,
    marginBottom: 10,
    justifyContent: 'center',
  },

  selectedImageWrapPortrait: {
    flex: 0,
    width: '74%',
    alignSelf: 'center',
    aspectRatio: 1061 / 1482,
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
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 2,
  },

  selectedName: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 10,
  },

  actionRow: {
    flexDirection: 'column',
    gap: 6,
    marginTop: 'auto',
  },

  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.glow,
  },

  primaryButtonText: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  ghostButton: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  ghostButtonText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },

  ghostButtonPressed: {
    opacity: 0.6,
  },

  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
})
