import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AppState,
  type LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  Image,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router, useLocalSearchParams } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { ScoreRow } from '../components/ScoreRow'
import DukePicker from '../components/DukePicker'
import { ScoreTotal } from '../components/ScoreTotal'
import CountBadge from '../components/CountBadge'
import SessionContextStrip from '../components/SessionContextStrip'
import { theme } from '../constants/theme'
import { cards, type DukeCard, type StatKey } from '../data/cards'
import { cardImages } from '../data/cardImages'
import { Alert } from '../lib/themed-alert'
import { getStatsForCard, type StatMetaItem } from '../data/statMeta'
import {
  calculateTotalScore,
  createEmptyInputs,
  getRuleText,
  hasAnyInput,
  normalizeScoreInputs,
  type ScoreInputs,
} from '../lib/scoring'
import { groupScoreScreenStats } from '../lib/score-stat-layout'
import { getScoreSectionHeaderMeta } from '../lib/score-section-header'
import {
  loadSessionLockState,
  loadMyExistingScore,
  loadSessionScoreRevision,
  saveMyScoreCommit,
  saveMyScoreDraft,
} from '../lib/scores'
import {
  areScoreInputsEqual,
  buildScoreDraftStorageKey,
  hasUnsavedScoreChanges,
  isSessionFinished,
  parseStoredScoreDraft,
  resolveScoreActionVisibility,
  resolveLoadedScoreState,
  resolveScoreSessionId,
  resolveScoreScrollResetTarget,
  shouldAutoSaveScoreProgress,
  shouldRefreshScoreLockOnForeground,
  shouldAutoRouteScoreToVictory,
  shouldResetScoreScrollOnDukeSelection,
} from '../lib/score-screen-state'
import { copyJoinCodeWithFeedback } from '../lib/copy-join-code-client'
import {
  buildScoreSaveFeedback,
  sessionUiCopy,
} from '../lib/p3-feedback'
import { buildBottomNavRoute } from '../lib/bottom-nav-route'
import { performSafeBackNavigation } from '../lib/back-navigation'
import { filterDukesByQuery } from '../lib/duke-search'
import {
  shouldAutoRouteToVictoryOnLock,
  subscribeToSessionActivity,
  subscribeToSessionScores,
} from '../lib/realtime'
import {
  clearActiveSessionState,
  doesSessionExist,
  getActiveSessionId,
} from '../lib/sessions'
import { supabase } from '../lib/supabase'
import { buildVictoryRoute } from '../lib/victory-route'
import { didAppBecomeActive } from '../lib/app-state-refresh'
import {
  getTrackedPreviousRoute,
  markTrackedBackNavigation,
} from '../lib/route-history'

const portraitDukeSlugs = new Set([
  'cornelius_the_dreamer',
  'mulholland_the_brave',
  'sir_gustavo_the_wrathborn',
  'sir_roberts_of_stoneblood',
  'tsoukalos_the_conspirator',
])

type ScoreSaveActorIds = {
  ownerUserId: string | null
  scoredByUserId: string | null
}

type ScoreAutosaveSnapshot = {
  sessionId: string
  selectedSlug: string | null
  inputs: ScoreInputs
  totalScore: number
  shouldAutoSave: boolean
}

function getSectionAccent(title: string) {
  switch (title) {
    case 'Resources':
      return {
        borderColor: '#6D5AE6',
        pillBg: 'rgba(109, 90, 230, 0.16)',
        glow: '#8B5CF6',
      }
    case 'Symbols':
      return {
        borderColor: '#E7C768',
        pillBg: 'rgba(231, 199, 104, 0.14)',
        glow: '#E7C768',
      }
    case 'Monster Symbols':
      return {
        borderColor: '#F59E0B',
        pillBg: 'rgba(245, 158, 11, 0.16)',
        glow: '#F59E0B',
      }
    case 'Counts':
      return {
        borderColor: '#59B7FF',
        pillBg: 'rgba(89, 183, 255, 0.14)',
        glow: '#59B7FF',
      }
    case 'Points on Cards':
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
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{
    selectedSlug?: string
    sessionId?: string
    joinCode?: string
    guestMode?: string
    guestName?: string
    guestEntryId?: string
    guestProfileId?: string
    // Phase 3: scoring on behalf of an added registered player. The
    // adder's auth.uid() lands as scored_by_user_id; addedUserId becomes
    // owner_user_id (the linked player's profile).
    addedUserId?: string
    addedPlayerName?: string
    addedPlayerId?: string
  }>()

  const routeSessionId =
    typeof params.sessionId === 'string' ? params.sessionId : ''

  const isGuestMode = params.guestMode === '1'
  const guestName = typeof params.guestName === 'string' ? params.guestName : ''
  const guestEntryId = typeof params.guestEntryId === 'string' ? params.guestEntryId : ''
  const guestProfileId = typeof params.guestProfileId === 'string' ? params.guestProfileId : ''
  const joinCode = typeof params.joinCode === 'string' ? params.joinCode : ''
  const addedUserId =
    typeof params.addedUserId === 'string' ? params.addedUserId : ''
  const addedPlayerName =
    typeof params.addedPlayerName === 'string' ? params.addedPlayerName : ''
  const isAddedPlayerMode = !isGuestMode && Boolean(addedUserId)

  const dukeCards = useMemo(
    () => (cards as DukeCard[]).filter((card) => card.slug !== '00_duke'),
    []
  )

  const initialSlug =
    typeof params.selectedSlug === 'string' ? params.selectedSlug : null

  const [selectedSlug, setSelectedSlug] = useState<string | null>(initialSlug)
  const [dukeQuery, setDukeQuery] = useState('')
  const [inputs, setInputs] = useState<ScoreInputs>(createEmptyInputs())
  const [baselineSlug, setBaselineSlug] = useState<string | null>(initialSlug)
  const [baselineInputs, setBaselineInputs] = useState<ScoreInputs>(createEmptyInputs())
  const [draftBaselineSlug, setDraftBaselineSlug] = useState<string | null>(initialSlug)
  const [draftBaselineInputs, setDraftBaselineInputs] = useState<ScoreInputs>(
    createEmptyInputs()
  )
  const [effectiveSessionId, setEffectiveSessionId] = useState<string>(
    routeSessionId || ''
  )
  const [saving, setSaving] = useState(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [resolvingSession, setResolvingSession] = useState(true)
  const [loadingExisting, setLoadingExisting] = useState(true)
  const [loadError, setLoadError] = useState<string>('')
  const [isLocked, setIsLocked] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string>('')
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<string>('')
  const [isSubmittedLock, setIsSubmittedLock] = useState(false)
  const [canSyncDraftToSupabase, setCanSyncDraftToSupabase] = useState(
    isGuestMode || isAddedPlayerMode
  )
  const [saveFeedback, setSaveFeedback] = useState<{
    title: string
    body: string
    actionLabel: string
  } | null>(null)
  const scoreScrollViewRef = useRef<ScrollView | null>(null)
  const loadRequestIdRef = useRef(0)
  const pendingScrollResetRef = useRef(false)
  const scrollResetFrameRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null)
  const previousLockStateRef = useRef<boolean | null>(null)
  const autoRoutedToVictoryRef = useRef(false)
  const didFocusRefreshRef = useRef(false)
  const appStateRef = useRef(AppState.currentState)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoSavePromiseRef = useRef<Promise<void> | null>(null)
  const pendingAutoSaveRef = useRef(false)
  const latestAutoSaveSnapshotRef = useRef<ScoreAutosaveSnapshot | null>(null)

  const selectedDuke = useMemo(() => {
    if (!selectedSlug) return null
    return dukeCards.find((card) => card.slug === selectedSlug) ?? null
  }, [dukeCards, selectedSlug])
  const selectedDukeThumbIsPortrait = selectedDuke ? portraitDukeSlugs.has(selectedDuke.slug) : false

  const filteredDukeCards = useMemo(() => {
    return filterDukesByQuery(dukeCards, dukeQuery)
  }, [dukeCards, dukeQuery])

  const visibleStats = useMemo(() => {
    if (!selectedDuke) return []
    return getStatsForCard(selectedDuke.multipliers)
  }, [selectedDuke])

  const groupedStats = useMemo(() => {
    return groupScoreScreenStats(visibleStats)
  }, [visibleStats])

  const totalScore = useMemo(() => {
    if (!selectedDuke) return 0
    return calculateTotalScore(selectedDuke, inputs)
  }, [inputs, selectedDuke])

  const scoreActionVisibility = useMemo(
    () => resolveScoreActionVisibility(selectedSlug),
    [selectedSlug]
  )

  const isDirty = useMemo(() => {
    return hasUnsavedScoreChanges({
      selectedSlug,
      baselineSlug,
      inputs,
      baselineInputs,
    })
  }, [baselineInputs, baselineSlug, inputs, selectedSlug])

  const hasUnsavedDraftChanges = useMemo(() => {
    return hasUnsavedScoreChanges({
      selectedSlug,
      baselineSlug: draftBaselineSlug,
      inputs,
      baselineInputs: draftBaselineInputs,
    })
  }, [draftBaselineInputs, draftBaselineSlug, inputs, selectedSlug])

  const draftStorageKey = useMemo(
    () =>
      buildScoreDraftStorageKey({
        sessionId: effectiveSessionId || routeSessionId,
        guestMode: isGuestMode,
        guestProfileId: guestProfileId || null,
        guestEntryId: guestEntryId || null,
        addedUserId: isAddedPlayerMode ? addedUserId : null,
      }),
    [
      addedUserId,
      effectiveSessionId,
      guestEntryId,
      guestProfileId,
      isAddedPlayerMode,
      isGuestMode,
      routeSessionId,
    ]
  )

  const isWorking = resolvingSession || loadingExisting || saving
  const isInteractionBlocked =
    isLocked ||
    isSubmittedLock ||
    isWorking ||
    Boolean(loadError) ||
    !effectiveSessionId

  const loadExistingScore = useCallback(async () => {
    const requestId = loadRequestIdRef.current + 1
    loadRequestIdRef.current = requestId

    setResolvingSession(true)
    setLoadingExisting(true)
    setLoadError('')
    setSaveFeedback(null)

    try {
      const storedSessionId = await getActiveSessionId()

      if (loadRequestIdRef.current !== requestId) {
        return
      }

      const nextSessionId = resolveScoreSessionId(routeSessionId, storedSessionId)

      setEffectiveSessionId(nextSessionId)

      if (!nextSessionId) {
        const empty = createEmptyInputs()

        setSelectedSlug(initialSlug)
        setInputs(empty)
        setBaselineSlug(initialSlug)
        setBaselineInputs(empty)
        setDraftBaselineSlug(initialSlug)
        setDraftBaselineInputs(empty)
        setLastSavedAt('')
        setLastDraftSavedAt('')
        setCanSyncDraftToSupabase(isGuestMode || isAddedPlayerMode)
        setIsLocked(false)
        return
        }

        // Defensive: if the locally-saved session id no longer points at a
        // row in game_sessions, wipe the local active state and send the
        // user back to /create-session instead of trying to score against
        // a dead session.
        const sessionStillLive = await doesSessionExist(nextSessionId)
        if (!sessionStillLive) {
          await clearActiveSessionState()
          if (loadRequestIdRef.current !== requestId) return
          Alert.alert(
            'Session has ended',
            'That session is no longer available. Start or join a new one to keep scoring.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/create-session'),
              },
            ]
          )
          return
        }

        const nextDraftStorageKey = buildScoreDraftStorageKey({
          sessionId: nextSessionId,
          guestMode: isGuestMode,
          guestProfileId: guestProfileId || null,
          guestEntryId: guestEntryId || null,
          addedUserId: isAddedPlayerMode ? addedUserId : null,
        })

        const [existing, sessionLockState, sessionScoreRevision, storedDraft] = await Promise.all([
          loadMyExistingScore(nextSessionId, {
            guestMode: isGuestMode,
            guestProfileId: guestProfileId || null,
            guestEntryId: guestEntryId || null,
            addedUserId: isAddedPlayerMode ? addedUserId : null,
          }),
          loadSessionLockState(nextSessionId),
          loadSessionScoreRevision(nextSessionId),
          nextDraftStorageKey
            ? AsyncStorage.getItem(nextDraftStorageKey)
            : Promise.resolve(null),
        ])

        if (loadRequestIdRef.current !== requestId) {
          return
        }

        const parsedLocalDraft = parseStoredScoreDraft(storedDraft)
        const normalizedExisting = existing
          ? {
              selectedSlug:
                existing.duke_slug && dukeCards.some((d) => d.slug === existing.duke_slug)
                  ? existing.duke_slug
                  : initialSlug,
              inputs: normalizeScoreInputs(existing.inputs),
              updatedAt: existing.updated_at || '',
              isLocked: Boolean(existing.game_locked),
              confirmedForCurrentRevision:
                Boolean(existing.game_locked) ||
                Number(existing.confirmed_revision ?? 0) === sessionScoreRevision,
            }
          : null
        const remoteDraft =
          existing?.draft_updated_at || existing?.draft_duke_slug
            ? {
                selectedSlug: existing?.draft_duke_slug ?? null,
                inputs: normalizeScoreInputs(existing?.draft_inputs ?? {}),
                updatedAt: existing?.draft_updated_at ?? '',
              }
            : null
        const resolvedState = resolveLoadedScoreState({
          initialSlug,
          existingScore: normalizedExisting,
          remoteDraft,
          localDraft: parsedLocalDraft,
          sessionFinished: isSessionFinished(
            sessionLockState.totalEntries,
            sessionLockState.lockedEntries
          ),
        })

        setSelectedSlug(resolvedState.selectedSlug)
        setInputs(resolvedState.inputs)
        setBaselineSlug(resolvedState.committedBaselineSlug)
        setBaselineInputs(resolvedState.committedBaselineInputs)
        setDraftBaselineSlug(resolvedState.draftBaselineSlug)
        setDraftBaselineInputs(resolvedState.draftBaselineInputs)
        setLastSavedAt(resolvedState.lastCommittedAt)
        setLastDraftSavedAt(resolvedState.lastDraftSavedAt)
        setCanSyncDraftToSupabase(Boolean(existing) || isGuestMode || isAddedPlayerMode)
        setIsLocked(resolvedState.isLocked)
        setIsSubmittedLock(Boolean(resolvedState.lastCommittedAt) && !resolvedState.isLocked)

        if (nextDraftStorageKey && resolvedState.isLocked) {
          void AsyncStorage.removeItem(nextDraftStorageKey).catch((error) => {
            console.error('Failed to clear score draft after load.', error)
          })
        }
      } catch (err: any) {
        if (loadRequestIdRef.current !== requestId) {
        return
      }

      console.error(err)
      setLoadError(err?.message ?? 'Failed to load the saved score.')
    } finally {
      if (loadRequestIdRef.current === requestId) {
        setResolvingSession(false)
        setLoadingExisting(false)
      }
    }
  }, [
    addedUserId,
    dukeCards,
    guestEntryId,
    guestProfileId,
    initialSlug,
    isAddedPlayerMode,
    isGuestMode,
    routeSessionId,
  ])

  useEffect(() => {
    void loadExistingScore()
  }, [loadExistingScore])

  useEffect(() => {
    previousLockStateRef.current = null
    autoRoutedToVictoryRef.current = false
    didFocusRefreshRef.current = false
  }, [effectiveSessionId])

  useFocusEffect(
    useCallback(() => {
      if (!effectiveSessionId) {
        return
      }

      if (!didFocusRefreshRef.current) {
        didFocusRefreshRef.current = true
        return
      }

      void loadExistingScore()
    }, [effectiveSessionId, loadExistingScore])
  )

  const refreshScoreLockIfFinished = useCallback(async (errorContext: string) => {
    if (!effectiveSessionId) {
      return
    }

    try {
      const sessionLockState = await loadSessionLockState(effectiveSessionId)

      if (
        !shouldRefreshScoreLockOnForeground({
          sessionId: effectiveSessionId,
          isLocked,
          totalEntries: sessionLockState.totalEntries,
          lockedEntries: sessionLockState.lockedEntries,
        })
      ) {
        return
      }

      await loadExistingScore()
    } catch (error) {
      console.error(`Failed to refresh score lock state after ${errorContext}.`, error)
    }
  }, [effectiveSessionId, isLocked, loadExistingScore])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (didAppBecomeActive(appStateRef.current, nextState)) {
        void refreshScoreLockIfFinished('app foreground')
      }

      appStateRef.current = nextState
    })

    return () => {
      subscription.remove()
    }
  }, [refreshScoreLockIfFinished])

  useEffect(() => {
    if (!effectiveSessionId) {
      return
    }

    const unsubscribe = subscribeToSessionActivity(effectiveSessionId, () => {
      void refreshScoreLockIfFinished('session activity')
    })

    return unsubscribe
  }, [effectiveSessionId, refreshScoreLockIfFinished])

  useEffect(() => {
    if (!effectiveSessionId) {
      return
    }

    return subscribeToSessionScores(effectiveSessionId, (payload) => {
      if (
        !shouldAutoRouteToVictoryOnLock({
          sessionId: effectiveSessionId,
          payload,
          alreadyRouted: autoRoutedToVictoryRef.current,
        })
      ) {
        return
      }

      autoRoutedToVictoryRef.current = true
      router.replace(buildVictoryRoute(effectiveSessionId, joinCode) as never)
    })
  }, [effectiveSessionId, joinCode])

  useEffect(() => {
    if (!draftStorageKey || resolvingSession || loadingExisting) {
      return
    }

    let cancelled = false

    void (async () => {
      try {
        if (isLocked || !selectedSlug || !hasUnsavedDraftChanges) {
          await AsyncStorage.removeItem(draftStorageKey)
          return
        }

        await AsyncStorage.setItem(
          draftStorageKey,
          JSON.stringify({
            selectedSlug,
            inputs,
            updatedAt: new Date().toISOString(),
          })
        )
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to persist score draft.', error)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    draftStorageKey,
    hasUnsavedDraftChanges,
    inputs,
    isLocked,
    loadingExisting,
    resolvingSession,
    selectedSlug,
  ])

  useEffect(() => {
    return () => {
      loadRequestIdRef.current += 1
    }
  }, [])

  useEffect(() => {
    if (!effectiveSessionId) {
      previousLockStateRef.current = null
      autoRoutedToVictoryRef.current = false
      return
    }

    const shouldRoute = shouldAutoRouteScoreToVictory({
      sessionId: effectiveSessionId,
      isLocked,
      wasLocked: previousLockStateRef.current,
      alreadyRouted: autoRoutedToVictoryRef.current,
    })

    previousLockStateRef.current = isLocked

    if (!shouldRoute) {
      return
    }

    autoRoutedToVictoryRef.current = true
    router.replace(buildVictoryRoute(effectiveSessionId, joinCode) as never)
  }, [effectiveSessionId, isLocked, joinCode])

  const clearScoreDraft = useCallback(async () => {
    if (!draftStorageKey) {
      return
    }

    try {
      await AsyncStorage.removeItem(draftStorageKey)
    } catch (error) {
      console.error('Failed to clear score draft.', error)
    }
  }, [draftStorageKey])

  const resolveSaveActorIds = useCallback(async (): Promise<ScoreSaveActorIds> => {
    if (!isGuestMode && !isAddedPlayerMode) {
      return {
        ownerUserId: null,
        scoredByUserId: null,
      }
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error('User not authenticated')
    }

    if (isAddedPlayerMode) {
      return {
        ownerUserId: addedUserId,
        scoredByUserId: user.id,
      }
    }

    return {
      ownerUserId: user.id,
      scoredByUserId: null,
    }
  }, [addedUserId, isAddedPlayerMode, isGuestMode])

  const persistDraftSnapshot = useCallback(
    async (snapshot: {
      sessionId: string
      dukeSlug: string
      inputs: ScoreInputs
      totalScore: number
    }) => {
      const { ownerUserId, scoredByUserId } = await resolveSaveActorIds()

      return saveMyScoreDraft(
        snapshot.sessionId,
        snapshot.dukeSlug,
        snapshot.inputs,
        snapshot.totalScore,
        {
          guestMode: isGuestMode,
          guestName: guestName || null,
          guestProfileId: guestProfileId || null,
          guestEntryId: guestEntryId || null,
          ownerUserId,
          scoredByUserId,
          addedPlayerName: isAddedPlayerMode ? addedPlayerName || null : null,
          lockScore: false,
          includedInStats: false,
        }
      )
    },
    [
      addedPlayerName,
      guestEntryId,
      guestName,
      guestProfileId,
      isAddedPlayerMode,
      isGuestMode,
      resolveSaveActorIds,
    ]
  )

  const persistCommittedSnapshot = useCallback(
    async (snapshot: {
      sessionId: string
      dukeSlug: string
      inputs: ScoreInputs
      totalScore: number
    }) => {
      const { ownerUserId, scoredByUserId } = await resolveSaveActorIds()

      return saveMyScoreCommit(
        snapshot.sessionId,
        snapshot.dukeSlug,
        snapshot.inputs,
        snapshot.totalScore,
        {
          guestMode: isGuestMode,
          guestName: guestName || null,
          guestProfileId: guestProfileId || null,
          guestEntryId: guestEntryId || null,
          ownerUserId,
          scoredByUserId,
          addedPlayerName: isAddedPlayerMode ? addedPlayerName || null : null,
          lockScore: false,
          includedInStats: false,
        }
      )
    },
    [
      addedPlayerName,
      guestEntryId,
      guestName,
      guestProfileId,
      isAddedPlayerMode,
      isGuestMode,
      resolveSaveActorIds,
    ]
  )

  const clearPendingAutoSaveTimer = useCallback(() => {
    if (autoSaveTimerRef.current !== null) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }
  }, [])

  const runAutoSave = useCallback(async () => {
    const snapshot = latestAutoSaveSnapshotRef.current

    if (!snapshot?.shouldAutoSave || !snapshot.selectedSlug) {
      return
    }

    const safeSelectedSlug = snapshot.selectedSlug

    if (autoSavePromiseRef.current) {
      pendingAutoSaveRef.current = true
      return autoSavePromiseRef.current
    }

    const autoSavePromise = (async () => {
      setIsAutoSaving(true)

      try {
        const savedRow = await persistDraftSnapshot({
          sessionId: snapshot.sessionId,
          dukeSlug: safeSelectedSlug,
          inputs: snapshot.inputs,
          totalScore: snapshot.totalScore,
        })

        const savedAt =
          typeof savedRow?.draft_updated_at === 'string' && savedRow.draft_updated_at
            ? savedRow.draft_updated_at
            : new Date().toISOString()

        setLastDraftSavedAt(savedAt)
        setDraftBaselineSlug(safeSelectedSlug)
        setDraftBaselineInputs(snapshot.inputs)
      } catch (error) {
        console.error('Failed to auto-save score progress.', error)
      } finally {
        setIsAutoSaving(false)
        autoSavePromiseRef.current = null

        const latestSnapshot = latestAutoSaveSnapshotRef.current
        const needsAnotherPass =
          pendingAutoSaveRef.current ||
          (latestSnapshot?.shouldAutoSave === true &&
            latestSnapshot.selectedSlug !== null &&
            (latestSnapshot.selectedSlug !== snapshot.selectedSlug ||
              !areScoreInputsEqual(latestSnapshot.inputs, snapshot.inputs)))

        pendingAutoSaveRef.current = false

        if (needsAnotherPass) {
          void runAutoSave()
        }
      }
    })()

    autoSavePromiseRef.current = autoSavePromise
    return autoSavePromise
  }, [persistDraftSnapshot])

  function updateInput(key: StatKey, value: number) {
    if (isInteractionBlocked) return

    if (saveFeedback) {
      setSaveFeedback(null)
    }

    setInputs((current) => ({
      ...current,
      [key]: Math.max(0, Math.floor(value)),
    }))
  }

  const shouldAutoSaveProgress = useMemo(
    () =>
      canSyncDraftToSupabase &&
      shouldAutoSaveScoreProgress({
        sessionId: effectiveSessionId,
        selectedSlug,
        isDirty: hasUnsavedDraftChanges,
        isLocked,
        resolvingSession,
        loadingExisting,
        isSavingManually: saving,
        hasLoadError: Boolean(loadError),
      }),
    [
      canSyncDraftToSupabase,
      effectiveSessionId,
      hasUnsavedDraftChanges,
      isLocked,
      loadError,
      loadingExisting,
      resolvingSession,
      saving,
      selectedSlug,
    ]
  )

  useEffect(() => {
    latestAutoSaveSnapshotRef.current = {
      sessionId: effectiveSessionId,
      selectedSlug,
      inputs: normalizeScoreInputs(inputs),
      totalScore,
      shouldAutoSave: shouldAutoSaveProgress,
    }
  }, [effectiveSessionId, inputs, selectedSlug, shouldAutoSaveProgress, totalScore])

  useEffect(() => {
    clearPendingAutoSaveTimer()

    if (!shouldAutoSaveProgress) {
      pendingAutoSaveRef.current = false
      return
    }

    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null
      void runAutoSave()
    }, 800)

    return clearPendingAutoSaveTimer
  }, [
    clearPendingAutoSaveTimer,
    inputs,
    runAutoSave,
    selectedSlug,
    shouldAutoSaveProgress,
    totalScore,
  ])

  function confirmLeaveIfNeeded(action: () => void) {
    if (saving) {
      return
    }

    if (!hasUnsavedDraftChanges || isLocked) {
      action()
      return
    }

    Alert.alert(
      'Discard unsynced changes?',
      'You have draft changes on this screen that have not finished syncing yet.',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            void clearScoreDraft().finally(action)
          },
        },
      ]
    )
  }

  function openCompare(replace = false) {
    if (!effectiveSessionId) {
      Alert.alert('Missing session', 'Start or join a session before continuing.')
      return
    }

      const target = buildBottomNavRoute('/compare', {
        sessionId: effectiveSessionId,
        joinCode,
        selectedSlug,
        guestMode: isGuestMode ? '1' : '',
        guestName: guestName || '',
        guestProfileId: guestProfileId || '',
        guestEntryId: guestEntryId || '',
      })

      if (replace) {
        router.replace(target)
        return
    }

    router.push(target)
  }

  const copyJoinCode = useCallback(async () => {
    await copyJoinCodeWithFeedback(joinCode)
  }, [joinCode])

  // Saved status moved to a chip beside the page title — see the title-row
  // render below — so the strip only carries Join Code / Entry / State now.
  const contextItems = useMemo(
    () => {
      const items: Parameters<typeof SessionContextStrip>[0]['items'] = [
        {
          label: 'Entry',
          value: isGuestMode ? 'Guest entry' : 'Player entry',
          tone: 'default' as const,
        },
        {
          label: 'State',
          value: isLocked
            ? sessionUiCopy.lockedState
            : loadError
            ? 'Needs retry'
            : resolvingSession || loadingExisting
            ? 'Loading'
            : 'Open',
          tone: isLocked
            ? ('success' as const)
            : loadError
            ? ('warning' as const)
            : ('default' as const),
        },
      ]
      // Only include the join-code pill when a code actually exists — a
      // string of dashes looks like a broken empty state.
      if (joinCode) {
        items.unshift({
          label: sessionUiCopy.joinCodeLabel,
          value: joinCode,
          tone: 'accent' as const,
          onPress: copyJoinCode,
          showCopyIcon: true,
        })
      }
      return items
    },
    [
      copyJoinCode,
      isGuestMode,
      isLocked,
      joinCode,
      loadError,
      loadingExisting,
      resolvingSession,
    ]
  )

  const savedStatusLabel = isAutoSaving
    ? 'Syncing...'
    : lastSavedAt && !isDirty
      ? `Saved ${new Date(lastSavedAt).toLocaleDateString()}`
      : lastDraftSavedAt && !hasUnsavedDraftChanges
        ? 'Draft saved'
        : 'Unsaved'

  const handleBackNavigation = useCallback(() => {
    performSafeBackNavigation({
      canGoBack: router.canGoBack(),
      previousHref: getTrackedPreviousRoute(),
      back: () => router.back(),
      markBackNavigation: markTrackedBackNavigation,
      replace: (href) => router.replace(href),
    })
  }, [])

  function confirmReset() {
    if (isLocked) {
      Alert.alert('Game finished', 'This score is locked because the game has already been finished.')
      return
    }

    if (isInteractionBlocked) return

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
          onPress: () => {
            setSaveFeedback(null)
            setInputs(createEmptyInputs())
          },
        },
      ]
    )
  }

  function confirmChangeDuke() {
    if (isInteractionBlocked) return

    if (!selectedDuke) {
      setSelectedSlug(null)
      setDukeQuery('')
      return
    }

    if (!isDirty && !hasAnyInput(inputs)) {
      setSelectedSlug(null)
      setDukeQuery('')
      return
    }

    Alert.alert(
      'Change duke?',
      'Changing duke will keep you on this screen, but your current unsaved scoring choices may no longer match.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          style: 'destructive',
          onPress: () => {
            setSaveFeedback(null)
            setSelectedSlug(null)
            setDukeQuery('')
            setInputs(createEmptyInputs())
          },
        },
      ]
    )
  }

  function handleSelectDuke(slug: string) {
    pendingScrollResetRef.current = shouldResetScoreScrollOnDukeSelection(selectedSlug, slug)
    setSelectedSlug(slug)
    setDukeQuery('')
  }

  const handleScoreAreaLayout = useCallback((event: LayoutChangeEvent) => {
    if (!pendingScrollResetRef.current) {
      return
    }

    pendingScrollResetRef.current = false
    const nextScrollTarget = resolveScoreScrollResetTarget(event.nativeEvent.layout.y)

    if (scrollResetFrameRef.current !== null) {
      cancelAnimationFrame(scrollResetFrameRef.current)
    }

    scrollResetFrameRef.current = requestAnimationFrame(() => {
      scoreScrollViewRef.current?.scrollTo({
        y: nextScrollTarget,
        animated: true,
      })
      scrollResetFrameRef.current = null
    })
  }, [])

  async function handleSaveScore() {
    try {
      clearPendingAutoSaveTimer()
      pendingAutoSaveRef.current = false

      if (autoSavePromiseRef.current) {
        await autoSavePromiseRef.current
      }

      if (!effectiveSessionId) {
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

      // Defensive: the session_scores -> game_sessions FK will fail with a
      // cryptic constraint error if the session has been deleted out from
      // under us. Verify the session still exists first so we can hand back
      // a clear "session ended" message and clear the stale local state.
      const sessionStillLive = await doesSessionExist(effectiveSessionId)
      if (!sessionStillLive) {
        await clearActiveSessionState()
        Alert.alert(
          'Session has ended',
          'That session is no longer available. Start or join a new one to keep scoring.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/create-session'),
            },
          ]
        )
        return
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      setSaving(true)
      const normalizedCurrentInputs = normalizeScoreInputs(inputs)
      const savedRow = await persistCommittedSnapshot({
        sessionId: effectiveSessionId,
        dukeSlug: selectedDuke.slug,
        inputs: normalizedCurrentInputs,
        totalScore,
      })

      const now =
        typeof savedRow?.updated_at === 'string' && savedRow.updated_at
          ? savedRow.updated_at
          : new Date().toISOString()
      setIsLocked(false)
      setLastSavedAt(now)
      setLastDraftSavedAt('')
      setIsSubmittedLock(true)
      setBaselineSlug(selectedDuke.slug)
      setBaselineInputs(normalizedCurrentInputs)
      setDraftBaselineSlug(selectedDuke.slug)
      setDraftBaselineInputs(normalizedCurrentInputs)
      setCanSyncDraftToSupabase(true)
      void clearScoreDraft()
      setSaveFeedback(
        buildScoreSaveFeedback({
          isGuestMode,
          guestName,
          dukeName: selectedDuke.name,
        })
      )
    } catch (err: any) {
      Alert.alert('Save failed', err?.message ?? 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    return () => {
      clearPendingAutoSaveTimer()
    }
  }, [clearPendingAutoSaveTimer])

  function renderSection(title: string, items: StatMetaItem[]) {
    if (!items.length || !selectedDuke) return null

    const accent = getSectionAccent(title)
    const sectionHeaderMeta = getScoreSectionHeaderMeta({ isLocked })

    return (
      <View
        style={[
          styles.sectionCard,
          {
            borderColor: accent.borderColor,
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>

          <View style={styles.sectionHeaderRight}>
            {sectionHeaderMeta.hintText ? (
              <View style={styles.sectionTipChip}>
                <Text style={styles.sectionTipChipText}>
                  {sectionHeaderMeta.hintText}
                </Text>
              </View>
            ) : null}

            {sectionHeaderMeta.showCountBadge ? (
              <CountBadge
                value={items.length}
                size="sm"
                backgroundColor={accent.borderColor}
                borderColor={accent.borderColor}
                textColor="#FFFFFF"
              />
            ) : null}
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
              disabled={isInteractionBlocked}
            />
          ))}
        </View>
      </View>
    )
  }

  return (
    <>
      <ScrollView
        ref={scoreScrollViewRef}
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + 24,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <View style={styles.titleTextWrap}>
            <Text style={styles.titleText}>
              {isGuestMode
                ? 'Guest Score'
                : isAddedPlayerMode
                  ? 'Player Score'
                  : 'Score'}
            </Text>
            {(isGuestMode && guestName) || (isAddedPlayerMode && addedPlayerName) ? (
              <Text style={styles.titleSubtitle}>
                {isGuestMode && guestName ? guestName : addedPlayerName}
              </Text>
            ) : null}
          </View>

          {/* Saved/unsaved chip — replaces the old full-width SAVED banner. */}
          <View
            style={[
              styles.savedChip,
              lastSavedAt ? styles.savedChipSaved : styles.savedChipUnsaved,
            ]}
          >
            <Text
              style={[
                styles.savedChipText,
                lastSavedAt ? styles.savedChipTextSaved : styles.savedChipTextUnsaved,
              ]}
              numberOfLines={1}
            >
              {savedStatusLabel}
            </Text>
          </View>
        </View>

      <SessionContextStrip items={contextItems} />

      {saveFeedback ? (
        <View style={styles.successCard}>
          <Text style={styles.successTitle}>{saveFeedback.title}</Text>
          <Text style={styles.successText}>{saveFeedback.body}</Text>

          <View style={styles.inlineButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryInlineButton,
                styles.successActionButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => openCompare(false)}
            >
              <Text style={styles.successActionButtonText}>{saveFeedback.actionLabel}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {resolvingSession || loadingExisting ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Loading saved score...</Text>
          <Text style={styles.statusText}>
            Checking session details and any score that was already submitted.
          </Text>
        </View>
      ) : null}

      {!resolvingSession && !loadingExisting && !effectiveSessionId ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Missing session</Text>
          <Text style={styles.errorText}>
            Start or join a session before entering scores.
          </Text>

          <View style={styles.inlineButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryInlineButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.replace('/')}
            >
              <Text style={styles.primaryInlineButtonText}>Go Home</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {!resolvingSession && !loadingExisting && !!loadError ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Couldn’t load saved score</Text>
          <Text style={styles.errorText}>{loadError}</Text>

          <View style={styles.inlineButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryInlineButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => {
                void loadExistingScore()
              }}
            >
              <Text style={styles.primaryInlineButtonText}>Retry</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {!resolvingSession && !loadingExisting && isLocked ? (
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
              <Text style={styles.lockChipText}>{sessionUiCopy.lockedState}</Text>
            </View>
          </View>

          <View style={styles.inlineButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryInlineButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => openCompare(true)}
            >
              <Text style={styles.primaryInlineButtonText}>View Results</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {!isLocked && isSubmittedLock ? (
        <View style={styles.submittedLockCard}>
          <MaterialCommunityIcons
            name="lock-check-outline"
            size={20}
            color={theme.colors.accent}
          />
          <Text style={styles.submittedLockText}>Score submitted</Text>
        </View>
      ) : null}

      <View
        pointerEvents={isInteractionBlocked ? 'none' : 'auto'}
        style={isInteractionBlocked ? styles.lockedBlock : undefined}
        onLayout={handleScoreAreaLayout}
      >
        {!selectedDuke ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Choose Duke</Text>
              <CountBadge value={filteredDukeCards.length} size="sm" />
            </View>

            <View style={styles.dukeSearchCard}>
              <TextInput
                style={styles.dukeSearchInput}
                value={dukeQuery}
                onChangeText={setDukeQuery}
                placeholder="Search dukes"
                placeholderTextColor={theme.colors.textMuted}
                autoCorrect={false}
                returnKeyType="search"
              />
            </View>

            {filteredDukeCards.length === 0 ? (
              <View style={styles.emptySearchState}>
                <Text style={styles.emptySearchTitle}>No dukes match that search.</Text>
                <Text style={styles.emptySearchText}>Try a different name or clear the query.</Text>
              </View>
            ) : null}

            <DukePicker
              dukes={filteredDukeCards.map((duke) => ({
                slug: duke.slug,
                name: duke.name,
              }))}
              selectedSlug={selectedSlug}
              onSelect={handleSelectDuke}
            />
          </View>
        ) : (
          <View style={styles.selectedDukeCard}>
            <Text style={styles.selectedLabel}>
              {isGuestMode ? 'Guest entry' : 'Score entry'}
            </Text>

            <View style={styles.selectedDukeTop}>
              <View
                style={[
                  styles.dukeThumbWrap,
                  selectedDukeThumbIsPortrait && styles.dukeThumbWrapPortrait,
                ]}
              >
                {cardImages[selectedDuke.slug] ? (
                  <Image
                    source={cardImages[selectedDuke.slug]}
                    style={styles.dukeThumb}
                    resizeMode={selectedDukeThumbIsPortrait ? 'contain' : 'cover'}
                  />
                ) : (
                  <View style={styles.noImageState}>
                    <Text style={styles.noImageText}>No image</Text>
                  </View>
                )}
              </View>

              <View style={styles.selectedDukeMeta}>
                <View style={styles.selectedNameRow}>
                  <Text style={styles.selectedName} numberOfLines={2}>
                    {selectedDuke.name}
                  </Text>
                  {/* Live total inlined as a number-and-label pair beside the
                      duke name — replaces the old separate Live Total pill. */}
                  <View style={styles.selectedLiveTotal}>
                    <Text style={styles.selectedLiveTotalLabel}>
                      {sessionUiCopy.liveTotalLabel}
                    </Text>
                    <Text style={styles.selectedLiveTotalValue}>{totalScore}</Text>
                  </View>
                </View>
                <Text style={styles.selectedRuleHint}>
                  Only relevant scoring rows are shown for this duke.
                </Text>
              </View>
            </View>

            {!isLocked ? (
              <Pressable
                style={({ pressed }) => [
                  styles.changeDukeButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={confirmChangeDuke}
              >
                <Text style={styles.changeDukeButtonText}>Change Duke</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {renderSection('Resources', groupedStats.resources)}
        {renderSection('Symbols', groupedStats.equipment)}
        {renderSection('Monster Symbols', groupedStats.monsterSymbols)}
        {renderSection('Counts', groupedStats.counts)}
        {renderSection('Points on Cards', groupedStats.points)}
      </View>

      <View style={styles.totalShell}>
        {scoreActionVisibility.showTotalCard ? (
          <ScoreTotal
            total={totalScore}
            savedState={
              isLocked
                ? 'locked'
                : lastSavedAt && !isDirty
                  ? 'saved'
                  : 'unsaved'
            }
            savedAtLabel={
              lastSavedAt && !isDirty
                ? `saved ${new Date(lastSavedAt).toLocaleDateString()}`
                : undefined
            }
          />
        ) : null}

        {!isLocked ? (
          // Bordered button sitting on the banner background — no white fill,
          // so the primary action reads as part of the Total Score panel.
          // Renamed to "Save & Compare" so it does both jobs and the standalone
          // Compare button below can go away.
          <Pressable
            style={({ pressed }) => [
              styles.saveCompareButton,
              !scoreActionVisibility.showTotalCard && styles.saveCompareButtonCompact,
              pressed && styles.buttonPressed,
              (isWorking || !selectedDuke || !effectiveSessionId || !!loadError) &&
                styles.buttonDisabled,
            ]}
            onPress={async () => {
              await handleSaveScore()
              if (effectiveSessionId) {
                openCompare(false)
              }
            }}
            disabled={isWorking || !selectedDuke || !effectiveSessionId || !!loadError}
          >
            <Text style={styles.saveCompareButtonText}>
              {!effectiveSessionId
                ? 'Missing Session'
                : !selectedDuke
                  ? 'Select Duke'
                  : saving
                    ? 'Saving...'
                    : isAutoSaving
                      ? 'Syncing...'
                    : resolvingSession || loadingExisting
                      ? 'Loading...'
                      : isGuestMode
                        ? 'Save Guest Score & Compare'
                        : 'Save & Compare'}
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

      {/* Demoted Clear / Back to small text links — they're rarely-used
          escape hatches and don't deserve full-width buttons. */}
      <View style={styles.footerLinks}>
        <Pressable
          style={({ pressed }) => [pressed && styles.buttonPressed]}
          onPress={confirmReset}
          disabled={isInteractionBlocked}
          hitSlop={6}
        >
          <Text
            style={[
              styles.footerLinkText,
              isInteractionBlocked && styles.footerLinkTextDisabled,
            ]}
          >
            Clear
          </Text>
        </Pressable>

        {isSubmittedLock && !isLocked ? (
          <>
            <Text style={styles.footerLinkSeparator}>·</Text>
            <Pressable
              style={({ pressed }) => [pressed && styles.buttonPressed]}
              onPress={() => {
                setIsSubmittedLock(false)
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              }}
              hitSlop={6}
            >
              <Text style={styles.footerLinkUnlock}>
                Unlock
              </Text>
            </Pressable>
          </>
        ) : null}

        <Text style={styles.footerLinkSeparator}>·</Text>

        <Pressable
          style={({ pressed }) => [pressed && styles.buttonPressed]}
          onPress={() => confirmLeaveIfNeeded(handleBackNavigation)}
          disabled={saving}
          hitSlop={6}
        >
          <Text
            style={[
              styles.footerLinkText,
              saving && styles.footerLinkTextDisabled,
            ]}
          >
            Back
          </Text>
        </Pressable>
      </View>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  content: {
    padding: 10,
    paddingBottom: 16,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },

  titleTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  titleText: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '900',
  },

  titleSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },

  // Saved/unsaved chip beside the page title. Replaces the old full-width
  // "SAVED / Not saved yet" banner.
  savedChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 160,
  },

  savedChipSaved: {
    backgroundColor: 'rgba(112, 215, 165, 0.16)',
    borderColor: theme.colors.success,
  },

  savedChipUnsaved: {
    backgroundColor: 'rgba(231, 199, 104, 0.14)',
    borderColor: theme.colors.gold,
  },

  savedChipText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  savedChipTextSaved: {
    color: theme.colors.success,
  },

  savedChipTextUnsaved: {
    color: theme.colors.gold,
  },

  joinCodePill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
    ...theme.shadow.card,
  },

  joinCodePillLabel: {
    color: theme.colors.textMuted ?? '#A99BC8',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  joinCodePillText: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },

  statusCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 12,
  },

  successCard: {
    backgroundColor: 'rgba(112, 215, 165, 0.1)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.success,
    padding: 14,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  successTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },

  successText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
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

  errorCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#F59E0B',
    padding: 14,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  errorTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },

  errorText: {
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

  inlineButtons: {
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

  successActionButton: {
    backgroundColor: theme.colors.success,
  },

  successActionButtonText: {
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
    // Tightened to 10/8 (down from earlier 14/12) so the page feels less padded
    // without losing the section grouping.
    padding: 10,
    marginBottom: 8,
    ...theme.shadow.card,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Compact tip chip rendered in the first section's header.
  sectionTipChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  sectionTipChipText: {
    color: theme.colors.textMuted ?? theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  dukeSearchCard: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    marginBottom: 12,
  },

  dukeSearchInput: {
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

  emptySearchState: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 12,
  },

  emptySearchTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },

  emptySearchText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

  sectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },

  sectionRows: {
    gap: 8,
  },

  selectedDukeCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 22,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  selectedDukeTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 6,
  },

  // Square (rounded-corner) card thumb — kept square here and matched on the
  // tier list so duke art looks consistent across the app.
  dukeThumbWrap: {
    width: 108,
    height: 108,
    borderRadius: 14,
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

  dukeThumbWrapPortrait: {
    width: 108,
    height: 151,
  },

  // Live total inlined beside the duke name — no separate Live Total pill.
  selectedNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },

  selectedLiveTotal: {
    alignItems: 'flex-end',
    minWidth: 60,
  },

  selectedLiveTotalLabel: {
    color: theme.colors.textMuted ?? '#C5B7E2',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  selectedLiveTotalValue: {
    color: theme.colors.text,
    fontSize: 24,
    lineHeight: 26,
    fontWeight: '900',
    marginTop: 1,
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
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },

  selectedName: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
    flex: 1,
    minWidth: 0,
  },

  // Italic, muted caption — used to be primary-weight body text that was
  // competing with the duke name. Now it reads as a tiny aside.
  selectedRuleHint: {
    color: theme.colors.textMuted ?? theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    fontStyle: 'italic',
    lineHeight: 15,
    opacity: 0.85,
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

  // Bordered primary button on top of the Total Score banner background —
  // no white fill so it nests inside the banner instead of competing with it.
  saveCompareButton: {
    marginTop: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.18)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.55)',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  saveCompareButtonCompact: {
    marginTop: 0,
  },

  saveCompareButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
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

  submittedLockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(109, 90, 230, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(109, 90, 230, 0.25)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
  },

  submittedLockText: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '800',
  },

  footerLinkUnlock: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },

  // Demoted Clear / Back as small text links beneath the primary action.
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
    marginBottom: 10,
  },

  footerLinkText: {
    color: theme.colors.textMuted ?? theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  footerLinkTextDisabled: {
    opacity: 0.45,
  },

  footerLinkSeparator: {
    color: theme.colors.textMuted ?? theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.6,
  },
})
