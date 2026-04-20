import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Image,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { ScoreRow } from '../components/ScoreRow'
import DukePicker from '../components/DukePicker'
import { ScoreTotal } from '../components/ScoreTotal'
import { theme } from '../constants/theme'
import { cards, type DukeCard, type StatKey } from '../data/cards'
import { cardImages } from '../data/cardImages'
import { getStatsForCard, type StatMetaItem } from '../data/statMeta'
import {
  calculateTotalScore,
  createEmptyInputs,
  getRuleText,
  hasAnyInput,
  normalizeScoreInputs,
  type ScoreInputs,
} from '../lib/scoring'
import {
  loadMyExistingScore,
  saveMyScore,
} from '../lib/scores'
import { getActiveSessionId } from '../lib/sessions'
import { supabase } from '../lib/supabase'

function getSectionAccent(title: string) {
  switch (title) {
    case 'Resources':
      return {
        borderColor: '#6D5AE6',
        pillBg: 'rgba(109, 90, 230, 0.16)',
        glow: '#8B5CF6',
      }
    case 'Equipment':
      return {
        borderColor: '#E7C768',
        pillBg: 'rgba(231, 199, 104, 0.14)',
        glow: '#E7C768',
      }
    case 'Counts':
      return {
        borderColor: '#59B7FF',
        pillBg: 'rgba(89, 183, 255, 0.14)',
        glow: '#59B7FF',
      }
    case 'Points':
      return {
        borderColor: '#C084FC',
        pillBg: 'rgba(192, 132, 252, 0.14)',
        glow: '#C084FC',
      }
    default:
      return {
        borderColor: theme.colors.border,
        pillBg: 'rgba(255,255,255,0.04)',
        glow: '#8B5CF6',
      }
  }
}

export default function ScoreScreen() {
  const params = useLocalSearchParams<{
    selectedSlug?: string
    sessionId?: string
    joinCode?: string
    guestMode?: string
    guestName?: string
    guestEntryId?: string
    guestProfileId?: string
  }>()

  const isGuestMode = params.guestMode === '1'
  const guestName = typeof params.guestName === 'string' ? params.guestName : ''
  const guestEntryId = typeof params.guestEntryId === 'string' ? params.guestEntryId : ''
  const guestProfileId = typeof params.guestProfileId === 'string' ? params.guestProfileId : ''
  const joinCode = typeof params.joinCode === 'string' ? params.joinCode : ''

  const dukeCards = useMemo(
    () => (cards as DukeCard[]).filter((card) => card.slug !== '00_duke'),
    []
  )

  const initialSlug =
    typeof params.selectedSlug === 'string' ? params.selectedSlug : null

  const [selectedSlug, setSelectedSlug] = useState<string | null>(initialSlug)
  const [inputs, setInputs] = useState<ScoreInputs>(createEmptyInputs())
  const [saving, setSaving] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(true)
  const [isLocked, setIsLocked] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string>('')

  const selectedDuke = useMemo(() => {
    if (!selectedSlug) return null
    return dukeCards.find((card) => card.slug === selectedSlug) ?? null
  }, [dukeCards, selectedSlug])

  const visibleStats = useMemo(() => {
    if (!selectedDuke) return []
    return getStatsForCard(selectedDuke.multipliers)
  }, [selectedDuke])

  const groupedStats = useMemo(() => {
    return {
      resources: visibleStats.filter((item) => item.section === 'resources'),
      equipment: visibleStats.filter((item) => item.section === 'equipment'),
      counts: visibleStats.filter((item) => item.section === 'counts'),
      points: visibleStats.filter((item) => item.section === 'points'),
    }
  }, [visibleStats])

  const totalScore = useMemo(() => {
    if (!selectedDuke) return 0
    return calculateTotalScore(selectedDuke, inputs)
  }, [inputs, selectedDuke])

  const loadExistingScore = useCallback(async () => {
    try {
      const routeSessionId =
        typeof params.sessionId === 'string' ? params.sessionId : ''
      const storedSessionId = await getActiveSessionId()
      const sessionId = routeSessionId || storedSessionId || ''

      if (!sessionId) {
        setLoadingExisting(false)
        return
      }

      const existing = await loadMyExistingScore(sessionId, {
        guestMode: isGuestMode,
        guestProfileId: guestProfileId || null,
        guestEntryId: guestEntryId || null,
      })

      if (existing) {
        const normalized = normalizeScoreInputs(existing.inputs)
        const nextSlug =
          existing.duke_slug && dukeCards.some((d) => d.slug === existing.duke_slug)
            ? existing.duke_slug
            : initialSlug

        setSelectedSlug(nextSlug)
        setInputs(normalized)
        setLastSavedAt(existing.updated_at || '')
        setIsLocked(Boolean(existing.game_locked))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingExisting(false)
    }
  }, [
    dukeCards,
    guestEntryId,
    guestProfileId,
    initialSlug,
    isGuestMode,
    params.sessionId,
  ])

  useEffect(() => {
    loadExistingScore()
  }, [loadExistingScore])

  function updateInput(key: StatKey, value: number) {
    if (isLocked) return

    setInputs((current) => ({
      ...current,
      [key]: Math.max(0, Math.floor(value)),
    }))
  }

  function confirmReset() {
    if (isLocked) {
      Alert.alert('Game finished', 'This score is locked because the game has already been finished.')
      return
    }

    if (!hasAnyInput(inputs)) {
      setInputs(createEmptyInputs())
      return
    }

    Alert.alert(
      'Clear all inputs?',
      'This will reset every scoring value on the screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => setInputs(createEmptyInputs()),
        },
      ]
    )
  }

  async function handleSaveScore() {
    try {
      const routeSessionId =
        typeof params.sessionId === 'string' ? params.sessionId : ''
      const storedSessionId = await getActiveSessionId()
      const sessionId = routeSessionId || storedSessionId || ''

      if (!sessionId) {
        Alert.alert('Missing session', 'Start or join a session before scoring.')
        router.replace('/')
        return
      }

      if (!selectedDuke) {
        Alert.alert('Select a duke', 'Choose a duke before saving your score.')
        return
      }

      if (isLocked) {
        Alert.alert('Game finished', 'This score is already locked because the game was finished.')
        return
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      setSaving(true)

      let ownerUserId: string | null = null
      if (isGuestMode) {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          throw new Error('User not authenticated')
        }

        ownerUserId = user.id
      }

      await saveMyScore(sessionId, selectedDuke.slug, inputs, totalScore, {
        guestMode: isGuestMode,
        guestName: guestName || null,
        guestProfileId: guestProfileId || null,
        guestEntryId: guestEntryId || null,
        ownerUserId,
        lockScore: false,
        includedInStats: false,
      })

      const now = new Date().toISOString()
      setIsLocked(false)
      setLastSavedAt(now)

      router.replace({
        pathname: '/compare',
        params: {
          sessionId,
          joinCode,
        },
      })
    } catch (err: any) {
      Alert.alert('Save failed', err?.message ?? 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  function renderSection(title: string, items: StatMetaItem[]) {
    if (!items.length || !selectedDuke) return null

    const accent = getSectionAccent(title)

    return (
      <View
        style={[
          styles.sectionCard,
          {
            borderColor: accent.borderColor,
            shadowColor: accent.glow,
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <View
            style={[
              styles.sectionBadge,
              {
                backgroundColor: accent.pillBg,
                borderColor: accent.borderColor,
              },
            ]}
          >
            <Text style={styles.sectionBadgeText}>{items.length}</Text>
          </View>
        </View>

        <View style={styles.sectionRows}>
          {items.map((stat) => (
            <ScoreRow
              key={stat.key}
              label={stat.label}
              ruleText={getRuleText(stat.key, selectedDuke.multipliers[stat.key] ?? 0)}
              value={inputs[stat.key]}
              onChange={(value) => updateInput(stat.key, value)}
              icon={stat.icon}
              disabled={isLocked}
            />
          ))}
        </View>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topBar}>
        <View style={styles.headerCompact}>
          <Text style={styles.pageTitle}>{isGuestMode ? 'Guest Score' : 'Score'}</Text>
          <Text style={styles.pageSubtitle}>
            {isGuestMode && guestName ? guestName : 'Choose duke, enter values, then save'}
          </Text>
        </View>

        {joinCode ? (
          <View style={styles.joinPill}>
            <Text style={styles.joinPillLabel}>Code</Text>
            <Text style={styles.joinPillValue}>{joinCode}</Text>
          </View>
        ) : null}
      </View>

      {selectedDuke ? (
        <View style={styles.heroCard}>
          {cardImages[selectedDuke.slug] ? (
            <Image
              source={cardImages[selectedDuke.slug]}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : null}

          <View style={styles.heroOverlay}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroTitleWrap}>
                <Text style={styles.heroKicker}>
                  {isGuestMode ? 'Guest entry' : 'Score entry'}
                </Text>
                <Text style={styles.heroTitle}>{selectedDuke.name}</Text>
              </View>

              <View style={styles.heroMiniTotal}>
                <Text style={styles.heroMiniTotalLabel}>Live total</Text>
                <Text style={styles.heroMiniTotalValue}>{totalScore}</Text>
              </View>
            </View>

            <View style={styles.heroMetaRow}>
              <View style={styles.heroMetaChip}>
                <Text style={styles.heroMetaText}>{isLocked ? 'Locked' : 'Not Locked Yet'}</Text>
              </View>

              {lastSavedAt ? (
                <View style={styles.heroMetaChip}>
                  <Text style={styles.heroMetaText}>
                    Saved {new Date(lastSavedAt).toLocaleDateString()}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptyHero}>
          <Text style={styles.emptyHeroKicker}>Valeria score</Text>
          <Text style={styles.emptyHeroTitle}>Choose a Duke to Start</Text>
          <Text style={styles.emptyHeroText}>
            Pick your duke first, then the scoring rows will appear automatically.
          </Text>
        </View>
      )}

      {loadingExisting ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Loading saved score...</Text>
          <Text style={styles.statusText}>
            Checking whether this player already submitted a score.
          </Text>
        </View>
      ) : isLocked ? (
        <View style={styles.lockCard}>
          <View style={styles.lockHeader}>
            <View>
              <Text style={styles.lockTitle}>Game finished</Text>
              {lastSavedAt ? (
                <Text style={styles.lockMeta}>
                  Last saved: {new Date(lastSavedAt).toLocaleString()}
                </Text>
              ) : null}
            </View>

            <View style={styles.lockChip}>
              <Text style={styles.lockChipText}>Locked</Text>
            </View>
          </View>

          <View style={styles.lockButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryInlineButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() =>
                router.replace({
                  pathname: '/compare',
                  params: {
                    sessionId:
                      typeof params.sessionId === 'string' ? params.sessionId : '',
                    joinCode,
                  },
                })
              }
            >
              <Text style={styles.primaryInlineButtonText}>View Results</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View
        pointerEvents={isLocked ? 'none' : 'auto'}
        style={isLocked ? styles.lockedBlock : undefined}
      >
        {!selectedDuke ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Choose Duke</Text>
            </View>

            <DukePicker
              dukes={dukeCards.map((duke) => ({
                slug: duke.slug,
                name: duke.name,
              }))}
              selectedSlug={selectedSlug}
              onSelect={setSelectedSlug}
            />
          </View>
        ) : (
          <View style={styles.selectedDukeCard}>
            <View style={styles.selectedDukeTop}>
              <View style={styles.dukeThumbWrap}>
                {cardImages[selectedDuke.slug] ? (
                  <Image
                    source={cardImages[selectedDuke.slug]}
                    style={styles.dukeThumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.noImageState}>
                    <Text style={styles.noImageText}>No image</Text>
                  </View>
                )}
              </View>

              <View style={styles.selectedDukeMeta}>
                <Text style={styles.selectedLabel}>Selected duke</Text>
                <Text style={styles.selectedName}>{selectedDuke.name}</Text>
                <Text style={styles.selectedRuleHint}>
                  Only relevant scoring rows are shown for this duke.
                </Text>

                {!isLocked ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.changeDukeButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => setSelectedSlug(null)}
                  >
                    <Text style={styles.changeDukeButtonText}>Change Duke</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        )}

        {renderSection('Resources', groupedStats.resources)}
        {renderSection('Equipment', groupedStats.equipment)}
        {renderSection('Counts', groupedStats.counts)}
        {renderSection('Points', groupedStats.points)}
      </View>

      <View style={styles.totalShell}>
        <ScoreTotal
          total={totalScore}
          subtitle={selectedDuke ? selectedDuke.name : 'No duke selected'}
        />

        {!isLocked ? (
          <Pressable
            style={({ pressed }) => [
              styles.calculateButton,
              pressed && styles.buttonPressed,
              (saving || loadingExisting || !selectedDuke) && styles.buttonDisabled,
            ]}
            onPress={handleSaveScore}
            disabled={saving || loadingExisting || !selectedDuke}
          >
            <Text style={styles.calculateButtonText}>
              {!selectedDuke
                ? 'Select Duke'
                : saving
                ? 'Saving...'
                : isGuestMode
                ? 'Save Guest Score'
                : 'Save My Score'}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.lockedSummary}>
            <Text style={styles.lockedSummaryText}>
              This score is locked because the game has been finished.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.footerButtons}>
        <Pressable
          style={({ pressed }) => [styles.footerGhostButton, pressed && styles.buttonPressed]}
          onPress={confirmReset}
        >
          <Text style={styles.footerGhostButtonText}>Clear</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.footerGhostButton, pressed && styles.buttonPressed]}
          onPress={() => router.back()}
        >
          <Text style={styles.footerGhostButtonText}>Back</Text>
        </Pressable>
      </View>
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
    paddingBottom: 28,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    marginBottom: 12,
  },

  headerCompact: {
    flex: 1,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.xl ?? theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...theme.shadow.card,
  },

  pageTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 2,
  },

  pageSubtitle: {
    color: theme.colors.textMuted ?? '#B8A8D4',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },

  joinPill: {
    minWidth: 100,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.xl ?? theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: 'center',
    ...theme.shadow.card,
  },

  joinPillLabel: {
    color: theme.colors.textMuted ?? '#A99BC8',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },

  joinPillValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },

  heroCard: {
    height: 220,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: theme.colors.surfaceAlt,
    shadowColor: '#A78BFA',
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },

  heroImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },

  heroOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(8, 5, 18, 0.52)',
  },

  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  heroTitleWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'flex-end',
  },

  heroKicker: {
    color: '#E9DEFF',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },

  heroTitle: {
    color: '#FFF',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
  },

  heroMiniTotal: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(20, 15, 31, 0.86)',
    borderWidth: 1,
    borderColor: '#C4B5FD',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 92,
  },

  heroMiniTotalLabel: {
    color: '#D8CDED',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },

  heroMiniTotalValue: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'right',
  },

  heroMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  heroMetaChip: {
    backgroundColor: 'rgba(20, 15, 31, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  heroMetaText: {
    color: '#F3EEFF',
    fontSize: 11,
    fontWeight: '700',
  },

  emptyHero: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  emptyHeroKicker: {
    color: theme.colors.textMuted ?? '#B8A8D4',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },

  emptyHeroTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
  },

  emptyHeroText: {
    color: theme.colors.textSecondary ?? theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },

  statusCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 12,
  },

  statusTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },

  statusText: {
    color: theme.colors.textMuted ?? '#B8A8D4',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },

  lockCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    padding: 14,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  lockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },

  lockTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 4,
  },

  lockMeta: {
    color: theme.colors.textMuted ?? '#AA9FC8',
    fontSize: 11,
    fontWeight: '700',
  },

  lockChip: {
    backgroundColor: 'rgba(220, 203, 255, 0.12)',
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  lockChipText: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },

  lockButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },

  primaryInlineButton: {
    flex: 1,
    backgroundColor: theme.colors.accent,
    borderRadius: 16,
    paddingVertical: 12,
    ...theme.shadow.glow,
  },

  primaryInlineButtonText: {
    color: theme.colors.background,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },

  lockedBlock: {
    opacity: 0.55,
  },

  sectionCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 22,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
    ...theme.shadow.card,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  sectionTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
  },

  sectionBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  sectionBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
  },

  sectionRows: {
    gap: 8,
  },

  selectedDukeCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  selectedDukeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  dukeThumbWrap: {
    width: 108,
    height: 108,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundAlt,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    shadowColor: '#A78BFA',
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },

  dukeThumb: {
    width: '100%',
    height: '100%',
  },

  selectedDukeMeta: {
    flex: 1,
    minWidth: 0,
  },

  noImageState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundAlt,
  },

  noImageText: {
    color: theme.colors.textMuted ?? '#B8A8D4',
    fontSize: 12,
    fontWeight: '700',
  },

  selectedLabel: {
    color: theme.colors.textMuted ?? '#A99BC8',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 3,
  },

  selectedName: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
  },

  selectedRuleHint: {
    color: theme.colors.textSecondary ?? theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginBottom: 10,
  },

  changeDukeButton: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignSelf: 'stretch',
  },

  changeDukeButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },

  totalShell: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.border,
    padding: 12,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  calculateButton: {
    marginTop: 12,
    backgroundColor: theme.colors.accent,
    borderRadius: 18,
    paddingVertical: 15,
    ...theme.shadow.glow,
  },

  calculateButtonText: {
    color: theme.colors.background,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },

  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  lockedSummary: {
    marginTop: 10,
  },

  lockedSummaryText: {
    color: theme.colors.textMuted ?? '#B8A8D4',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },

  footerButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },

  footerGhostButton: {
    flex: 1,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  footerGhostButtonText: {
    color: theme.colors.textSecondary ?? theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
})