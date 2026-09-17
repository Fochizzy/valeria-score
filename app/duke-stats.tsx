import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import AnalyticsSegmentedControl from '../components/AnalyticsSegmentedControl'
import DukeGlobalAnalyticsPanel from '../components/DukeGlobalAnalyticsPanel'
import DukeInputProfilePanel from '../components/DukeInputProfilePanel'
import DukeInputMixHeatmapCard from '../components/DukeInputMixHeatmapCard'
import DukeLeaderboardSection from '../components/DukeLeaderboardSection'
import PlayerCategoryBreakdownCard from '../components/PlayerCategoryBreakdownCard'
import DukeStatsHeroCard from '../components/DukeStatsHeroCard'
import DukeVolatilityCard from '../components/DukeVolatilityCard'
import ManageAccountModal from '../components/ManageAccountModal'
import PlayerCountFilterChips from '../components/PlayerCountFilterChips'
import ValeriaHeader from '../components/ValeriaHeader'
import { playerStatsSurface } from '../constants/analyticsPageSurface'
import { theme } from '../constants/theme'
import { Alert } from '../lib/themed-alert'
import {
  analyticsRouteHrefByKey,
  buildAnalyticsRouteToggleSegments,
} from '../lib/analytics-route-toggle'
import {
  resolveDukeStatsRows,
  type DukeStatsRow,
  type ResolvedDukeStatsRow,
} from '../lib/duke-stats-data'
import {
  resolveDukeInputProfileRows,
  resolveGlobalGameMarginRows,
  resolveGlobalInputProfileRows,
  type DukeInputProfileRow,
  type GlobalGameMarginRow,
  type RawDukeInputProfileRow,
  type RawGlobalGameMarginRow,
  type RawGlobalInputProfileRow,
} from '../lib/duke-input-analytics'
import {
  buildBoundManageAccountMenuActions,
  manageAccountAlertCopy,
} from '../lib/manage-account-menu'
import { getBottomNavClearance } from '../lib/bottom-nav-layout'
import { logoutAndClearActiveSessionState } from '../lib/logout'
import {
  buildProtectedAnalyticsAccessState,
  resolveProtectedAnalyticsViewerUserId,
} from '../lib/protected-analytics-access'
import { buildDukeStatsScreenState } from '../lib/duke-stats-screen-state'
import { loadDukeExtras, type DukeExtras } from '../lib/duke-extras-fetch'
import { buildDukeBreakdownInsights } from '../lib/duke-breakdown-insights'
import { loadDukeCategoryStats } from '../lib/duke-category-stats-fetch'
import type { PlayerCountFilter } from '../lib/player-count-filter'
import type { PlayerCategoryStats } from '../lib/score-category-breakdown'
import { clearActiveSessionState } from '../lib/sessions'
import { supabase } from '../lib/supabase'

type DukeStatsTab = 'leaderboard' | 'breakdown' | 'selected' | 'global'

function hasInputAnalyticsColumns(rows: DukeStatsRow[]) {
  if (rows.length === 0) return true

  return rows.some((row) => {
    return (
      Object.prototype.hasOwnProperty.call(row, 'top_input_stat_key') ||
      Object.prototype.hasOwnProperty.call(row, 'winning_edge_stat_key')
    )
  })
}

function isMissingDukeInputAnalyticsError(message: string) {
  const normalized = message.toLowerCase()

  return (
    normalized.includes('duke_input_stat_profiles') &&
    (normalized.includes('does not exist') ||
      normalized.includes('not found') ||
      normalized.includes('relation'))
  )
}

export default function DukeStatsScreen() {
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const [activeTab, setActiveTab] = useState<DukeStatsTab>('leaderboard')
  const [rows, setRows] = useState<ResolvedDukeStatsRow[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [loadError, setLoadError] = useState('')
  const [accountMenuVisible, setAccountMenuVisible] = useState(false)
  const [selectedDukeSlug, setSelectedDukeSlug] = useState<string | null>(null)
  const [detailRows, setDetailRows] = useState<DukeInputProfileRow[]>([])
  const [globalRows, setGlobalRows] = useState<DukeInputProfileRow[]>([])
  const [globalMarginRows, setGlobalMarginRows] = useState<GlobalGameMarginRow[]>([])
  const [detailDukeSlug, setDetailDukeSlug] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [globalAnalyticsError, setGlobalAnalyticsError] = useState('')
  const [inputAnalyticsAvailable, setInputAnalyticsAvailable] = useState(true)
  const [viewerUserId, setViewerUserId] = useState<string | null | undefined>(undefined)
  const [dukeExtras, setDukeExtras] = useState<DukeExtras | null>(null)
  const [dukeExtrasLoading, setDukeExtrasLoading] = useState(false)
  const [playerCountFilter, setPlayerCountFilter] = useState<PlayerCountFilter>('all')
  const [dukeCategoryStats, setDukeCategoryStats] = useState<PlayerCategoryStats | null>(null)
  const [dukeCategoryLoading, setDukeCategoryLoading] = useState(false)
  const didLoadOnceRef = useRef(false)
  const detailRequestRef = useRef(0)

  const accessState = useMemo(
    () =>
      viewerUserId === undefined
        ? null
        : buildProtectedAnalyticsAccessState('/duke-stats', viewerUserId),
    [viewerUserId]
  )
  const analyticsRouteSegments = useMemo(
    () => buildAnalyticsRouteToggleSegments('dukes'),
    []
  )

  const load = useCallback(async () => {
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
        setRows([])
        setSelectedDukeSlug(null)
        setDetailRows([])
        setGlobalRows([])
        setGlobalMarginRows([])
        setDetailDukeSlug(null)
        setDetailError('')
        setGlobalAnalyticsError('')
        return
      }

      const [dukeResult, globalProfileResult, globalMarginResult] = await Promise.all([
        supabase.from('duke_global_stats').select('*').order('win_percentage', { ascending: false }),
        supabase
          .from('global_input_stat_profiles')
          .select('*')
          .eq('profile_scope', 'all_games')
          .order('points_share', { ascending: false }),
        supabase.from('global_game_margin_stats').select('*'),
      ])

      if (dukeResult.error) throw dukeResult.error

      const safeRows = (dukeResult.data ?? []) as DukeStatsRow[]
      setRows(resolveDukeStatsRows(safeRows))
      setInputAnalyticsAvailable(hasInputAnalyticsColumns(safeRows))
      setGlobalRows(
        globalProfileResult.error
          ? []
          : resolveGlobalInputProfileRows((globalProfileResult.data ?? []) as RawGlobalInputProfileRow[])
      )
      setGlobalMarginRows(
        globalMarginResult.error
          ? []
          : resolveGlobalGameMarginRows((globalMarginResult.data ?? []) as RawGlobalGameMarginRow[])
      )
      setGlobalAnalyticsError(
        globalProfileResult.error || globalMarginResult.error
          ? 'Some global trend cards could not be refreshed right now.'
          : ''
      )
      setDetailRows([])
      setDetailDukeSlug(null)
      setDetailError('')
      didLoadOnceRef.current = true
    } catch (err: any) {
      console.error(err)
      setLoadError(err?.message ?? 'Unable to load duke analytics right now. Pull to retry.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!viewerUserId || !selectedDukeSlug) {
      setDukeCategoryStats(null)
      return
    }
    let cancelled = false
    setDukeCategoryLoading(true)
    void loadDukeCategoryStats(selectedDukeSlug, playerCountFilter)
      .then((stats) => {
        if (!cancelled) setDukeCategoryStats(stats)
      })
      .catch((err) => {
        console.error('Failed to load duke category stats', err)
        if (!cancelled) setDukeCategoryStats(null)
      })
      .finally(() => {
        if (!cancelled) setDukeCategoryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [viewerUserId, selectedDukeSlug, playerCountFilter])

  useEffect(() => {
    if (!viewerUserId) {
      setDukeExtras(null)
      return
    }
    let cancelled = false
    setDukeExtrasLoading(true)
    void loadDukeExtras(playerCountFilter)
      .then((extras) => {
        if (cancelled) return
        setDukeExtras(extras)
      })
      .catch((err) => {
        console.error('Failed to load duke extras', err)
        if (!cancelled) setDukeExtras(null)
      })
      .finally(() => {
        if (!cancelled) setDukeExtrasLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [viewerUserId, playerCountFilter])

  const loadSelectedDukeProfile = useCallback(async (dukeSlug: string) => {
    const requestId = detailRequestRef.current + 1
    detailRequestRef.current = requestId

    setDetailLoading(true)
    setDetailError('')
    setDetailRows([])
    setDetailDukeSlug(dukeSlug)

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) throw sessionError

      const nextViewerUserId = resolveProtectedAnalyticsViewerUserId(session)
      setViewerUserId(nextViewerUserId)

      if (!nextViewerUserId) {
        setDetailRows([])
        setDetailDukeSlug(null)
        return
      }

      const { data, error } = await supabase
        .from('duke_input_stat_profiles')
        .select('*')
        .eq('duke_slug', dukeSlug)

      if (requestId !== detailRequestRef.current) return
      if (error) throw error

      setDetailRows(resolveDukeInputProfileRows((data ?? []) as RawDukeInputProfileRow[]))
    } catch (err: any) {
      if (requestId !== detailRequestRef.current) return

      const message = err?.message ?? 'Unable to load duke trends right now. Pull to retry.'

      if (isMissingDukeInputAnalyticsError(message)) {
        setInputAnalyticsAvailable(false)
        setDetailRows([])
        setDetailDukeSlug(null)
        setDetailError('')
        return
      }

      console.error(err)
      setDetailError(message)
    } finally {
      if (requestId === detailRequestRef.current) {
        setDetailLoading(false)
      }
    }
  }, [])

  const screenState = useMemo(
    () =>
      buildDukeStatsScreenState({
        rows,
        search,
        selectedDukeSlug,
        detailRows,
        detailDukeSlug,
        detailError,
        detailLoading,
      }),
    [
      rows,
      search,
      selectedDukeSlug,
      detailRows,
      detailDukeSlug,
      detailError,
      detailLoading,
    ]
  )

  useEffect(() => {
    if (screenState.selectedDukeSlug !== selectedDukeSlug) {
      setSelectedDukeSlug(screenState.selectedDukeSlug)
    }
  }, [screenState.selectedDukeSlug, selectedDukeSlug])

  useEffect(() => {
    const dukeSlug = screenState.selectedDukeSlug
    if (!inputAnalyticsAvailable || !dukeSlug) return

    if (detailDukeSlug === dukeSlug && (detailRows.length > 0 || detailLoading || detailError)) {
      return
    }

    void loadSelectedDukeProfile(dukeSlug)
  }, [
    detailDukeSlug,
    detailError,
    detailLoading,
    detailRows.length,
    inputAnalyticsAvailable,
    loadSelectedDukeProfile,
    screenState.selectedDukeSlug,
  ])

  const retryAll = useCallback(async () => {
    await load()

    if (screenState.selectedDukeSlug && inputAnalyticsAvailable) {
      await loadSelectedDukeProfile(screenState.selectedDukeSlug)
    }
  }, [inputAnalyticsAvailable, load, loadSelectedDukeProfile, screenState.selectedDukeSlug])

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true)
      await retryAll()
    } finally {
      setRefreshing(false)
    }
  }, [retryAll])

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setActiveTab('leaderboard')
  }, [])

  const handleSelectDuke = useCallback((dukeSlug: string) => {
    setSelectedDukeSlug(dukeSlug)
    setActiveTab('selected')
  }, [])

  const handleSubmitSearch = useCallback(() => {
    Keyboard.dismiss()

    if (screenState.filteredRows.length === 0) {
      setSelectedDukeSlug(null)
      setActiveTab('leaderboard')
      return
    }

    const nextSlug = screenState.filteredRows.some(
      (row) => row.duke_slug === screenState.selectedDukeSlug
    )
      ? screenState.selectedDukeSlug
      : screenState.filteredRows[0].duke_slug

    setSelectedDukeSlug(nextSlug ?? null)
    setActiveTab('selected')
  }, [screenState.filteredRows, screenState.selectedDukeSlug])

  const tabLayoutMode = width < 430 ? 'fitCompact' : 'fit'
  const tabSegments = useMemo(() => {
    const selectedName = screenState.selectedRow?.duke_name
    const selectedLabel = selectedName ? `Selected — ${selectedName}` : 'Selected Duke'
    return [
      { key: 'leaderboard', label: 'Leaderboard', badge: screenState.filteredRows.length },
      { key: 'breakdown', label: 'Duke Breakdown' },
      { key: 'selected', label: selectedLabel },
      { key: 'global', label: 'Across Games' },
    ]
  }, [screenState.filteredRows.length, screenState.selectedRow?.duke_name])
  const handleLogout = useCallback(async () => {
    try {
      await logoutAndClearActiveSessionState({
        signOut: () => supabase.auth.signOut(),
        clearActiveSessionState,
      })
      router.replace('/')
    } catch (err: any) {
      Alert.alert('Logout failed', err?.message ?? 'Unknown error')
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
  const handleAnalyticsRouteChange = useCallback(
    (key: string) => {
      const nextSegment = analyticsRouteSegments.find((segment) => segment.key === key)
      if (!nextSegment || nextSegment.href === analyticsRouteHrefByKey.dukes) {
        return
      }

      router.push(nextSegment.href as never)
    },
    [analyticsRouteSegments]
  )

  const activePanel = useMemo(() => {
    if (activeTab === 'leaderboard') {
      return (
        <>
          <PlayerCountFilterChips
            value={playerCountFilter}
            onChange={setPlayerCountFilter}
            label="Filter by player count"
          />
          <DukeLeaderboardSection
            rows={screenState.filteredRows}
            totalRows={rows.length}
            loading={loading}
            selectedDukeSlug={screenState.selectedDukeSlug}
            inputAnalyticsAvailable={inputAnalyticsAvailable}
            onSelect={handleSelectDuke}
            onOpenSessions={() => router.push('/create-session')}
          />
        </>
      )
    }

    if (activeTab === 'breakdown') {
      const breakdownInsights = buildDukeBreakdownInsights({
        inputMix: dukeExtras?.inputMix ?? [],
        volatility: dukeExtras?.volatility ?? [],
      })
      return (
        <>
          <PlayerCountFilterChips
            value={playerCountFilter}
            onChange={setPlayerCountFilter}
            label="Filter by player count"
          />
          {breakdownInsights.length > 0 ? (
            <View style={styles.breakdownInsightsCard}>
              <Text style={styles.breakdownInsightsKicker}>Across All Dukes</Text>
              {breakdownInsights.map((insight) => (
                <View key={insight.title} style={styles.breakdownInsightItem}>
                  <Text style={styles.breakdownInsightTitle}>{insight.title}</Text>
                  <Text style={styles.breakdownInsightBody}>{insight.body}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <DukeInputMixHeatmapCard
            entries={dukeExtras?.inputMix ?? []}
            loading={dukeExtrasLoading}
          />
          <DukeVolatilityCard entries={dukeExtras?.volatility ?? []} />
        </>
      )
    }

    if (activeTab === 'selected') {
      if (!screenState.selectedRow) {
        return (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>No duke selected yet</Text>
            <Text style={styles.noticeText}>
              Pick a duke from the leaderboard to open its icon mix, monster profile, and win
              pattern.
            </Text>
          </View>
        )
      }

      if (!inputAnalyticsAvailable) {
        return (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>{screenState.selectedRow.duke_name}</Text>
            <Text style={styles.noticeText}>
              Detailed icon trends are unavailable right now, but the leaderboard still tracks this
              duke&apos;s win rate, scoring pace, and strongest player callouts.
            </Text>
          </View>
        )
      }

      return (
        <>
          <DukeInputProfilePanel
            row={screenState.selectedRow}
            state={screenState.detailState}
            loading={screenState.detailLoading}
            error={screenState.detailError}
            onRetry={() => {
              if (screenState.selectedDukeSlug) {
                void loadSelectedDukeProfile(screenState.selectedDukeSlug)
              }
            }}
          />
          <PlayerCategoryBreakdownCard
            stats={dukeCategoryStats}
            loading={dukeCategoryLoading}
            kicker="Point Distribution"
            title={`Where ${screenState.selectedRow.duke_name}'s Points Come From`}
            emptyHint="No locked games for this duke yet — distribution will appear once games are tracked."
          />
        </>
      )
    }

    if (loading && !didLoadOnceRef.current) {
      return (
        <View style={styles.noticeCard}>
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={styles.noticeTitle}>Loading global trends...</Text>
          <Text style={styles.noticeText}>Pulling tracked score-family and close-game data.</Text>
        </View>
      )
    }

    if (globalRows.length === 0 && globalMarginRows.length === 0 && !globalAnalyticsError) {
      return (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>No global trends yet</Text>
          <Text style={styles.noticeText}>
            Finish a tracked game to unlock the score-family mix and close-game callouts.
          </Text>
        </View>
      )
    }

    return (
      <DukeGlobalAnalyticsPanel
        rows={globalRows}
        marginRows={globalMarginRows}
        error={globalAnalyticsError}
        selectedDukeName={screenState.selectedRow?.duke_name ?? null}
      />
    )
  }, [
    activeTab,
    didLoadOnceRef,
    dukeCategoryLoading,
    dukeCategoryStats,
    dukeExtras?.inputMix,
    dukeExtras?.volatility,
    dukeExtrasLoading,
    globalAnalyticsError,
    globalMarginRows,
    globalRows,
    handleSelectDuke,
    inputAnalyticsAvailable,
    loadSelectedDukeProfile,
    loading,
    playerCountFilter,
    rows.length,
    screenState.detailError,
    screenState.detailLoading,
    screenState.detailState,
    screenState.filteredRows,
    screenState.selectedDukeSlug,
    screenState.selectedRow,
  ])

  return (
    // Card-art ImageBackground was removed from this data-dense screen so
    // the leaderboard and analytics panels render against a clean dark
    // backdrop instead of competing with a textured underlay.
    <View style={styles.pageBackground}>
      <View style={styles.pageScrim}>
        <ScrollView
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
            title="Duke Stats"
            subtitle="Leaderboard + icon trends"
          />

          <AnalyticsSegmentedControl
            segments={analyticsRouteSegments}
            activeKey="dukes"
            onChange={handleAnalyticsRouteChange}
          />

          <DukeStatsHeroCard
            totalCount={rows.length}
            visibleCount={screenState.filteredRows.length}
            search={search}
            onSearchChange={handleSearchChange}
            onSubmitSearch={handleSubmitSearch}
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
              {loadError ? (
                <View style={styles.errorCard}>
                  <Text style={styles.errorTitle}>Unable to refresh duke analytics</Text>
                  <Text style={styles.errorText}>
                    {loadError}
                    {didLoadOnceRef.current && rows.length > 0
                      ? ' Showing the last successful duke stats below.'
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

              <AnalyticsSegmentedControl
                segments={tabSegments}
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key as DukeStatsTab)}
                layoutMode={tabLayoutMode}
              />

              {activePanel}
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

  breakdownInsightsCard: {
    backgroundColor: 'rgba(48, 33, 80, 0.85)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },

  breakdownInsightsKicker: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  breakdownInsightItem: {
    gap: 4,
  },

  breakdownInsightTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  breakdownInsightBody: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },

  noticeCard: {
    backgroundColor: playerStatsSurface.panel,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  noticeTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 10,
    marginBottom: 4,
  },

  noticeText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },

  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
})
