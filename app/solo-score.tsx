import { useEffect, useMemo, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ScoreRow } from '../components/ScoreRow'
import ValeriaHeader from '../components/ValeriaHeader'
import { theme } from '../constants/theme'
import { cards, type DukeCard } from '../data/cards'
import { cardImages } from '../data/cardImages'
import { getStatsForCard } from '../data/statMeta'
import { Alert } from '../lib/themed-alert'
import { groupScoreScreenStats } from '../lib/score-stat-layout'
import {
  applySoloDukeSelection,
  buildSoloDraftFromResult,
  buildSoloWinnerBanner,
  createEmptySoloDraft,
  getSoloVictoryConditionCopy,
  isSoloStatVisibleForRole,
  normalizeSoloDraft,
  parseSoloSideRole,
  parseSoloVictoryCondition,
  resolveSoloOutcome,
  sanitizeSoloInputsForRole,
  SOLO_DRAFT_STORAGE_KEY,
  validateSoloGameSetup,
  type SoloDraft,
  type SoloSideRole,
} from '../lib/solo-mode'
import { getRuleText, calculateTotalScore } from '../lib/scoring'
import { loadSoloResultById, saveSoloGameResult } from '../lib/solo-stats'

const portraitDukeSlugs = new Set([
  'cornelius_the_dreamer',
  'mulholland_the_brave',
  'sir_gustavo_the_wrathborn',
  'sir_roberts_of_stoneblood',
  'tsoukalos_the_conspirator',
])

const sidePalette = {
  player: {
    ring: theme.colors.primary,
    soft: 'rgba(123, 92, 255, 0.16)',
    panel: 'rgba(45, 29, 87, 0.95)',
    highlight: 'rgba(123, 92, 255, 0.34)',
    button: theme.colors.primary,
  },
  dark_lord: {
    ring: '#E65B67',
    soft: 'rgba(230, 91, 103, 0.16)',
    panel: 'rgba(80, 28, 38, 0.95)',
    highlight: 'rgba(230, 91, 103, 0.34)',
    button: '#C43E4E',
  },
} as const

function findDukeBySlug(slug: string | null): DukeCard | null {
  if (!slug) return null
  return cards.find((card) => card.slug === slug) ?? null
}

function summarizeVictoryOutcomeText(draft: SoloDraft) {
  const playerInputs = sanitizeSoloInputsForRole('player', draft.player.inputs)
  const darkLordInputs = sanitizeSoloInputsForRole('dark_lord', draft.darkLord.inputs)

  if (!draft.victoryCondition) {
    return ''
  }

  const outcome = resolveSoloOutcome({
    victoryCondition: draft.victoryCondition,
    playerTotal: findDukeBySlug(draft.player.dukeSlug)
      ? calculateTotalScore(findDukeBySlug(draft.player.dukeSlug) as DukeCard, playerInputs)
      : 0,
    darkLordTotal: findDukeBySlug(draft.darkLord.dukeSlug)
      ? calculateTotalScore(findDukeBySlug(draft.darkLord.dukeSlug) as DukeCard, darkLordInputs)
      : 0,
  })

  if (outcome.resolution === 'player_auto') {
    return 'Automatic player victory. Scoring and duke selection are optional, but the result will not finalize until you save.'
  }

  if (outcome.resolution === 'dark_lord_auto') {
    return 'Automatic Dark Lord victory. Scoring and duke selection are optional, but the result will not finalize until you save.'
  }

  return 'Contested finish. Higher total wins, and ties count as Dark Lord victories.'
}

type SoloSideCardProps = {
  role: SoloSideRole
  title: string
  duke: DukeCard | null
  inputs: SoloDraft['player']['inputs']
  total: number
  scoringRequired: boolean
  previewWinner: boolean
  showWinnerRibbon: boolean
  onSelectDuke: () => void
  onLongPressDuke: () => void
  onChangeInput: (key: keyof SoloDraft['player']['inputs'], value: number) => void
}

function SoloSideCard({
  role,
  title,
  duke,
  inputs,
  total,
  scoringRequired,
  previewWinner,
  showWinnerRibbon,
  onSelectDuke,
  onLongPressDuke,
  onChangeInput,
}: SoloSideCardProps) {
  const palette = sidePalette[role]
  const scopedInputs = useMemo(() => sanitizeSoloInputsForRole(role, inputs), [inputs, role])
  const visibleStats = useMemo(
    () =>
      duke
        ? getStatsForCard(duke.multipliers).filter((stat) => isSoloStatVisibleForRole(role, stat.key))
        : [],
    [duke, role]
  )
  const groupedStats = useMemo(() => groupScoreScreenStats(visibleStats), [visibleStats])
  const imageSource = duke ? cardImages[duke.slug] : null
  const imagePortrait = duke ? portraitDukeSlugs.has(duke.slug) : false
  const winnerBanner = showWinnerRibbon ? buildSoloWinnerBanner(role === 'player' ? 'player' : 'dark_lord') : ''
  const groupedSections = [
    { title: 'Resources', items: groupedStats.resources },
    { title: 'Symbols', items: groupedStats.equipment },
    { title: 'Monster Symbols', items: groupedStats.monsterSymbols },
    { title: 'Counts', items: groupedStats.counts },
    { title: 'Points on Cards', items: groupedStats.points },
  ].filter((group) => group.items.length > 0)

  return (
    <View
      style={[
        styles.sideCard,
        {
          borderColor: palette.ring,
          backgroundColor: palette.panel,
        },
        previewWinner && styles.sideCardPreviewWinner,
        previewWinner && { shadowColor: palette.ring, shadowOpacity: 0.34, elevation: 10 },
      ]}
    >
      {showWinnerRibbon ? (
        <View style={[styles.winnerBanner, styles.winnerBannerWinner]}>
          <Text style={styles.winnerBannerText}>{winnerBanner}</Text>
        </View>
      ) : null}

      <View style={styles.sideHeader}>
        <View style={styles.sideHeaderCopy}>
          <Text style={styles.sideLabel}>{role === 'player' ? 'Solo Seat' : 'Opponent'}</Text>
          <Text style={styles.sideTitle}>{title}</Text>
          <Text style={styles.sideSubtitle}>
            {duke ? duke.name : role === 'player' ? 'No duke selected yet.' : 'No Dark Lord duke selected yet.'}
          </Text>
        </View>

        <View style={[styles.totalChip, { borderColor: palette.ring, backgroundColor: palette.soft }]}>
          <Text style={styles.totalChipLabel}>Total</Text>
          <Text style={styles.totalChipValue}>{total}</Text>
        </View>
      </View>

      <View style={styles.sideTopRow}>
        <Pressable
          style={[
            styles.dukePreviewCard,
            imagePortrait && styles.dukePreviewCardPortrait,
            { borderColor: palette.ring, backgroundColor: palette.soft },
          ]}
          onLongPress={duke ? onLongPressDuke : undefined}
          delayLongPress={350}
        >
          {imageSource ? (
            <Image source={imageSource} style={styles.dukePreviewImage} resizeMode="contain" />
          ) : (
            <View style={styles.dukePreviewFallback}>
              <Text style={styles.dukePreviewFallbackText}>Select Duke</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.sideActionColumn}>
          <Pressable
            style={({ pressed }) => [
              styles.sideButton,
              { backgroundColor: palette.button },
              pressed && styles.buttonPressed,
            ]}
            onPress={onSelectDuke}
          >
            <Text style={styles.sideButtonText}>
              {duke ? `Select ${role === 'player' ? 'Your' : 'Dark Lord'} Duke` : 'Select Duke'}
            </Text>
          </Pressable>

          <Text style={styles.longPressHint}>
            {duke
              ? 'Press and hold the duke portrait to change the selection.'
              : role === 'player'
              ? 'Choose the duke you played.'
              : 'Choose the duke assigned to the Dark Lord.'}
          </Text>
        </View>
      </View>

      {!duke ? (
        <View style={styles.emptyStateCard}>
          <Text style={styles.emptyStateTitle}>
            {scoringRequired ? 'Duke needed' : 'Duke optional'}
          </Text>
          <Text style={styles.emptyStateBody}>
            {scoringRequired
              ? role === 'player'
                ? 'Select your solo duke before ending the contested game.'
                : 'Select the Dark Lord duke before ending the contested game.'
              : role === 'player'
                ? 'You can save this automatic result without selecting the player duke.'
                : 'You can save this automatic result without selecting the Dark Lord duke.'}
          </Text>
        </View>
      ) : !scoringRequired ? (
        <View style={[styles.autoVictoryCard, { borderColor: palette.ring, backgroundColor: palette.soft }]}>
          <Text style={styles.autoVictoryTitle}>Automatic result</Text>
          <Text style={styles.autoVictoryBody}>
            This ending does not require scoring rows. The winner is decided now; save the game to lock the result.
          </Text>
        </View>
      ) : (
        groupedSections.map((group) => (
          <View key={group.title} style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              <Text style={styles.groupCount}>{group.items.length}</Text>
            </View>

            <View style={styles.groupRows}>
              {group.items.map((stat) => (
                <ScoreRow
                  key={`${role}-${stat.key}`}
                  label={stat.label}
                  ruleText={getRuleText(stat.key, duke.multipliers[stat.key] ?? 0)}
                  value={scopedInputs[stat.key]}
                  onChange={(value) => onChangeInput(stat.key, value)}
                  icon={stat.icon}
                />
              ))}
            </View>
          </View>
        ))
      )}
    </View>
  )
}

export default function SoloScoreScreen() {
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{
    selectedSlug?: string
    soloRole?: string
    selectedCondition?: string
    returnToken?: string
    fresh?: string
    soloGameId?: string
  }>()

  const selectedSlug = typeof params.selectedSlug === 'string' ? params.selectedSlug : ''
  const returnedRole = parseSoloSideRole(params.soloRole)
  const returnedCondition = parseSoloVictoryCondition(params.selectedCondition)
  const returnToken = typeof params.returnToken === 'string' ? params.returnToken : ''
  const fresh = params.fresh === '1'
  const soloGameId = typeof params.soloGameId === 'string' ? params.soloGameId : ''

  const [draft, setDraft] = useState<SoloDraft>(createEmptySoloDraft())
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [closing, setClosing] = useState(false)
  const handledReturnKeysRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false

    async function hydrateDraft() {
      try {
        if (fresh) {
          await AsyncStorage.removeItem(SOLO_DRAFT_STORAGE_KEY)
          if (!cancelled) {
            setDraft(createEmptySoloDraft())
          }
          return
        }

        const storedDraft = await AsyncStorage.getItem(SOLO_DRAFT_STORAGE_KEY)
        const parsed = storedDraft
          ? normalizeSoloDraft(JSON.parse(storedDraft))
          : createEmptySoloDraft()

        if (soloGameId) {
          const savedRow = await loadSoloResultById(soloGameId)
          if (cancelled) return

          if (!savedRow) {
            Alert.alert('Load failed', 'That saved solo game is no longer available.')
            router.replace('/manage-data' as never)
            setDraft(parsed)
            return
          }

          setDraft(buildSoloDraftFromResult(savedRow))
          return
        }

        if (cancelled) return
        setDraft(parsed)
      } catch {
        if (!cancelled) {
          setDraft(createEmptySoloDraft())
        }
      } finally {
        if (!cancelled) {
          setReady(true)
        }
      }
    }

    void hydrateDraft()

    return () => {
      cancelled = true
    }
  }, [fresh, soloGameId])

  useEffect(() => {
    if (!ready) return
    void AsyncStorage.setItem(SOLO_DRAFT_STORAGE_KEY, JSON.stringify(draft))
  }, [draft, ready])

  useEffect(() => {
    if (!ready || !returnToken) return

    if (selectedSlug && returnedRole) {
      const key = `${returnToken}:slug:${returnedRole}:${selectedSlug}`
      if (!handledReturnKeysRef.current.has(key)) {
        handledReturnKeysRef.current.add(key)
        setDraft((current) => applySoloDukeSelection(current, returnedRole, selectedSlug))
      }
    }

    if (returnedCondition) {
      const key = `${returnToken}:condition:${returnedCondition}`
      if (!handledReturnKeysRef.current.has(key)) {
        handledReturnKeysRef.current.add(key)
        setDraft((current) => ({
          ...current,
          victoryCondition: returnedCondition,
          savedGameId: current.savedGameId,
          savedWinner: null,
          savedAt: null,
        }))
      }
    }
  }, [ready, returnedCondition, returnedRole, returnToken, selectedSlug])

  const playerDuke = useMemo(() => findDukeBySlug(draft.player.dukeSlug), [draft.player.dukeSlug])
  const darkLordDuke = useMemo(() => findDukeBySlug(draft.darkLord.dukeSlug), [draft.darkLord.dukeSlug])
  const playerInputs = useMemo(
    () => sanitizeSoloInputsForRole('player', draft.player.inputs),
    [draft.player.inputs]
  )
  const darkLordInputs = useMemo(
    () => sanitizeSoloInputsForRole('dark_lord', draft.darkLord.inputs),
    [draft.darkLord.inputs]
  )

  const playerTotal = useMemo(
    () => (playerDuke ? calculateTotalScore(playerDuke, playerInputs) : 0),
    [playerDuke, playerInputs]
  )
  const darkLordTotal = useMemo(
    () => (darkLordDuke ? calculateTotalScore(darkLordDuke, darkLordInputs) : 0),
    [darkLordDuke, darkLordInputs]
  )

  const currentOutcome = useMemo(() => {
    if (!draft.victoryCondition) return null
    return resolveSoloOutcome({
      victoryCondition: draft.victoryCondition,
      playerTotal,
      darkLordTotal,
    })
  }, [darkLordTotal, draft.victoryCondition, playerTotal])

  const activeVictoryCopy = getSoloVictoryConditionCopy(draft.victoryCondition)
  const previewWinner = draft.savedWinner ?? currentOutcome?.winner ?? null
  const immediateWinnerRibbon = currentOutcome && !currentOutcome.requiresScoring ? currentOutcome.winner : null
  const scoringRequired = currentOutcome?.requiresScoring ?? false
  const summaryText = summarizeVictoryOutcomeText(draft)

  function markDraftDirty(updater: (current: SoloDraft) => SoloDraft) {
    setDraft((current) => {
      const next = updater(current)
      return {
        ...next,
        savedGameId: current.savedGameId,
        savedWinner: null,
        savedAt: null,
      }
    })
  }

  function updateSideInput(role: SoloSideRole, key: keyof SoloDraft['player']['inputs'], value: number) {
    markDraftDirty((current) => ({
      ...current,
      [role === 'player' ? 'player' : 'darkLord']: {
        ...(role === 'player' ? current.player : current.darkLord),
        inputs: {
          ...(role === 'player' ? current.player.inputs : current.darkLord.inputs),
          [key]: value,
        },
      },
    }))
  }

  async function persistDraftAndOpen(pathname: '/duke-select' | '/solo-victory-condition', role?: SoloSideRole) {
    const nextReturnToken = String(Date.now())
    await AsyncStorage.setItem(SOLO_DRAFT_STORAGE_KEY, JSON.stringify(draft))

    if (pathname === '/duke-select') {
      router.push({
        pathname: pathname as never,
        params: {
          returnTo: '/solo-score',
          soloRole: role,
          returnToken: nextReturnToken,
        },
      })
      return
    }

    router.push({
      pathname: pathname as never,
      params: {
        selectedCondition: draft.victoryCondition ?? '',
        returnToken: nextReturnToken,
      },
    })
  }

  async function handleEndGameAndSave() {
    const validation = {
      victoryCondition: draft.victoryCondition,
      playerDukeSlug: draft.player.dukeSlug,
      darkLordDukeSlug: draft.darkLord.dukeSlug,
    }

    if (!currentOutcome) {
      Alert.alert('Choose a victory condition', 'Pick how the solo game ended before saving it.')
      return
    }

    const { ok, reason } = validateSoloGameSetup(validation)
    if (!ok) {
      Alert.alert('Finish setup', reason)
      return
    }

    try {
      setSaving(true)
      const savedRow = await saveSoloGameResult({
        id: draft.savedGameId,
        playerDukeSlug: draft.player.dukeSlug ?? '',
        darkLordDukeSlug: draft.darkLord.dukeSlug ?? '',
        victoryCondition: draft.victoryCondition as NonNullable<SoloDraft['victoryCondition']>,
        winner: currentOutcome.winner,
        resolution: currentOutcome.resolution,
        playerTotal,
        darkLordTotal,
        playerInputs,
        darkLordInputs,
      })

      const nextDraft = {
        ...draft,
        savedGameId: savedRow.id,
        savedWinner: currentOutcome.winner,
        savedAt: savedRow.updatedAt ?? new Date().toISOString(),
      }

      setDraft(nextDraft)
      await AsyncStorage.setItem(SOLO_DRAFT_STORAGE_KEY, JSON.stringify(nextDraft))
      router.replace('/solo-stats' as never)
    } catch (err: any) {
      Alert.alert('Save failed', err?.message ?? 'Unable to save this solo result right now.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAndClose() {
    if (saving || closing || !ready) {
      return
    }

    try {
      setClosing(true)
      await AsyncStorage.setItem(SOLO_DRAFT_STORAGE_KEY, JSON.stringify(draft))
      router.replace('/create-session')
    } catch (err: any) {
      setClosing(false)
      Alert.alert('Save failed', err?.message ?? 'Unable to save your solo draft right now.')
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 28,
        },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <ValeriaHeader
        compact
        title="Solo Score"
        subtitle="Track the Player and Dark Lord on one split board."
      />

      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroLabel}>Solo Mode</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.conditionButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => {
              void persistDraftAndOpen('/solo-victory-condition')
            }}
          >
            <Text style={styles.conditionButtonText}>
              {draft.victoryCondition ? 'Change Victory Condition' : 'Select Victory Condition'}
            </Text>
          </Pressable>
        </View>

        {summaryText ? <Text style={styles.heroBody}>{summaryText}</Text> : null}

        {activeVictoryCopy ? (
          <View style={styles.conditionSummaryCard}>
            <Text style={styles.conditionSummaryLabel}>Current Finish</Text>
            <Text style={styles.conditionSummaryTitle}>{activeVictoryCopy.title}</Text>
            <Text style={styles.conditionSummaryText}>{activeVictoryCopy.description}</Text>
          </View>
        ) : null}
      </View>

      <SoloSideCard
        role="player"
        title="Player"
        duke={playerDuke}
        inputs={playerInputs}
        total={playerTotal}
        scoringRequired={scoringRequired}
        previewWinner={previewWinner === 'player'}
        showWinnerRibbon={draft.savedWinner === 'player' || immediateWinnerRibbon === 'player'}
        onSelectDuke={() => {
          void persistDraftAndOpen('/duke-select', 'player')
        }}
        onLongPressDuke={() => {
          void persistDraftAndOpen('/duke-select', 'player')
        }}
        onChangeInput={(key, value) => updateSideInput('player', key, value)}
      />

      <SoloSideCard
        role="dark_lord"
        title="Dark Lord"
        duke={darkLordDuke}
        inputs={darkLordInputs}
        total={darkLordTotal}
        scoringRequired={scoringRequired}
        previewWinner={previewWinner === 'dark_lord'}
        showWinnerRibbon={draft.savedWinner === 'dark_lord' || immediateWinnerRibbon === 'dark_lord'}
        onSelectDuke={() => {
          void persistDraftAndOpen('/duke-select', 'dark_lord')
        }}
        onLongPressDuke={() => {
          void persistDraftAndOpen('/duke-select', 'dark_lord')
        }}
        onChangeInput={(key, value) => updateSideInput('dark_lord', key, value)}
      />

      <View style={styles.boardTotalsCard}>
        <Text style={styles.boardTotalsTitle}>Board Totals</Text>

        <View style={styles.boardTotalsRow}>
          <View style={[styles.boardTotalPill, { borderColor: sidePalette.player.ring, backgroundColor: sidePalette.player.soft }]}>
            <Text style={styles.boardTotalLabel}>Player</Text>
            <Text style={styles.boardTotalValue}>{playerTotal}</Text>
          </View>

          <View style={[styles.boardTotalPill, { borderColor: sidePalette.dark_lord.ring, backgroundColor: sidePalette.dark_lord.soft }]}>
            <Text style={styles.boardTotalLabel}>Dark Lord</Text>
            <Text style={styles.boardTotalValue}>{darkLordTotal}</Text>
          </View>
        </View>

        <Text style={styles.boardTotalsHint}>
          {currentOutcome
            ? currentOutcome.requiresScoring
              ? `Current result: ${currentOutcome.winner === 'player' ? 'Player wins' : 'Dark Lord wins'}`
              : `Current result: ${currentOutcome.winner === 'player' ? 'Player automatic victory' : 'Dark Lord automatic victory'}`
            : 'Current result: waiting for a victory condition.'}
        </Text>
      </View>

      <View style={styles.footerActions}>
        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.buttonPressed,
            (saving || closing) && styles.saveButtonDisabled,
          ]}
          onPress={() => {
            void handleSaveAndClose()
          }}
          disabled={saving || closing || !ready}
        >
          <Text style={styles.secondaryButtonText}>{closing ? 'Saving Draft...' : 'Save and Close'}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.buttonPressed,
            (saving || closing) && styles.saveButtonDisabled,
          ]}
          onPress={() => {
            void handleEndGameAndSave()
          }}
          disabled={saving || closing || !ready}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving Solo Game...' : 'End Game and Save'}</Text>
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
    paddingHorizontal: 12,
  },

  heroCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 14,
    ...theme.shadow.card,
  },

  heroHeader: {
    gap: 12,
    marginBottom: 10,
  },

  heroCopy: {
    gap: 6,
  },

  heroLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  heroBody: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginBottom: 12,
  },

  conditionButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },

  conditionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },

  conditionSummaryCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },

  conditionSummaryLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 5,
  },

  conditionSummaryTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 6,
  },

  conditionSummaryText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },

  sideCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    ...theme.shadow.card,
  },

  sideCardPreviewWinner: {
    borderWidth: 2,
  },

  winnerBanner: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    alignItems: 'center',
  },

  winnerBannerWinner: {
    backgroundColor: theme.colors.gold,
    borderWidth: 1,
    borderColor: theme.colors.holy,
    shadowColor: theme.colors.gold,
    shadowOpacity: 0.38,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },

  winnerBannerText: {
    color: theme.colors.background,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  sideHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },

  sideHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },

  sideLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 4,
  },

  sideTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },

  sideSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },

  totalChip: {
    minWidth: 92,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },

  totalChipLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },

  totalChipValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },

  sideTopRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },

  dukePreviewCard: {
    width: 118,
    height: 164,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dukePreviewCardPortrait: {
    height: 176,
  },

  dukePreviewImage: {
    width: '100%',
    height: '100%',
  },

  dukePreviewFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

  dukePreviewFallbackText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },

  sideActionColumn: {
    flex: 1,
    gap: 10,
    justifyContent: 'center',
  },

  sideButton: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },

  sideButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },

  longPressHint: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },

  emptyStateCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },

  emptyStateTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },

  emptyStateBody: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },

  autoVictoryCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },

  autoVictoryTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },

  autoVictoryBody: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },

  groupCard: {
    backgroundColor: 'rgba(9, 12, 28, 0.42)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    marginBottom: 12,
  },

  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },

  groupTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  groupCount: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
  },

  groupRows: {
    gap: 10,
  },

  boardTotalsCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 14,
    ...theme.shadow.card,
  },

  boardTotalsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },

  boardTotalsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },

  boardTotalPill: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },

  boardTotalLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },

  boardTotalValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },

  boardTotalsHint: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },

  footerActions: {
    gap: 10,
  },

  secondaryButton: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },

  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: 'center',
    ...theme.shadow.glow,
  },

  saveButtonDisabled: {
    opacity: 0.78,
  },

  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },

  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
})
