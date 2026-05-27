import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import FrequentOpponentsCard from '../components/FrequentOpponentsCard'
import ManageAccountModal from '../components/ManageAccountModal'
import ValeriaHeader from '../components/ValeriaHeader'
import { theme } from '../constants/theme'
import { Alert } from '../lib/themed-alert'
import { getBottomNavClearance } from '../lib/bottom-nav-layout'
import { formatDukeName } from '../lib/duke-names'
import { loadFrequentOpponents } from '../lib/frequent-opponents-fetch'
import type { FrequentOpponent } from '../lib/frequent-opponents'
import { getGuestProfileLabels } from '../lib/guest-profile-identity'
import { logoutAndClearActiveSessionState } from '../lib/logout'
import {
  buildManageAccountMenuActions,
  manageAccountAlertCopy,
  manageAccountHeaderProps,
  type ManageAccountModalAction,
} from '../lib/manage-account-menu'
import {
  createEmptyProfileDashboard,
  resolveProfileDashboard,
  type ProfileDashboard,
} from '../lib/profile-dashboard-data'
import { buildProfilePlainLanguageInsights } from '../lib/p3-insights'
import { buildPlayerCategoryInsights, type CategoryInsight } from '../lib/category-insights'
import { loadPlayerCategoryStats } from '../lib/player-category-fetch'
import { buildProtectedAnalyticsAccessState } from '../lib/protected-analytics-access'
import { clearActiveSessionState } from '../lib/sessions'
import { supabase } from '../lib/supabase'

const pageSurface = {
  panel: 'rgba(25, 18, 43, 0.74)',
  panelAlt: 'rgba(31, 22, 52, 0.78)',
  panelRaised: 'rgba(38, 27, 63, 0.82)',
  inset: 'rgba(18, 24, 43, 0.74)',
}

type SessionStat = {
  sessionId: string
  dukeSlug: string
  totalScore: number
  rank: number
  playerCount: number
  updatedAt: string
}

type GuestProfile = ProfileDashboard['sharedGuestProfiles'][number]

type ProfileSummary = {
  games: number
  wins: number
  avgScore: number
}

function toDukeSlug(value: string | null | undefined): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed || trimmed === '-') return ''
  return trimmed.toLowerCase().replace(/\s+/g, '_')
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function getGuestAverageScore(guest: GuestProfile | null) {
  if (!guest) return 0

  const stats = guest.stats as any

  return toNumber(
    stats.avgScore ??
      stats.averageScore ??
      stats.avg_score ??
      stats.average_score ??
      stats.meanScore ??
      stats.mean_score,
    0
  )
}

function getGuestSummary(guest: GuestProfile | null): ProfileSummary {
  if (!guest) {
    return {
      games: 0,
      wins: 0,
      avgScore: 0,
    }
  }

  const stats = guest.stats as any

  return {
    games: toNumber(stats.totalGames ?? stats.games, 0),
    wins: toNumber(stats.wins, 0),
    avgScore: getGuestAverageScore(guest),
  }
}

function buildGuestInsights(guest: GuestProfile | null): CategoryInsight[] {
  if (!guest) return []

  const labels = getGuestProfileLabels(guest.display_name, guest.public_player_id)
  const stats = guest.stats as any
  const games = toNumber(stats.totalGames ?? stats.games, 0)
  const wins = toNumber(stats.wins, 0)
  const losses = toNumber(stats.losses, 0)
  const topDuke = formatDukeName(toDukeSlug(stats.topDuke), {
    emptyLabel: 'No Duke',
  })
  const winRate = games > 0 ? Math.round((wins / games) * 100) : 0
  const avgScore = getGuestAverageScore(guest)

  return [
    {
      title: 'Guest Record',
      body:
        games > 0
          ? `${labels.title} has ${wins} ${wins === 1 ? 'win' : 'wins'} and ${losses} ${
              losses === 1 ? 'loss' : 'losses'
            } across ${games} finalized ${games === 1 ? 'game' : 'games'}.`
          : `${labels.title} does not have any finalized games yet.`,
    },
    {
      title: 'Win Rate',
      body:
        games > 0
          ? `${labels.title} wins ${winRate}% of finalized games.`
          : 'Win rate will appear after this guest has locked scores.',
    },
    {
      title: 'Top Duke',
      body:
        topDuke === 'No Duke'
          ? 'No most-played duke is available yet.'
          : `${labels.title}'s top duke is ${topDuke}.`,
    },
    {
      title: 'Average Score',
      body:
        avgScore > 0
          ? `${labels.title} averages ${avgScore.toFixed(1)} PTS.`
          : 'Average score will appear once score history is available.',
    },
  ]
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{
    guestProfileId?: string
    guestName?: string
    guestPublicPlayerId?: string
  }>()

  const activeGuestProfileId =
    typeof params.guestProfileId === 'string' ? params.guestProfileId : ''

  const [dashboard, setDashboard] = useState<ProfileDashboard>(createEmptyProfileDashboard())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [accountMenuVisible, setAccountMenuVisible] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [viewerUserId, setViewerUserId] = useState<string | null | undefined>(undefined)
  const [categoryInsights, setCategoryInsights] = useState<CategoryInsight[]>([])
  const [frequentOpponents, setFrequentOpponents] = useState<FrequentOpponent[]>([])
  const [frequentOpponentsLoading, setFrequentOpponentsLoading] = useState(false)
  const didLoadOnceRef = useRef(false)

  const selectedGuest = useMemo(() => {
    if (!activeGuestProfileId) return null
    return (
      dashboard.sharedGuestProfiles.find((guest) => guest.id === activeGuestProfileId) ?? null
    )
  }, [activeGuestProfileId, dashboard.sharedGuestProfiles])

  const viewingGuestProfile = Boolean(activeGuestProfileId)
  const sharedGuestProfilesById = useMemo(
    () =>
      new Map(dashboard.sharedGuestProfiles.map((guest) => [guest.id, guest] as const)),
    [dashboard.sharedGuestProfiles]
  )

  const selectedGuestLabels = useMemo(() => {
    if (!selectedGuest) return null
    return getGuestProfileLabels(selectedGuest.display_name, selectedGuest.public_player_id)
  }, [selectedGuest])

  const activeDisplayName = useMemo(() => {
    if (selectedGuestLabels) return selectedGuestLabels.title

    if (viewingGuestProfile) {
      const fallbackName =
        typeof params.guestName === 'string' && params.guestName.trim()
          ? params.guestName.trim()
          : 'Guest Profile'
      return fallbackName
    }

    return dashboard.displayName
  }, [dashboard.displayName, params.guestName, selectedGuestLabels, viewingGuestProfile])

  const accessState = useMemo(
    () =>
      viewerUserId === undefined
        ? null
        : buildProtectedAnalyticsAccessState('/profile', viewerUserId),
    [viewerUserId]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError) throw authError

      setViewerUserId(user?.id ?? null)

      if (!user) {
        setDashboard(createEmptyProfileDashboard())
        setCategoryInsights([])
        return
      }

      const { data, error } = await supabase.rpc('get_profile_dashboard')

      if (error) throw error

      setDashboard(resolveProfileDashboard(data))
      didLoadOnceRef.current = true

      try {
        const categoryStats = await loadPlayerCategoryStats(`user:${user.id}`)
        setCategoryInsights(buildPlayerCategoryInsights(categoryStats))
      } catch (categoryErr) {
        console.error('Failed to load profile category insights', categoryErr)
        setCategoryInsights([])
      }
    } catch (err: any) {
      console.error(err)
      setLoadError(err?.message ?? 'Unable to load profile analytics right now. Pull to retry.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true)
      await load()
    } finally {
      setRefreshing(false)
    }
  }, [load])

  const history = useMemo(() => {
    if (viewingGuestProfile) return []
    return dashboard.history as SessionStat[]
  }, [dashboard.history, viewingGuestProfile])

  const summary = useMemo<ProfileSummary>(() => {
    if (viewingGuestProfile) return getGuestSummary(selectedGuest)
    return dashboard.summary
  }, [dashboard.summary, selectedGuest, viewingGuestProfile])

  const profileInsights = useMemo(
    () =>
      viewingGuestProfile
        ? buildGuestInsights(selectedGuest)
        : buildProfilePlainLanguageInsights({
            summary,
            history,
          }),
    [history, selectedGuest, summary, viewingGuestProfile]
  )

  const combinedInsights = useMemo(
    () => [...profileInsights, ...(viewingGuestProfile ? [] : categoryInsights)],
    [categoryInsights, profileInsights, viewingGuestProfile]
  )

  const summaryNarrative = useMemo(() => {
    if (summary.games === 0) {
      return viewingGuestProfile
        ? 'No finalized guest games yet'
        : 'No finalized games yet — locked scores show up here.'
    }

    const winRate = summary.games > 0 ? Math.round((summary.wins / summary.games) * 100) : 0

    return `${summary.games} finalized game${summary.games === 1 ? '' : 's'} · ${winRate}% wins`
  }, [summary.games, summary.wins, viewingGuestProfile])

  const refreshFrequentOpponents = useCallback(async () => {
    if (!viewerUserId) {
      setFrequentOpponents([])
      return
    }

    try {
      setFrequentOpponentsLoading(true)
      const nextOpponents = await loadFrequentOpponents(viewerUserId, 5)
      setFrequentOpponents(nextOpponents)
    } catch (error) {
      console.error('Failed to load profile frequent opponents', error)
      setFrequentOpponents([])
    } finally {
      setFrequentOpponentsLoading(false)
    }
  }, [viewerUserId])

  useEffect(() => {
    void refreshFrequentOpponents()
  }, [refreshFrequentOpponents])

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

  const accountMenuActions: ManageAccountModalAction[] = buildManageAccountMenuActions().map(
    (action) => {
      switch (action.id) {
        case 'manageData':
          return {
            ...action,
            onPress: () => router.push('/manage-data'),
          }
        case 'newSession':
          return {
            ...action,
            onPress: () => router.replace('/create-session'),
          }
        case 'logout':
          return { ...action, onPress: handleLogout }
        case 'deleteSession':
          return {
            ...action,
          }
        case 'cancel':
          return { ...action }
        default:
          return action
      }
    }
  )

  const openAccountActions = useCallback(() => {
    setAccountMenuVisible(true)
  }, [])

  const openGuestProfile = useCallback((guest: GuestProfile) => {
    const labels = getGuestProfileLabels(guest.display_name, guest.public_player_id)

    router.push({
      pathname: '/profile',
      params: {
        guestProfileId: guest.id,
        guestName: labels.title,
        guestPublicPlayerId: guest.public_player_id ?? '',
      },
    })
  }, [])

  const returnToOwnProfile = useCallback(() => {
    router.replace('/profile')
  }, [])

  const openFrequentOpponentStats = useCallback((playerKey: string) => {
    router.push({
      pathname: '/player-stats',
      params: { playerKey },
    })
  }, [])

  const handleFrequentOpponentLongPress = useCallback(
    (playerKey: string) => {
      if (playerKey.startsWith('guest:')) {
        const guest = sharedGuestProfilesById.get(playerKey.slice('guest:'.length))
        if (guest) {
          openGuestProfile(guest)
          return
        }
      }

      openFrequentOpponentStats(playerKey)
    },
    [openFrequentOpponentStats, openGuestProfile, sharedGuestProfilesById]
  )

  return (
    <View style={styles.pageBackground}>
      <View style={styles.pageScrim}>
        <ScrollView
          style={styles.screen}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: getBottomNavClearance(insets.bottom),
            },
          ]}
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
            title={activeDisplayName}
            {...manageAccountHeaderProps}
            onRightPress={openAccountActions}
            rightDisabled={loggingOut}
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
                  <Text style={styles.errorTitle}>Unable to refresh profile analytics</Text>
                  <Text style={styles.errorText}>
                    {loadError}
                    {didLoadOnceRef.current &&
                    (dashboard.history.length > 0 || dashboard.sharedGuestProfiles.length > 0)
                      ? ' Showing the last successful profile data below.'
                      : ''}
                  </Text>

                  <Pressable
                    style={({ pressed }) => [styles.errorButton, pressed && styles.buttonPressed]}
                    onPress={() => {
                      void load()
                    }}
                  >
                    <Text style={styles.errorButtonText}>Retry</Text>
                  </Pressable>
                </View>
              ) : null}

              {loading && !didLoadOnceRef.current ? (
                <View style={styles.statusCard}>
                  <ActivityIndicator color={theme.colors.accent} />
                  <Text style={styles.statusTitle}>Loading profile analytics...</Text>
                  <Text style={styles.statusText}>
                    Pulling your locked game history and shared guest stats.
                  </Text>
                </View>
              ) : null}

              {viewingGuestProfile && !loading && !selectedGuest ? (
                <View style={styles.errorCard}>
                  <Text style={styles.errorTitle}>Guest profile unavailable</Text>
                  <Text style={styles.errorText}>
                    This guest profile could not be found in your shared guest list.
                  </Text>

                  <Pressable
                    style={({ pressed }) => [styles.errorButton, pressed && styles.buttonPressed]}
                    onPress={returnToOwnProfile}
                  >
                    <Text style={styles.errorButtonText}>Return to My Profile</Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.summaryCard}>
                <Text style={styles.kicker}>
                  {viewingGuestProfile ? 'Guest Profile Snapshot' : 'Profile Snapshot'}
                </Text>
                <Text style={styles.summaryHeadline}>{summaryNarrative}</Text>

                {selectedGuestLabels?.subtitle ? (
                  <Text style={styles.guestProfileSubtitle}>{selectedGuestLabels.subtitle}</Text>
                ) : null}

                <View style={styles.summaryRow}>
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryValue}>{summary.games}</Text>
                    <Text style={styles.summaryLabel}>Finalized</Text>
                  </View>

                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryValue}>{summary.wins}</Text>
                    <Text style={styles.summaryLabel}>Wins</Text>
                  </View>

                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryValue}>{summary.avgScore.toFixed(1)}</Text>
                    <Text style={styles.summaryLabel}>Avg</Text>
                  </View>
                </View>
              </View>

              {!viewingGuestProfile ? (
                <View style={styles.analyticsLinksRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.analyticsLinkCard,
                      pressed && styles.analyticsLinkCardPressed,
                    ]}
                    onPress={() => router.push('/player-stats')}
                    accessibilityRole="button"
                    accessibilityLabel="Open Player Statistics"
                  >
                    <Text style={styles.analyticsLinkKicker}>Deep Dive</Text>
                    <Text style={styles.analyticsLinkTitle} numberOfLines={2}>
                      Player Statistics
                    </Text>
                    <Text style={styles.analyticsLinkSub} numberOfLines={2}>
                      Leaderboard & breakdown.
                    </Text>
                    <View style={styles.analyticsLinkCta}>
                      <Text style={styles.analyticsLinkCtaText}>Open →</Text>
                    </View>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.analyticsLinkCard,
                      pressed && styles.analyticsLinkCardPressed,
                    ]}
                    onPress={() => router.push('/duke-stats')}
                    accessibilityRole="button"
                    accessibilityLabel="Open Duke Statistics"
                  >
                    <Text style={styles.analyticsLinkKicker}>Roster</Text>
                    <Text style={styles.analyticsLinkTitle} numberOfLines={2}>
                      Duke Statistics
                    </Text>
                    <Text style={styles.analyticsLinkSub} numberOfLines={2}>
                      Win rates by duke.
                    </Text>
                    <View style={styles.analyticsLinkCta}>
                      <Text style={styles.analyticsLinkCtaText}>Open →</Text>
                    </View>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.analyticsLinkCard,
                      pressed && styles.analyticsLinkCardPressed,
                    ]}
                    onPress={() => router.push('/global-trends')}
                    accessibilityRole="button"
                    accessibilityLabel="Open Global Trends"
                  >
                    <Text style={styles.analyticsLinkKicker}>Meta</Text>
                    <Text style={styles.analyticsLinkTitle} numberOfLines={2}>
                      Global Trends
                    </Text>
                    <Text style={styles.analyticsLinkSub} numberOfLines={2}>
                      Tier list & shape.
                    </Text>
                    <View style={styles.analyticsLinkCta}>
                      <Text style={styles.analyticsLinkCtaText}>Open →</Text>
                    </View>
                  </Pressable>
                </View>
              ) : null}

              {!viewingGuestProfile ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.analyticsLinkCard,
                    styles.analyticsSoloLinkCard,
                    pressed && styles.analyticsLinkCardPressed,
                  ]}
                  onPress={() => router.push('/solo-stats' as never)}
                  accessibilityRole="button"
                  accessibilityLabel="Open Solo Statistics"
                >
                  <Text style={styles.analyticsLinkKicker}>Campaign</Text>
                  <Text style={styles.analyticsLinkTitle}>Solo Statistics</Text>
                  <Text style={styles.analyticsLinkSub}>
                    Isolated solo wins, losses, and duke scoring trends.
                  </Text>
                  <View style={styles.analyticsLinkCta}>
                    <Text style={styles.analyticsLinkCtaText}>Open â†’</Text>
                  </View>
                </Pressable>
              ) : null}

              {!viewingGuestProfile ? (
                <FrequentOpponentsCard
                  opponents={frequentOpponents}
                  loading={frequentOpponentsLoading}
                  onSelect={openFrequentOpponentStats}
                  onLongPress={handleFrequentOpponentLongPress}
                  title="Most Played Opponents"
                  hintText="Tap a player to compare stats. Hold a shared guest to open their profile."
                />
              ) : null}

              <View style={styles.sectionCard}>
                <Text style={[styles.sectionTitle, styles.sectionTitleStandalone]}>
                  What The Numbers Say
                </Text>

                <View style={styles.insightGrid}>
                  {combinedInsights.map((insight) => {
                    const targetSessionId = insight.sessionId
                    if (targetSessionId) {
                      return (
                        <Pressable
                          key={insight.title}
                          style={({ pressed }) => [
                            styles.insightCard,
                            pressed && styles.buttonPressed,
                          ]}
                          onPress={() =>
                            router.push({
                              pathname: '/game-recap',
                              params: { sessionId: targetSessionId },
                            })
                          }
                        >
                          <Text style={styles.insightTitle}>{insight.title}</Text>
                          <Text style={styles.insightBody}>{insight.body}</Text>
                        </Pressable>
                      )
                    }

                    return (
                      <View key={insight.title} style={styles.insightCard}>
                        <Text style={styles.insightTitle}>{insight.title}</Text>
                        <Text style={styles.insightBody}>{insight.body}</Text>
                      </View>
                    )
                  })}
                </View>
              </View>

              {!viewingGuestProfile ? (
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Games</Text>
                    {history.length > 0 ? (
                      <Text style={styles.sectionMeta}>{history.length} finalized</Text>
                    ) : null}
                  </View>

                  {history.length > 0 ? (
                    <Text style={styles.sectionHint}>
                      Press &amp; hold any row for game details.
                    </Text>
                  ) : null}

                  {history.length === 0 ? (
                    <View style={styles.emptyStateCard}>
                      <Text style={styles.emptyTitle}>No finalized games yet</Text>
                      <Text style={styles.emptyText}>
                        Finish a game to see your locked scores, placements, and duke history here.
                      </Text>

                      <Pressable
                        style={({ pressed }) => [
                          styles.emptyActionButton,
                          pressed && styles.buttonPressed,
                        ]}
                        onPress={() => router.push('/create-session')}
                      >
                        <Text style={styles.emptyActionButtonText}>Open Sessions</Text>
                      </Pressable>
                    </View>
                  ) : (
                    history.map((row, index) => (
                      <Pressable
                        key={`${row.sessionId}-${index}`}
                        style={({ pressed }) => [
                          styles.rowCard,
                          pressed && styles.rowCardPressed,
                        ]}
                        onLongPress={() =>
                          router.push({
                            pathname: '/game-recap',
                            params: { sessionId: row.sessionId },
                          })
                        }
                        delayLongPress={250}
                      >
                        <View style={styles.rowTop}>
                          <View style={styles.rowMain}>
                            <View
                              style={[
                                styles.rankPill,
                                row.rank === 1 && styles.rankPillGold,
                                row.rank === 2 && styles.rankPillSilver,
                                row.rank === 3 && styles.rankPillBronze,
                                row.rank >= 4 && styles.rankPillNeutral,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.rankPillText,
                                  (row.rank === 1 || row.rank === 2 || row.rank === 3) &&
                                    styles.rankPillTextDark,
                                ]}
                              >
                                {row.rank}
                              </Text>
                            </View>

                            <View style={styles.rowMeta}>
                              <Text style={styles.rowTitle}>
                                {formatDukeName(row.dukeSlug, {
                                  emptyLabel: 'No Duke Selected',
                                })}
                              </Text>
                              <Text style={styles.rowSub}>
                                {formatDate(row.updatedAt)} · {row.playerCount}-player table
                              </Text>
                            </View>
                          </View>

                          <View style={styles.scorePill}>
                            <Text style={styles.scorePillValue}>{row.totalScore}</Text>
                            <Text style={styles.scorePillLabel}>PTS</Text>
                          </View>
                        </View>

                        <Text style={styles.timelineDetail}>
                          Finished #{row.rank} of {row.playerCount}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </View>
              ) : null}

              {!viewingGuestProfile ? (
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Shared Guests</Text>
                    {dashboard.sharedGuestProfiles.length > 0 ? (
                      <Text style={styles.sectionMeta}>
                        {dashboard.sharedGuestProfiles.length} profiles
                      </Text>
                    ) : null}
                  </View>

                  {dashboard.sharedGuestProfiles.length > 0 ? (
                    <Text style={styles.sectionHint}>
                      Press &amp; hold any guest to open their profile.
                    </Text>
                  ) : null}

                  {dashboard.sharedGuestProfiles.length === 0 ? (
                    <View style={styles.emptyStateCard}>
                      <Text style={styles.emptyTitle}>No shared guest profiles yet</Text>
                      <Text style={styles.emptyText}>
                        Shared guests appear here after you add them while running a session.
                      </Text>

                      <Pressable
                        style={({ pressed }) => [
                          styles.emptySecondaryButton,
                          pressed && styles.buttonPressed,
                        ]}
                        onPress={() => router.push('/create-session')}
                      >
                        <Text style={styles.emptySecondaryButtonText}>Start a Session</Text>
                      </Pressable>
                    </View>
                  ) : (
                    dashboard.sharedGuestProfiles.map((guest) => {
                      const labels = getGuestProfileLabels(
                        guest.display_name,
                        guest.public_player_id
                      )
                      const hasRealDisplayName = labels.subtitle !== null
                      const wins = Number(guest.stats.wins ?? 0)
                      const losses = Number(guest.stats.losses ?? 0)

                      return (
                        <Pressable
                          key={guest.id}
                          style={({ pressed }) => [
                            styles.guestCard,
                            pressed && styles.rowCardPressed,
                          ]}
                          onLongPress={() => openGuestProfile(guest)}
                          delayLongPress={250}
                        >
                          <View style={styles.guestTopRow}>
                            <View style={styles.guestMain}>
                              <Text style={styles.rowTitle}>{labels.title}</Text>
                              {labels.subtitle ? (
                                <Text style={styles.rowSub}>{labels.subtitle}</Text>
                              ) : !hasRealDisplayName ? (
                                <Text style={styles.guestNoNameHint}>
                                  (no display name set)
                                </Text>
                              ) : null}
                            </View>

                            <View style={styles.guestMiniPill}>
                              <Text style={styles.guestMiniPillText}>
                                {guest.stats.totalGames} games
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.guestDetail}>
                            {wins} {wins === 1 ? 'win' : 'wins'} · {losses}{' '}
                            {losses === 1 ? 'loss' : 'losses'}
                          </Text>
                          <Text style={styles.guestDetail}>
                            Top duke:{' '}
                            {formatDukeName(toDukeSlug(guest.stats.topDuke), {
                              emptyLabel: 'No Duke',
                            })}
                          </Text>
                        </Pressable>
                      )
                    })
                  )}
                </View>
              ) : null}

              {viewingGuestProfile ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.returnToOwnButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={returnToOwnProfile}
                >
                  <Text style={styles.returnToOwnButtonText}>Return to My Profile</Text>
                </Pressable>
              ) : null}
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
    position: 'relative',
    backgroundColor: 'rgba(20, 14, 36, 0.85)',
  },

  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  content: {
    padding: 10,
    paddingBottom: 16,
  },

  summaryCard: {
    backgroundColor: pageSurface.panelAlt,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
    padding: 14,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  kicker: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },

  summaryHeadline: {
    color: theme.colors.text,
    fontSize: 19,
    fontWeight: '900',
    lineHeight: 27,
  },

  guestProfileSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 14,
  },

  summaryBox: {
    flex: 1,
    backgroundColor: pageSurface.panelRaised,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    alignItems: 'center',
  },

  summaryValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },

  summaryLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },

  sectionCard: {
    backgroundColor: pageSurface.panel,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },

  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },

  sectionTitleStandalone: {
    marginBottom: 12,
  },

  sectionMeta: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  insightGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },

  insightCard: {
    width: '48.5%',
    backgroundColor: pageSurface.panelAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 12,
  },

  insightTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 6,
  },

  insightBody: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
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
    backgroundColor: pageSurface.panelRaised,
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
    backgroundColor: pageSurface.panel,
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

  statusCard: {
    backgroundColor: pageSurface.panel,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    ...theme.shadow.card,
  },

  statusTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 10,
    marginBottom: 4,
  },

  statusText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    textAlign: 'center',
  },

  emptyTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 6,
  },

  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 20,
  },

  emptyStateCard: {
    backgroundColor: pageSurface.panelAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },

  emptyActionButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...theme.shadow.glow,
  },

  emptyActionButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  emptySecondaryButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: pageSurface.panelRaised,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  emptySecondaryButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  analyticsLinksRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },

  analyticsLinkCard: {
    flex: 1,
    backgroundColor: pageSurface.panelAlt,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(170, 145, 255, 0.42)',
    padding: 12,
    paddingBottom: 10,
    ...theme.shadow.glow,
  },

  analyticsSoloLinkCard: {
    marginBottom: 12,
  },

  analyticsLinkCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
  },

  analyticsLinkKicker: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  analyticsLinkTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },

  analyticsLinkSub: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    marginBottom: 10,
  },

  analyticsLinkCta: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(123, 92, 255, 0.20)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(170, 145, 255, 0.45)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 'auto',
  },

  analyticsLinkCtaText: {
    color: theme.colors.primaryLight,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  rowCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },

  rowHint: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    fontStyle: 'italic',
    marginTop: 6,
  },

  sectionHint: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    fontStyle: 'italic',
    marginBottom: 10,
    marginTop: -4,
  },

  rankPillGold: {
    backgroundColor: '#E7C768',
  },

  rankPillSilver: {
    backgroundColor: '#C4C7D6',
  },

  rankPillBronze: {
    backgroundColor: '#C8865A',
  },

  rankPillNeutral: {
    backgroundColor: '#5B6378',
  },

  rankPillTextDark: {
    color: '#1A1426',
  },

  rowCard: {
    backgroundColor: pageSurface.panelAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 10,
  },

  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },

  rowMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },

  rankPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  rankPillText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  rowMeta: {
    flex: 1,
    minWidth: 0,
  },

  rowTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 3,
  },

  rowSub: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },

  guestNoNameHint: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    fontStyle: 'italic',
  },

  scorePill: {
    minWidth: 68,
    backgroundColor: pageSurface.inset,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scorePillValue: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
  },

  scorePillLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },

  timelineDetail: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
  },

  guestCard: {
    backgroundColor: pageSurface.panelAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 10,
  },

  guestTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },

  guestMain: {
    flex: 1,
    minWidth: 0,
  },

  guestMiniPill: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },

  guestMiniPillText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '900',
  },

  guestDetail: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },

  returnToOwnButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...theme.shadow.glow,
  },

  returnToOwnButtonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },

  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
})
