import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import AnalyticsSegmentedControl from '../components/AnalyticsSegmentedControl'
import DukeVsGlobalCard from '../components/DukeVsGlobalCard'
import FinishDistributionCard from '../components/FinishDistributionCard'
import FrequentOpponentsCard from '../components/FrequentOpponentsCard'
import HeadToHeadCard from '../components/HeadToHeadCard'
import ManageAccountModal from '../components/ManageAccountModal'
import PercentileGroupCard from '../components/PercentileGroupCard'
import PlayerCountFilterChips from '../components/PlayerCountFilterChips'
import PlayerLeaderboardSection from '../components/PlayerLeaderboardSection'
import PlayerSelectedStatsSection from '../components/PlayerSelectedStatsSection'
import PlayerCategoryBreakdownCard from '../components/PlayerCategoryBreakdownCard'
import PlayerStatsHeroCard from '../components/PlayerStatsHeroCard'
import { playerStatsSurface } from '../constants/analyticsPageSurface'
import { theme } from '../constants/theme'
import { Alert } from '../lib/themed-alert'
import { cards } from '../data/cards'
import {
  analyticsRouteHrefByKey,
  buildAnalyticsRouteToggleSegments,
} from '../lib/analytics-route-toggle'
import { filterDukesByQuery } from '../lib/duke-search'
import {
  buildBoundManageAccountMenuActions,
  manageAccountAlertCopy,
  manageAccountHeaderProps,
} from '../lib/manage-account-menu'
import { logoutAndClearActiveSessionState } from '../lib/logout'
import { loadFrequentOpponents } from '../lib/frequent-opponents-fetch'
import type { FrequentOpponent } from '../lib/frequent-opponents'
import { loadPlayerExtras, type PlayerExtras } from '../lib/player-extras-fetch'
import { type FinishDistribution } from '../lib/finish-distribution'
import {
  buildDukeVsGlobalRows,
  type DukeVsGlobalRow,
  type GlobalDukeRowSlim,
} from '../lib/duke-vs-global'
import {
  computePercentileResult,
  type PercentileResult,
} from '../lib/percentile-vs-global'
import type { PlayerCountFilter } from '../lib/player-count-filter'
import {
  buildProtectedAnalyticsAccessState,
  resolveProtectedAnalyticsViewerUserId,
} from '../lib/protected-analytics-access'
import { filterPlayers } from '../lib/player-stats-aggregates'
import {
  getPlayerStatsViewNames,
  resolvePlayerDukeRows,
  resolvePlayerLeaderboardRows,
  type PlayerDukeRow,
  type PlayerLeaderboardRow,
  type PlayerStatsTimeWindow,
} from '../lib/player-stats-data'
import { getBottomNavClearance } from '../lib/bottom-nav-layout'
import { loadPlayerCategoryStats } from '../lib/player-category-fetch'
import type { PlayerCategoryStats } from '../lib/score-category-breakdown'
import {
  deriveSelectedPlayerInsights,
} from '../lib/player-stats-insights'
import { clearActiveSessionState } from '../lib/sessions'
import { supabase } from '../lib/supabase'
import ValeriaHeader from '../components/ValeriaHeader'

type TimeWindow = PlayerStatsTimeWindow

export default function PlayerStatsScreen() {
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ playerKey?: string }>()
  const { width } = useWindowDimensions()
  const [query, setQuery] = useState('')
  const [dukeQuery, setDukeQuery] = useState('')
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('all')
  const [dukeFilter, setDukeFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [selectedStatsLoading, setSelectedStatsLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [allPlayers, setAllPlayers] = useState<PlayerLeaderboardRow[]>([])
  const [playerDukeStats, setPlayerDukeStats] = useState<PlayerDukeRow[]>([])
  const [playerCategoryStats, setPlayerCategoryStats] = useState<PlayerCategoryStats | null>(null)
  const [categoryStatsLoading, setCategoryStatsLoading] = useState(false)
  const [frequentOpponents, setFrequentOpponents] = useState<FrequentOpponent[]>([])
  const [frequentOpponentsLoading, setFrequentOpponentsLoading] = useState(false)
  const [playerExtras, setPlayerExtras] = useState<PlayerExtras | null>(null)
  const [playerExtrasLoading, setPlayerExtrasLoading] = useState(false)
  const [globalDukeRows, setGlobalDukeRows] = useState<GlobalDukeRowSlim[]>([])
  const [playerCountFilter, setPlayerCountFilter] = useState<PlayerCountFilter>('all')
  const [selectedStatsAnchorY, setSelectedStatsAnchorY] = useState<number | null>(null)
  const screenScrollRef = useRef<ScrollView | null>(null)
  const didDefaultSelectRef = useRef(false)
  const [selectedPlayerKey, setSelectedPlayerKey] = useState<string | null>(null)
  const [accountMenuVisible, setAccountMenuVisible] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [viewerUserId, setViewerUserId] = useState<string | null | undefined>(undefined)
  const didLoadOnceRef = useRef(false)
  const requestedPlayerKey =
    typeof params.playerKey === 'string' && params.playerKey.trim()
      ? params.playerKey.trim()
      : null

  const dukeOptions = useMemo(
    () =>
      cards
        .filter((card) => card.slug !== '00_duke')
        .map((card) => ({ slug: card.slug, name: card.name })),
    []
  )
  const accessState = useMemo(
    () =>
      viewerUserId === undefined
        ? null
        : buildProtectedAnalyticsAccessState('/player-stats', viewerUserId),
    [viewerUserId]
  )
  const analyticsRouteSegments = useMemo(
    () => buildAnalyticsRouteToggleSegments('players'),
    []
  )

  const loadLeaderboard = useCallback(async () => {
    const { leaderboardView, dukeView } = getPlayerStatsViewNames(timeWindow)
    const sourceView = dukeFilter === 'all' ? leaderboardView : dukeView

    setLoading(true)
    setLoadError('')

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) throw sessionError

      const nextViewerUserId = resolveProtectedAnalyticsViewerUserId(session)
      setViewerUserId(nextViewerUserId)

      if (!nextViewerUserId) {
        setAllPlayers([])
        setPlayerDukeStats([])
        setSelectedPlayerKey(null)
        return
      }

      let leaderboardQuery = supabase
        .from(sourceView)
        .select('*')
        .order('wins', { ascending: false })
        .order('avg_score', { ascending: false })
        .order('avg_finish', { ascending: true })

      if (dukeFilter !== 'all') {
        leaderboardQuery = leaderboardQuery.eq('duke_slug', dukeFilter)
      }

      const { data, error } = await leaderboardQuery

      if (error) throw error

      setAllPlayers(resolvePlayerLeaderboardRows((data ?? []) as PlayerLeaderboardRow[]))
      didLoadOnceRef.current = true
    } catch (err: any) {
      console.error(err)
      setLoadError(err?.message ?? 'Unable to load player analytics right now. Pull to retry.')
    } finally {
      setLoading(false)
    }
  }, [dukeFilter, timeWindow])

  const players = useMemo(() => filterPlayers(allPlayers, query), [allPlayers, query])

  const selectedPlayer = useMemo(
    () => players.find((player) => player.player_key === selectedPlayerKey) ?? null,
    [players, selectedPlayerKey]
  )
  const selectedPlayerInsights = useMemo(
    () => deriveSelectedPlayerInsights(playerDukeStats),
    [playerDukeStats]
  )
  const selectedSummaryItems = useMemo(() => {
    if (!selectedPlayer) return []

    return [
      { label: 'Games', value: String(selectedPlayer.games_played) },
      { label: 'Win Rate', value: `${selectedPlayer.win_rate.toFixed(1)}%` },
      { label: 'Podium Rate', value: `${selectedPlayer.podium_rate.toFixed(1)}%` },
      { label: 'Norm Finish', value: selectedPlayer.avg_finish_percentile.toFixed(1) },
    ]
  }, [selectedPlayer])
  const activeDukeName = useMemo(() => {
    if (dukeFilter === 'all') return null
    return dukeOptions.find((duke) => duke.slug === dukeFilter)?.name ?? null
  }, [dukeFilter, dukeOptions])
  const dukeSearchResults = useMemo(() => {
    return filterDukesByQuery(dukeOptions, dukeQuery).slice(0, 6)
  }, [dukeOptions, dukeQuery])

  const loadSelectedPlayerStats = useCallback(
    async (playerKey: string | null) => {
      if (!playerKey) {
        setPlayerDukeStats([])
        setPlayerCategoryStats(null)
        setSelectedStatsLoading(false)
        setCategoryStatsLoading(false)
        return
      }

      const { dukeView } = getPlayerStatsViewNames(timeWindow)

      setSelectedStatsLoading(true)
      setPlayerDukeStats([])
      setLoadError('')

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) throw sessionError

        const nextViewerUserId = resolveProtectedAnalyticsViewerUserId(session)
        setViewerUserId(nextViewerUserId)

        if (!nextViewerUserId) {
          setPlayerDukeStats([])
          setPlayerCategoryStats(null)
          return
        }

        let dukeStatsQuery = supabase
          .from(dukeView)
          .select('*')
          .eq('player_key', playerKey)
          .order('wins', { ascending: false })
          .order('win_rate', { ascending: false })
          .order('avg_finish_percentile', { ascending: false })
          .order('avg_score', { ascending: false })

        if (dukeFilter !== 'all') {
          dukeStatsQuery = dukeStatsQuery.eq('duke_slug', dukeFilter)
        }

        const { data, error } = await dukeStatsQuery

        if (error) throw error

        setPlayerDukeStats(resolvePlayerDukeRows((data ?? []) as PlayerDukeRow[]))

        try {
          setCategoryStatsLoading(true)
          const categoryStats = await loadPlayerCategoryStats(playerKey)
          setPlayerCategoryStats(categoryStats)
        } catch (categoryErr) {
          console.error('Failed to load category breakdown', categoryErr)
          setPlayerCategoryStats(null)
        } finally {
          setCategoryStatsLoading(false)
        }
      } catch (err: any) {
        console.error(err)
        setPlayerDukeStats([])
        setLoadError(
          err?.message ?? "Unable to load this player's duke breakdown right now. Pull to retry."
        )
      } finally {
        setSelectedStatsLoading(false)
      }
    },
    [dukeFilter, timeWindow]
  )

  useEffect(() => {
    void loadLeaderboard()
  }, [loadLeaderboard])

  useEffect(() => {
    if (players.length === 0) {
      if (selectedPlayerKey !== null) {
        setSelectedPlayerKey(null)
        setPlayerDukeStats([])
        setPlayerCategoryStats(null)
      }
      return
    }

    if (requestedPlayerKey) {
      const requestedPlayer = players.find(
        (player) => player.player_key === requestedPlayerKey
      )
      if (requestedPlayer && selectedPlayerKey !== requestedPlayer.player_key) {
        didDefaultSelectRef.current = true
        setSelectedPlayerKey(requestedPlayer.player_key)
        return
      }
    }

    if (!selectedPlayerKey || !players.some((player) => player.player_key === selectedPlayerKey)) {
      const viewerKey = viewerUserId ? `user:${viewerUserId}` : null
      const viewerRow = viewerKey
        ? players.find((player) => player.player_key === viewerKey)
        : null

      if (!didDefaultSelectRef.current && viewerRow) {
        didDefaultSelectRef.current = true
        setSelectedPlayerKey(viewerRow.player_key)
      } else {
        setSelectedPlayerKey(players[0].player_key)
      }
    }
  }, [players, requestedPlayerKey, selectedPlayerKey, viewerUserId])

  useEffect(() => {
    void loadSelectedPlayerStats(selectedPlayerKey)
  }, [loadSelectedPlayerStats, selectedPlayerKey])

  const retryAll = useCallback(async () => {
    await loadLeaderboard()
    await loadSelectedPlayerStats(selectedPlayerKey)
  }, [loadLeaderboard, loadSelectedPlayerStats, selectedPlayerKey])

  async function onRefresh() {
    try {
      setRefreshing(true)
      await retryAll()
    } finally {
      setRefreshing(false)
    }
  }

  const leaderboard = useMemo(() => players.slice(0, 30), [players])

  const winRatePercentile: PercentileResult | null = useMemo(() => {
    if (!viewerUserId) return null
    return computePercentileResult(allPlayers, `user:${viewerUserId}`, 'win_rate')
  }, [allPlayers, viewerUserId])
  const avgScorePercentile: PercentileResult | null = useMemo(() => {
    if (!viewerUserId) return null
    return computePercentileResult(allPlayers, `user:${viewerUserId}`, 'avg_score')
  }, [allPlayers, viewerUserId])
  const podiumPercentile: PercentileResult | null = useMemo(() => {
    if (!viewerUserId) return null
    return computePercentileResult(allPlayers, `user:${viewerUserId}`, 'podium_rate')
  }, [allPlayers, viewerUserId])

  const dukeVsGlobalRows: DukeVsGlobalRow[] = useMemo(() => {
    if (playerDukeStats.length === 0 || globalDukeRows.length === 0) return []
    return buildDukeVsGlobalRows(
      playerDukeStats.map((row) => ({
        duke_slug: row.duke_slug,
        games_played: row.games_played,
        wins: row.wins,
        win_rate: row.win_rate,
        avg_score: row.avg_score,
      })),
      globalDukeRows
    )
  }, [playerDukeStats, globalDukeRows])

  const finishDistribution: FinishDistribution = playerExtras?.finishDistribution ?? {
    '1st': 0,
    '2nd': 0,
    '3rd': 0,
    '4th+': 0,
    total: 0,
  }
  const isViewerSelected =
    !!viewerUserId && selectedPlayerKey === `user:${viewerUserId}`

  const refreshFrequentOpponents = useCallback(async () => {
    if (!viewerUserId) {
      setFrequentOpponents([])
      return
    }
    try {
      setFrequentOpponentsLoading(true)
      const opponents = await loadFrequentOpponents(viewerUserId, 5)
      setFrequentOpponents(opponents)
    } catch (err) {
      console.error('Failed to load frequent opponents', err)
      setFrequentOpponents([])
    } finally {
      setFrequentOpponentsLoading(false)
    }
  }, [viewerUserId])

  useEffect(() => {
    void refreshFrequentOpponents()
  }, [refreshFrequentOpponents])

  useEffect(() => {
    if (!viewerUserId) {
      setPlayerExtras(null)
      return
    }
    let cancelled = false
    setPlayerExtrasLoading(true)
    void loadPlayerExtras(`user:${viewerUserId}`, playerCountFilter)
      .then((extras) => {
        if (cancelled) return
        setPlayerExtras(extras)
      })
      .catch((err) => {
        console.error('Failed to load player extras', err)
        if (!cancelled) setPlayerExtras(null)
      })
      .finally(() => {
        if (!cancelled) setPlayerExtrasLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [viewerUserId, playerCountFilter])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('duke_global_stats')
          .select('duke_slug, games_played, win_percentage, avg_score')
        if (error) throw error
        if (cancelled) return
        setGlobalDukeRows((data ?? []) as GlobalDukeRowSlim[])
      } catch (err) {
        console.error('Failed to load global duke stats', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])
  const useStackedLeaderboardCards = Number.isFinite(width) && width < 430
  const handleDukeQueryChange = useCallback(
    (value: string) => {
      setDukeQuery(value)

      if (dukeFilter !== 'all') {
        setDukeFilter('all')
      }
    },
    [dukeFilter]
  )
  const handleApplyDukeFilter = useCallback(
    (slug: string) => {
      const nextName = dukeOptions.find((duke) => duke.slug === slug)?.name ?? ''
      setDukeFilter(slug)
      setDukeQuery(nextName)
    },
    [dukeOptions]
  )
  const handleClearDukeFilter = useCallback(() => {
    setDukeFilter('all')
    setDukeQuery('')
  }, [])
  const handleSubmitDukeSearch = useCallback(() => {
    if (dukeSearchResults.length === 0) return

    const normalizedQuery = dukeQuery.trim().toLowerCase()
    const nextMatch =
      dukeSearchResults.find((duke) => duke.name.toLowerCase() === normalizedQuery) ??
      dukeSearchResults[0]

    handleApplyDukeFilter(nextMatch.slug)
  }, [dukeQuery, dukeSearchResults, handleApplyDukeFilter])
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
  const accountMenuActions = useMemo(
    () =>
      buildBoundManageAccountMenuActions({
        onManageData: () => router.push('/manage-data'),
        onNewSession: () => router.replace('/create-session'),
        onDukeStatistics: () => router.push('/duke-stats'),
        onPlayerStatistics: () => router.push('/player-stats'),
        onGlobalTrends: () => router.push('/global-trends'),
        onSoloStatistics: () => router.push('/solo-stats' as never),
        onAbout: () => router.push('/about'),
        onLogout: () => {
          void handleLogout()
        },
      }),
    [handleLogout]
  )
  const openAccountActions = useCallback(() => {
    setAccountMenuVisible(true)
  }, [])

  const scrollToSelectedStats = useCallback(() => {
    const target = selectedStatsAnchorY
    if (target === null) return
    requestAnimationFrame(() => {
      screenScrollRef.current?.scrollTo({ y: Math.max(0, target - 8), animated: true })
    })
  }, [selectedStatsAnchorY])

  const handleLeaderboardLongPress = useCallback(
    (playerKey: string) => {
      setSelectedPlayerKey(playerKey)
      scrollToSelectedStats()
    },
    [scrollToSelectedStats]
  )

  const handleFrequentOpponentTap = useCallback((playerKey: string) => {
    setSelectedPlayerKey(playerKey)
  }, [])

  const handleFrequentOpponentLongPress = useCallback(
    (playerKey: string) => {
      setSelectedPlayerKey(playerKey)
      scrollToSelectedStats()
    },
    [scrollToSelectedStats]
  )
  const handleAnalyticsRouteChange = useCallback(
    (key: string) => {
      const nextSegment = analyticsRouteSegments.find((segment) => segment.key === key)
      if (!nextSegment || nextSegment.href === analyticsRouteHrefByKey.players) {
        return
      }

      router.push(nextSegment.href as never)
    },
    [analyticsRouteSegments]
  )

  return (
    // Card-art ImageBackground was removed from this data-dense screen so
    // the leaderboard and percentile cards render against a clean dark
    // backdrop instead of competing with a textured underlay.
    <View style={styles.pageBackground}>
      <View style={styles.pageScrim}>
        <ScrollView
          ref={screenScrollRef}
          style={styles.container}
          contentContainerStyle={[styles.content, { paddingBottom: getBottomNavClearance(insets.bottom) }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.accent}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <ValeriaHeader
            compact
            showBack
            title="Player Stats"
            subtitle="Global leaderboard + duke breakdown"
            {...manageAccountHeaderProps}
            onRightPress={openAccountActions}
            rightDisabled={loggingOut}
          />

          <AnalyticsSegmentedControl
            segments={analyticsRouteSegments}
            activeKey="players"
            onChange={handleAnalyticsRouteChange}
          />

          <PlayerStatsHeroCard
            query={query}
            timeWindow={timeWindow}
            dukeQuery={dukeQuery}
            activeDukeName={activeDukeName}
            dukeResults={dukeSearchResults}
            onQueryChange={setQuery}
            onTimeWindowChange={setTimeWindow}
            onDukeQueryChange={handleDukeQueryChange}
            onSubmitDukeSearch={handleSubmitDukeSearch}
            onApplyDukeFilter={handleApplyDukeFilter}
            onClearDukeFilter={handleClearDukeFilter}
          />

          {accessState && !accessState.canLoad ? (
            <View style={styles.accessCard}>
              <Text style={styles.accessTitle}>{accessState.title}</Text>
              <Text style={styles.accessText}>{accessState.body}</Text>

              <Pressable
                style={({ pressed }) => [styles.accessButton, pressed && styles.buttonPressed]}
                onPress={() => router.push(accessState.actionPath)}
              >
                <Text style={styles.accessButtonText}>{accessState.actionLabel}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <PlayerCountFilterChips
                value={playerCountFilter}
                onChange={setPlayerCountFilter}
                label="Filter your stats by player count"
              />

              <FrequentOpponentsCard
                opponents={frequentOpponents}
                loading={frequentOpponentsLoading}
                onSelect={handleFrequentOpponentTap}
                onLongPress={handleFrequentOpponentLongPress}
              />

              {loadError ? (
                <View style={styles.errorCard}>
                  <Text style={styles.errorTitle}>Unable to refresh player analytics</Text>
                  <Text style={styles.errorText}>
                    {loadError}
                    {didLoadOnceRef.current && allPlayers.length > 0
                      ? ' Showing the last successful leaderboard below.'
                      : ''}
                  </Text>

                  <Pressable
                    style={({ pressed }) => [styles.errorButton, pressed && styles.buttonPressed]}
                    onPress={() => {
                      void retryAll()
                    }}
                  >
                    <Text style={styles.errorButtonText}>Retry</Text>
                  </Pressable>
                </View>
              ) : null}

              <PlayerLeaderboardSection
                leaderboard={leaderboard}
                loading={loading}
                stackedLayout={useStackedLeaderboardCards}
                selectedPlayerKey={selectedPlayerKey}
                onSelect={setSelectedPlayerKey}
                onLongPress={handleLeaderboardLongPress}
              />

              {viewerUserId ? (
                <>
                  <HeadToHeadCard
                    records={playerExtras?.headToHead ?? []}
                    loading={playerExtrasLoading}
                  />
                  <FinishDistributionCard distribution={finishDistribution} />
                  <PercentileGroupCard
                    winRate={winRatePercentile}
                    avgScore={avgScorePercentile}
                    podiumRate={podiumPercentile}
                    totalPlayers={allPlayers.length}
                  />
                </>
              ) : null}

              <View
                onLayout={(event) =>
                  setSelectedStatsAnchorY(event.nativeEvent.layout.y)
                }
              >
                <PlayerSelectedStatsSection
                  player={selectedPlayer}
                  summaryItems={selectedSummaryItems}
                  insights={selectedPlayerInsights}
                  loading={selectedStatsLoading}
                  dukeRows={playerDukeStats}
                />

                {selectedPlayer && isViewerSelected ? (
                  <DukeVsGlobalCard rows={dukeVsGlobalRows} />
                ) : null}

                {selectedPlayer ? (
                  <PlayerCategoryBreakdownCard
                    stats={playerCategoryStats}
                    loading={categoryStatsLoading}
                    emptyHint={
                      selectedPlayer.player_type === 'guest'
                        ? "No locked games where you've shared this guest's data."
                        : 'No locked games visible for this player yet.'
                    }
                  />
                ) : null}
              </View>
            </>
          )}
        </ScrollView>

        <ManageAccountModal
          visible={accountMenuVisible}
          title={manageAccountAlertCopy.title}
          message={manageAccountAlertCopy.message}
          actions={accountMenuActions}
          onRequestClose={() => setAccountMenuVisible(false)}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  pageBackground: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  pageScrim: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 30, 0.83)',
  },

  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  content: {
    padding: 10,
    paddingTop: 4,
    paddingBottom: 24,
  },

  errorCard: {
    backgroundColor: 'rgba(255, 126, 138, 0.1)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.error,
    padding: 14,
    marginBottom: 12,
  },

  errorTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },

  errorText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },

  errorButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: playerStatsSurface.panelRaised,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.error,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  errorButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  accessCard: {
    backgroundColor: playerStatsSurface.panel,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
    padding: 16,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  accessTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },

  accessText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },

  accessButton: {
    alignSelf: 'flex-start',
    marginTop: 14,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...theme.shadow.glow,
  },

  accessButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
})
