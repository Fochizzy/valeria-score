import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import AnalyticsSegmentedControl from '../components/AnalyticsSegmentedControl'
import AverageGameShapeCard from '../components/AverageGameShapeCard'
import ManageAccountModal from '../components/ManageAccountModal'
import MetaSnapshotCard from '../components/MetaSnapshotCard'
import TierListCard from '../components/TierListCard'
import ValeriaHeader from '../components/ValeriaHeader'
import { playerStatsSurface } from '../constants/analyticsPageSurface'
import { theme } from '../constants/theme'
import {
  analyticsRouteHrefByKey,
  buildAnalyticsRouteToggleSegments,
} from '../lib/analytics-route-toggle'
import { loadGlobalTrendsBundle, type GlobalTrendsBundle } from '../lib/global-trends-fetch'
import { buildGlobalTrendsStatTiles } from '../lib/global-trends-stat-tiles'
import { getBottomNavClearance } from '../lib/bottom-nav-layout'
import { logoutAndClearActiveSessionState } from '../lib/logout'
import {
  buildBoundManageAccountMenuActions,
  manageAccountAlertCopy,
  manageAccountHeaderProps,
} from '../lib/manage-account-menu'
import {
  buildProtectedAnalyticsAccessState,
  resolveProtectedAnalyticsViewerUserId,
} from '../lib/protected-analytics-access'
import { clearActiveSessionState } from '../lib/sessions'
import { supabase } from '../lib/supabase'
import { Alert } from '../lib/themed-alert'

export default function GlobalTrendsScreen() {
  const insets = useSafeAreaInsets()
  const [bundle, setBundle] = useState<GlobalTrendsBundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [accountMenuVisible, setAccountMenuVisible] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [viewerUserId, setViewerUserId] = useState<string | null | undefined>(undefined)
  const didLoadOnceRef = useRef(false)

  const accessState = useMemo(
    () =>
      viewerUserId === undefined
        ? null
        : buildProtectedAnalyticsAccessState('/global-trends', viewerUserId),
    [viewerUserId]
  )
  const analyticsRouteSegments = useMemo(
    () => buildAnalyticsRouteToggleSegments('trends'),
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
        setBundle(null)
        return
      }

      const next = await loadGlobalTrendsBundle()
      setBundle(next)
      didLoadOnceRef.current = true
    } catch (err: any) {
      console.error(err)
      setLoadError(err?.message ?? 'Unable to load global trends right now. Pull to retry.')
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
        onLogout: () => {
          void handleLogout()
        },
      }),
    [handleLogout]
  )

  const openAccountActions = useCallback(() => {
    setAccountMenuVisible(true)
  }, [])

  const handleAnalyticsRouteChange = useCallback(
    (key: string) => {
      const nextSegment = analyticsRouteSegments.find((segment) => segment.key === key)
      if (!nextSegment || nextSegment.href === analyticsRouteHrefByKey.trends) return
      router.push(nextSegment.href as never)
    },
    [analyticsRouteSegments]
  )

  return (
    <View style={styles.pageBackground}>
      <View style={styles.pageScrim}>
        <ScrollView
          style={styles.container}
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
            title="Global Trends"
            subtitle="Meta snapshot, tier list, and game shape"
            {...manageAccountHeaderProps}
            onRightPress={openAccountActions}
            rightDisabled={loggingOut}
          />

          <AnalyticsSegmentedControl
            segments={analyticsRouteSegments}
            activeKey="trends"
            onChange={handleAnalyticsRouteChange}
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
                  <Text style={styles.errorTitle}>Could not refresh global trends</Text>
                  <Text style={styles.errorText}>{loadError}</Text>
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

              {bundle ? (
                <>
                  {(() => {
                    // Replaces the previous prose insights block — now a 2x2
                    // stat tile grid summarising lifetime activity.
                    const tiles = buildGlobalTrendsStatTiles({
                      tierList: bundle.tierList,
                      shapeOverTime: bundle.shapeOverTime,
                    })
                    if (tiles.length === 0) return null
                    return (
                      <View style={styles.statGridCard}>
                        <Text style={styles.statGridKicker}>Across All Tracked Games</Text>
                        <View style={styles.statGrid}>
                          {tiles.map((tile) => (
                            <View key={tile.label} style={styles.statTile}>
                              <Text style={styles.statTileLabel}>{tile.label}</Text>
                              <Text style={styles.statTileValue}>{tile.value}</Text>
                              {tile.helper ? (
                                <Text style={styles.statTileHelper} numberOfLines={1}>
                                  {tile.helper}
                                </Text>
                              ) : null}
                            </View>
                          ))}
                        </View>
                      </View>
                    )
                  })()}
                  <MetaSnapshotCard snapshot={bundle.meta} />
                  <TierListCard entries={bundle.tierList} />
                  <AverageGameShapeCard months={bundle.shapeOverTime} />
                </>
              ) : !loadError && !loading ? (
                <Text style={styles.helperText}>No data yet — start tracking sessions to populate trends.</Text>
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

  // The card-art ImageBackground was removed from this data-dense screen so
  // the foreground stat tiles, tier list, and chart aren't competing with a
  // textured underlay.
  pageScrim: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 30, 0.74)',
  },

  container: { flex: 1, backgroundColor: 'transparent' },

  content: { padding: 10, paddingTop: 4 },

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

  helperText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    paddingHorizontal: 4,
  },

  statGridCard: {
    backgroundColor: 'rgba(48, 33, 80, 0.85)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },

  statGridKicker: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  statTile: {
    width: '48%',
    backgroundColor: playerStatsSurface.panelRaised,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  statTileLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },

  statTileValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },

  statTileHelper: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
})
