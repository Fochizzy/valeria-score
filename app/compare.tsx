import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, ImageBackground, ScrollView, Share, View } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import CompareHeroCard from '../components/CompareHeroCard'
import CompareScoresCard from '../components/CompareScoresCard'
import CompareStatsRow from '../components/CompareStatsRow'
import CompareStatusStack from '../components/CompareStatusStack'
import FinishTiebreakModal from '../components/FinishTiebreakModal'
import ManageAccountModal from '../components/ManageAccountModal'
import SessionContextStrip from '../components/SessionContextStrip'
import ValeriaHeader from '../components/ValeriaHeader'
import { compareScreenStyles as styles } from '../components/compare-screen-styles'
import { loadCompareDashboardData } from '../lib/compare-dashboard-data'
import {
  buildComparePlayerCountChoices,
  buildCompareDashboardModel,
  buildCompareSessionContextItems,
  shouldAutoRouteCompareViewerToVictory,
} from '../lib/compare-screen-state'
import { type CompareEntry } from '../lib/compare-entries'
import { resolveCompareGuestRemovalMode } from '../lib/compare-guest-removal'
import { buildCompareEntryScoreRoute } from '../lib/compare-score-route'
import {
  buildOrderedTiebreakScoreIds,
  getTopScoreTiedEntries,
  hasTopScoreTie,
  isCompleteTiebreakSelection,
} from '../lib/finish-tie-resolution'
import { copyJoinCodeWithFeedback } from '../lib/copy-join-code-client'
import { deleteOwnedGame } from '../lib/manage'
import {
  buildManageAccountMenuActions,
  manageAccountAlertCopy,
  manageAccountHeaderProps,
  type ManageAccountModalAction,
} from '../lib/manage-account-menu'
import { logoutAndClearActiveSessionState } from '../lib/logout'
import { buildDangerFlowCopy } from '../lib/p3-feedback'
import {
  shouldAutoRouteToVictoryOnLock,
  subscribeToSessionActivity,
  subscribeToSessionScores,
} from '../lib/realtime'
import { getBottomNavClearance } from '../lib/bottom-nav-layout'
import {
  MAX_COMPARE_PLAYER_COUNT,
  MIN_COMPARE_PLAYER_COUNT,
  clampComparePlayerCount,
} from '../lib/compare-player-count'
import {
  clearActiveSessionState,
  doesSessionExist,
  getActiveJoinCode,
  getActiveSessionId,
  removeGuestPlayerFromSession,
} from '../lib/sessions'
import { resolveSessionRouteContext } from '../lib/session-route-context'
import {
  finishGameViaRpc,
  finishGameWithTiebreakViaRpc,
} from '../lib/session-admin-flow'
import { supabase } from '../lib/supabase'
import { Alert } from '../lib/themed-alert'
import { buildVictoryRoute } from '../lib/victory-route'
import { buildResultsShareMessage } from '../lib/victory-results'
import { didAppBecomeActive } from '../lib/app-state-refresh'

const compareBackdrop = require('../assets/compare.png')

export default function CompareScreen() {
  const insets = useSafeAreaInsets()
  const { sessionId: routeSessionId, joinCode: routeJoinCode } = useLocalSearchParams<{
    sessionId: string
    joinCode?: string
  }>()

  const didLoadOnceRef = useRef(false)
  const livePulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoRoutedToVictoryRef = useRef(false)
  const didFocusRefreshRef = useRef(false)
  const appStateRef = useRef(AppState.currentState)

  const [scores, setScores] = useState<CompareEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [accountMenuVisible, setAccountMenuVisible] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [livePulse, setLivePulse] = useState(false)
  const [isCreator, setIsCreator] = useState(false)
  const [sessionCreatorId, setSessionCreatorId] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [expectedPlayerCount, setExpectedPlayerCount] = useState(MIN_COMPARE_PLAYER_COUNT)
  const [scoreRevision, setScoreRevision] = useState(1)
  const [savingPlayerTarget, setSavingPlayerTarget] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [loadNotice, setLoadNotice] = useState('')
  const [tiebreakVisible, setTiebreakVisible] = useState(false)
  const [tiebreakPlacements, setTiebreakPlacements] = useState<Record<string, number>>({})
  const [activeTieKey, setActiveTieKey] = useState('')
  const [effectiveSessionId, setEffectiveSessionId] = useState(
    typeof routeSessionId === 'string' ? routeSessionId : ''
  )
  const [effectiveJoinCode, setEffectiveJoinCode] = useState(
    typeof routeJoinCode === 'string' ? routeJoinCode : ''
  )

  const copyableJoinCode = effectiveJoinCode
  const compareModel = useMemo(
    () =>
      buildCompareDashboardModel({
        entries: scores,
        sessionCreatorId,
        expectedPlayerCount,
        scoreRevision,
      }),
    [expectedPlayerCount, scoreRevision, scores, sessionCreatorId]
  )
  const {
    savedScoreCount,
    progress,
    leader,
    minimumPlayerCount,
    canFinishScores,
    finishBlockTitle,
    finishBlockBody,
  } = compareModel
  const canShare = savedScoreCount > 0 && !sharing
  const canAddGuest =
    Boolean(effectiveSessionId) && progress.trackedParticipants < MAX_COMPARE_PLAYER_COUNT
  const canFinish =
    progress.allReady && canFinishScores && !finishing && !savingPlayerTarget && isCreator
  const topTiedEntries = useMemo(() => getTopScoreTiedEntries(scores), [scores])
  const currentTieKey = useMemo(
    () =>
      topTiedEntries
        .map((entry) => `${entry.scoreId}:${entry.totalScore}`)
        .sort()
        .join('|'),
    [topTiedEntries]
  )
  const canSaveTiebreak = useMemo(
    () => isCompleteTiebreakSelection(topTiedEntries, tiebreakPlacements),
    [tiebreakPlacements, topTiedEntries]
  )
  const playerCountChoices = useMemo(
    () =>
      buildComparePlayerCountChoices({
        expectedPlayerCount,
        minimumPlayerCount,
        disabled: !isCreator || savingPlayerTarget,
      }),
    [expectedPlayerCount, isCreator, minimumPlayerCount, savingPlayerTarget]
  )

  const resolveSessionContext = useCallback(async () => {
    const [storedSessionId, storedJoinCode] = await Promise.all([
      getActiveSessionId(),
      getActiveJoinCode(),
    ])

    const resolved = resolveSessionRouteContext({
      routeSessionId: typeof routeSessionId === 'string' ? routeSessionId : '',
      storedSessionId,
      routeJoinCode: typeof routeJoinCode === 'string' ? routeJoinCode : '',
      storedJoinCode,
    })

    setEffectiveSessionId(resolved.sessionId)
    setEffectiveJoinCode(resolved.joinCode)
  }, [routeJoinCode, routeSessionId])

  const clearCompareState = useCallback((errorMessage: string) => {
    setScores([])
    setIsCreator(false)
    setSessionCreatorId('')
    setCurrentUserId('')
    setExpectedPlayerCount(MIN_COMPARE_PLAYER_COUNT)
    setScoreRevision(1)
    setLoadNotice('')
    setLoadError(errorMessage)
  }, [])

  const handleCopyJoinCode = useCallback(async () => {
    await copyJoinCodeWithFeedback(copyableJoinCode)
  }, [copyableJoinCode])

  const fetchScores = useCallback(
    async (showLoading = false) => {
      if (!effectiveSessionId) {
        clearCompareState('Start or join a session before viewing compare data.')
        if (showLoading) setLoading(false)
        return
      }

      try {
        if (showLoading) setLoading(true)

        // Defensive: if the locally-saved session id no longer points at a
        // row in game_sessions, wipe local active state and send the user
        // home so they don't end up scrolling an empty compare for a dead
        // session.
        const sessionStillLive = await doesSessionExist(effectiveSessionId)
        if (!sessionStillLive) {
          await clearActiveSessionState()
          clearCompareState('That session is no longer available.')
          Alert.alert(
            'Session has ended',
            'That session is no longer available. Start or join a new one to keep playing.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/create-session'),
              },
            ]
          )
          return
        }

        const dashboardData = await loadCompareDashboardData(effectiveSessionId)

        setCurrentUserId(dashboardData.currentUserId)
        setIsCreator(dashboardData.isCreator)
        setSessionCreatorId(dashboardData.sessionCreatorId)
        setExpectedPlayerCount(dashboardData.expectedPlayerCount)
        setScoreRevision(dashboardData.scoreRevision)
        setScores(dashboardData.scores)
        setLoadNotice(dashboardData.loadNotice)
        setLoadError('')
        didLoadOnceRef.current = true
      } catch (err: any) {
        console.error(err)
        setLoadNotice('')
        setLoadError(
          err?.message ?? 'Unable to load live standings right now. Pull to retry.'
        )
      } finally {
        if (showLoading) setLoading(false)
      }
    },
    [clearCompareState, effectiveSessionId]
  )

  const handleCreateSession = useCallback(() => {
    router.replace('/create-session')
  }, [])

  const goToPlayerStats = useCallback(() => {
    router.push('/player-stats')
  }, [])

  const goToDukeStats = useCallback(() => {
    router.push('/duke-stats')
  }, [])

  const goToGlobalTrends = useCallback(() => {
    router.push('/global-trends')
  }, [])

  const goToSoloStats = useCallback(() => {
    router.push('/solo-stats' as never)
  }, [])

  const goToManageData = useCallback(() => {
    router.push('/manage-data')
  }, [])

  const addGuest = useCallback(() => {
    if (!effectiveSessionId) {
      Alert.alert('Missing session', 'Start or join a session before adding a guest.')
      return
    }

    router.push({
      pathname: '/guest-player',
      params: {
        sessionId: effectiveSessionId,
        joinCode: effectiveJoinCode,
      },
    })
  }, [effectiveJoinCode, effectiveSessionId])

  const updateExpectedPlayerCount = useCallback(
    async (nextCount: number, minimumCount: number) => {
      if (!effectiveSessionId) {
        Alert.alert('Missing session', 'Start or join a session before updating the table size.')
        return
      }

      if (!isCreator) {
        Alert.alert('Host only', 'Only the session creator can set the table size.')
        return
      }

      const safeNextCount = Math.max(
        clampComparePlayerCount(minimumCount),
        clampComparePlayerCount(nextCount)
      )
      if (safeNextCount === expectedPlayerCount) {
        return
      }

      const previousCount = expectedPlayerCount

      try {
        setSavingPlayerTarget(true)
        setExpectedPlayerCount(safeNextCount)

        const { data, error } = await supabase
          .from('game_sessions')
          .update({ expected_player_count: safeNextCount })
          .eq('id', effectiveSessionId)
          .select('expected_player_count')
          .single()

        if (error) throw error

        setExpectedPlayerCount(
          clampComparePlayerCount(Number(data?.expected_player_count ?? safeNextCount))
        )
      } catch (err: any) {
        setExpectedPlayerCount(previousCount)
        Alert.alert(
          'Unable to update players',
          err?.message ?? 'Please try updating the table size again.'
        )
      } finally {
        setSavingPlayerTarget(false)
      }
    },
    [effectiveSessionId, expectedPlayerCount, isCreator]
  )

  const openScoreEntry = useCallback(
    (entry: CompareEntry) => {
      const target = buildCompareEntryScoreRoute(entry, {
        sessionId: effectiveSessionId,
        joinCode: effectiveJoinCode,
        currentUserId,
      })

      if (!target) return

      router.push(target)
    },
    [currentUserId, effectiveJoinCode, effectiveSessionId]
  )

  const removeGuestEntry = useCallback(
    (entry: CompareEntry, nextExpectedPlayerCount: number) => {
      if (!effectiveSessionId) {
        Alert.alert('Missing session', 'Start or join a session before removing a guest.')
        return
      }

      if (!isCreator) {
        Alert.alert('Host only', 'Only the session creator can remove guests from this game.')
        return
      }

      const removalMode = resolveCompareGuestRemovalMode(entry)

      if (!removalMode || !entry.scoreId) {
        Alert.alert('Unavailable', 'This guest cannot be removed from the current game.')
        return
      }

      const copy =
        removalMode === 'guest-entry'
          ? {
              title: 'Remove guest from game?',
              body: `${entry.label} will be removed from this session and any saved guest score for this seat will be deleted.`,
            }
          : {
              title: 'Remove player from game?',
              body: `${entry.label} will be removed from this session and any saved score for this added player seat will be deleted.`,
            }

      Alert.alert(
        copy.title,
        copy.body,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await removeGuestPlayerFromSession(effectiveSessionId, {
                  scoreId: entry.scoreId,
                  removalMode,
                  guestEntryId:
                    removalMode === 'guest-entry' ? entry.guestEntryId : null,
                  ownerUserId:
                    removalMode === 'added-player-entry' ? entry.userId : null,
                  nextExpectedPlayerCount,
                })
              } catch (err: any) {
                Alert.alert('Remove failed', err?.message ?? 'Unknown error')
              } finally {
                await fetchScores(false)
              }
            },
          },
        ]
      )
    },
    [effectiveSessionId, fetchScores, isCreator]
  )

  const handleLogout = useCallback(async () => {
    try {
      setLoggingOut(true)
      await logoutAndClearActiveSessionState({
        signOut: () => supabase.auth.signOut(),
        clearActiveSessionState,
      })
      router.replace('/')
    } catch (err: any) {
      Alert.alert('Logout failed', err?.message ?? 'Unknown error')
    } finally {
      setLoggingOut(false)
    }
  }, [])

  const deleteSession = useCallback(async () => {
    if (!effectiveSessionId) return

    if (!isCreator) {
      Alert.alert('Host only', 'Only the session creator can delete this session.')
      return
    }

    const copy = buildDangerFlowCopy('deleteSession', copyableJoinCode || 'this session')

    Alert.alert(copy.title, copy.body, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: copy.confirmLabel,
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true)
            await deleteOwnedGame(effectiveSessionId)
            router.replace('/create-session')
          } catch (err: any) {
            Alert.alert('Delete failed', err?.message ?? 'Unknown error')
          } finally {
            setDeleting(false)
          }
        },
      },
    ])
  }, [copyableJoinCode, effectiveSessionId, isCreator])

  const handleFinishGame = useCallback(async () => {
    if (!effectiveSessionId) return

    if (!isCreator) {
      Alert.alert('Host only', 'Only the session creator can finish the game.')
      return
    }

    if (!progress.allReady || !canFinishScores) {
      Alert.alert(
        finishBlockTitle ?? 'Scores still missing',
        finishBlockBody ?? 'Finish the remaining scores before locking the game.'
      )
      return
    }

    if (hasTopScoreTie(scores)) {
      setActiveTieKey(currentTieKey)
      setTiebreakPlacements({})
      setTiebreakVisible(true)
      return
    }

    const copy = buildDangerFlowCopy('finishGame')

    Alert.alert(copy.title, copy.body, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: copy.confirmLabel,
        style: 'destructive',
        onPress: async () => {
          try {
            setFinishing(true)
            await finishGameViaRpc(effectiveSessionId, {
              invokeRpc: async (fn, args) => supabase.rpc(fn, args),
            })
            await fetchScores(false)
            router.replace(
              buildVictoryRoute(effectiveSessionId, effectiveJoinCode) as never
            )
          } catch (err: any) {
            Alert.alert('Finish failed', err?.message ?? 'Unknown error')
          } finally {
            setFinishing(false)
          }
        },
      },
    ])
  }, [
    canFinishScores,
    effectiveJoinCode,
    effectiveSessionId,
    finishBlockBody,
    finishBlockTitle,
    fetchScores,
    isCreator,
    currentTieKey,
    progress.allReady,
    scores,
  ])

  const handleSelectTiebreakPlacement = useCallback((scoreId: string, placement: number) => {
    setTiebreakPlacements((current) => ({
      ...current,
      [scoreId]: placement,
    }))
  }, [])

  const closeTiebreakModal = useCallback(() => {
    setTiebreakVisible(false)
    setTiebreakPlacements({})
    setActiveTieKey('')
  }, [])

  const handleSaveTiebreak = useCallback(async () => {
    if (!effectiveSessionId || !canSaveTiebreak) {
      return
    }

    try {
      setFinishing(true)
      await finishGameWithTiebreakViaRpc(
        effectiveSessionId,
        buildOrderedTiebreakScoreIds(tiebreakPlacements),
        {
          invokeRpc: async (fn, args) => supabase.rpc(fn, args),
        }
      )
      closeTiebreakModal()
      await fetchScores(false)
      router.replace(buildVictoryRoute(effectiveSessionId, effectiveJoinCode) as never)
    } catch (err: any) {
      Alert.alert('Finish failed', err?.message ?? 'Unknown error')
    } finally {
      setFinishing(false)
    }
  }, [
    canSaveTiebreak,
    closeTiebreakModal,
    effectiveJoinCode,
    effectiveSessionId,
    fetchScores,
    tiebreakPlacements,
  ])

  useEffect(() => {
    void resolveSessionContext()
  }, [resolveSessionContext])

  useEffect(() => {
    autoRoutedToVictoryRef.current = false
    didFocusRefreshRef.current = false
    closeTiebreakModal()
  }, [effectiveSessionId])

  useEffect(() => {
    if (!tiebreakVisible) {
      return
    }

    if (!currentTieKey || currentTieKey !== activeTieKey) {
      closeTiebreakModal()
      Alert.alert(
        'Standings changed',
        'The tied top scorers changed while you were deciding. Review the updated standings and tap Finish Game again.'
      )
    }
  }, [activeTieKey, closeTiebreakModal, currentTieKey, tiebreakVisible])

  useFocusEffect(
    useCallback(() => {
      if (!effectiveSessionId) {
        return
      }

      if (!didFocusRefreshRef.current) {
        didFocusRefreshRef.current = true
        return
      }

      void fetchScores(false)
    }, [effectiveSessionId, fetchScores])
  )

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (didAppBecomeActive(appStateRef.current, nextState) && effectiveSessionId) {
        void fetchScores(false)
      }

      appStateRef.current = nextState
    })

    return () => {
      subscription.remove()
    }
  }, [effectiveSessionId, fetchScores])

  useEffect(() => {
    fetchScores(true)

    if (!effectiveSessionId) {
      if (livePulseTimeoutRef.current) {
        clearTimeout(livePulseTimeoutRef.current)
        livePulseTimeoutRef.current = null
      }
      return
    }

    const unsubscribe = subscribeToSessionActivity(effectiveSessionId, () => {
      setLivePulse(true)
      void fetchScores(false)
      if (livePulseTimeoutRef.current) {
        clearTimeout(livePulseTimeoutRef.current)
      }
      livePulseTimeoutRef.current = setTimeout(() => {
        setLivePulse(false)
        livePulseTimeoutRef.current = null
      }, 900)
    })

    return () => {
      if (livePulseTimeoutRef.current) {
        clearTimeout(livePulseTimeoutRef.current)
        livePulseTimeoutRef.current = null
      }
      unsubscribe()
    }
  }, [effectiveSessionId, fetchScores])

  useEffect(() => {
    if (!effectiveSessionId || isCreator) {
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
      router.replace(buildVictoryRoute(effectiveSessionId, effectiveJoinCode) as never)
    })
  }, [effectiveJoinCode, effectiveSessionId, isCreator])

  useEffect(() => {
    if (loading || loadError) {
      return
    }

    if (
      !shouldAutoRouteCompareViewerToVictory({
        sessionId: effectiveSessionId,
        isCreator,
        allLocked: progress.allLocked,
        alreadyRouted: autoRoutedToVictoryRef.current,
      })
    ) {
      return
    }

    autoRoutedToVictoryRef.current = true
    router.replace(buildVictoryRoute(effectiveSessionId, effectiveJoinCode) as never)
  }, [
    effectiveJoinCode,
    effectiveSessionId,
    isCreator,
    loadError,
    loading,
    progress.allLocked,
  ])

  const shareResults = useCallback(async () => {
    try {
      setSharing(true)

        await Share.share({
          title: 'Valeria Results',
          message: buildResultsShareMessage(
            scores.filter((entry) => entry.locked || entry.hasScore)
          ),
        })
    } catch (err: any) {
      Alert.alert('Share failed', err?.message ?? 'Unknown error')
    } finally {
      setSharing(false)
    }
  }, [scores])

  const accountMenuActions = useMemo<ManageAccountModalAction[]>(
    () =>
      buildManageAccountMenuActions({
        includeDeleteSession: isCreator,
      }).map((action) => {
        switch (action.id) {
          case 'manageData':
            return { ...action, onPress: goToManageData }
          case 'newSession':
            return { ...action, onPress: handleCreateSession }
          case 'logout':
            return { ...action, onPress: handleLogout }
          case 'deleteSession':
            return { ...action, onPress: deleteSession }
          case 'cancel':
            return { ...action }
          default:
            return action
        }
      }),
    [
      deleteSession,
      goToManageData,
      handleCreateSession,
      handleLogout,
      isCreator,
    ]
  )

  const openAccountActions = useCallback(() => {
    setAccountMenuVisible(true)
  }, [])

  const contextItems = useMemo(
    () =>
      buildCompareSessionContextItems({
        joinCode: copyableJoinCode,
        isCreator,
        livePulse,
        statusLabel: progress.statusLabel,
      }).map((item, index) =>
        index === 0 ? { ...item, onPress: handleCopyJoinCode } : item
      ),
    [
      copyableJoinCode,
      handleCopyJoinCode,
      isCreator,
      livePulse,
      progress.statusLabel,
    ]
  )

  return (
    <ImageBackground
      source={compareBackdrop}
      style={styles.pageBackground}
      imageStyle={styles.pageBackgroundImage}
      resizeMode="cover"
    >
      <View style={styles.pageScrim}>
        <ScrollView
          style={styles.screen}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: getBottomNavClearance(insets.bottom),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <ValeriaHeader
            compact
            showBack
            title="Compare Scores"
            subtitle="Live session standings"
            {...manageAccountHeaderProps}
            onRightPress={openAccountActions}
            rightDisabled={loggingOut || deleting}
          />

          <SessionContextStrip items={contextItems} />

          <CompareStatusStack
            leader={leader}
            loadNotice={loadNotice}
            loadError={loadError}
            hasScores={scores.length > 0}
            loading={loading}
            didLoadOnce={didLoadOnceRef.current}
            deleting={deleting}
            onRetry={() => fetchScores(true)}
          />

          <CompareScoresCard
            scores={scores}
            loading={loading}
            sessionId={effectiveSessionId}
            joinCode={effectiveJoinCode}
            currentUserId={currentUserId}
            viewerCanRemoveGuestSeats={isCreator}
            expectedPlayerCount={expectedPlayerCount}
            minimumPlayerCount={minimumPlayerCount}
            onOpenScoreEntry={openScoreEntry}
            onRemoveGuestEntry={removeGuestEntry}
          />

          <CompareHeroCard
            isCreator={isCreator}
            livePulse={livePulse}
            canShare={canShare}
            sharing={sharing}
            canAddGuest={canAddGuest}
            canFinish={canFinish}
            finishing={finishing}
            expectedPlayerCount={expectedPlayerCount}
            savingPlayerTarget={savingPlayerTarget}
            progressLabel={progress.progressLabel}
            guestParticipants={progress.guestParticipants}
            statusLabel={progress.statusLabel}
            playerCountChoices={playerCountChoices}
            onShare={shareResults}
            onAddGuest={addGuest}
            onFinishGame={handleFinishGame}
            onUpdateExpectedPlayerCount={updateExpectedPlayerCount}
          />

          <CompareStatsRow
            onPressPlayerStats={goToPlayerStats}
            onPressDukeStats={goToDukeStats}
            onPressGlobalTrends={goToGlobalTrends}
            onPressSoloStats={goToSoloStats}
          />
        </ScrollView>

        <ManageAccountModal
          visible={accountMenuVisible}
          title={manageAccountAlertCopy.title}
          message={manageAccountAlertCopy.message}
          actions={accountMenuActions}
          onRequestClose={() => setAccountMenuVisible(false)}
        />

        <FinishTiebreakModal
          visible={tiebreakVisible}
          entries={topTiedEntries}
          placements={tiebreakPlacements}
          canSave={canSaveTiebreak}
          saving={finishing}
          onSelectPlacement={handleSelectTiebreakPlacement}
          onCancel={closeTiebreakModal}
          onSave={handleSaveTiebreak}
        />
      </View>
    </ImageBackground>
  )
}
