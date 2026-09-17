import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  GestureResponderEvent,
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import JoinQrModal from '../components/JoinQrModal'
import { copyJoinCodeWithFeedback } from '../lib/copy-join-code-client'
import { logoutAndClearActiveSessionState } from '../lib/logout'
import { supabase } from '../lib/supabase'
import { Alert } from '../lib/themed-alert'
import ValeriaHeader from '../components/ValeriaHeader'
import {
  createGameSession,
  deleteInProgressSession,
  getMyActiveTables,
  type InProgressSession,
} from '../lib/create-session'
import { leaveOwnedOrJoinedGame } from '../lib/manage'
import { buildSessionCardMeta } from '../lib/p3-insights'
import {
  clearActiveSessionState,
  setActiveJoinCode,
  setActiveSessionId,
} from '../lib/sessions'
import { theme } from '../constants/theme'
import {
  clampExpectedPlayerCount,
  EXPECTED_PLAYER_OPTIONS,
  isExpectedPlayerOption,
  type ExpectedPlayerOption,
} from '../lib/expected-player-count'

const citizenBackdrop = require('../assets/Citizen Backdrop.png')

const pageSurface = {
  panel: 'rgba(25, 18, 43, 0.68)',
  panelAlt: 'rgba(31, 22, 52, 0.7)',
  panelRaised: 'rgba(38, 27, 63, 0.76)',
  panelSoft: 'rgba(40, 31, 66, 0.58)',
  inset: 'rgba(18, 24, 43, 0.66)',
}

const GAME_HUB_LINKS: readonly {
  label: string
  route: '/player-stats' | '/duke-stats' | '/manage-data' | '/solo-stats' | '/about'
}[] = [
  { label: 'Player Stats', route: '/player-stats' as const },
  { label: 'Duke Stats', route: '/duke-stats' as const },
  { label: 'Recent Recaps', route: '/manage-data' as const },
  { label: 'Solo Stats', route: '/solo-stats' as const },
  { label: 'About', route: '/about' as const },
] as const

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently'
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function getExpectedPlayerCount(session: InProgressSession) {
  return clampExpectedPlayerCount(
    session.expected_player_count ?? Math.max(session.player_count, session.total_entries, 2)
  )
}

function getJoinedSeatCount(session: InProgressSession) {
  return Math.min(getExpectedPlayerCount(session), Math.max(session.player_count, session.total_entries))
}

function getSavedSeatCount(session: InProgressSession) {
  return Math.min(getExpectedPlayerCount(session), Math.max(0, session.locked_count))
}

export default function CreateSessionScreen() {
  const [creating, setCreating] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sessions, setSessions] = useState<InProgressSession[]>([])
  const [deletingId, setDeletingId] = useState('')
  const [savingExpectedFor, setSavingExpectedFor] = useState('')
  const [selectedGameMode, setSelectedGameMode] = useState<'multiplayer' | 'solo'>('multiplayer')
  const [pendingExpectedPlayers, setPendingExpectedPlayers] =
    useState<ExpectedPlayerOption | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [qrJoinCode, setQrJoinCode] = useState<string | null>(null)
  const didFocusRefreshRef = useRef(false)

  const loadSessions = useCallback(async () => {
    try {
      setLoadingSessions(true)
      const data = await getMyActiveTables()
      setSessions(data)
    } catch (err: any) {
      Alert.alert('Load failed', err?.message ?? 'Unknown error')
    } finally {
      setLoadingSessions(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  useFocusEffect(
    useCallback(() => {
      if (!didFocusRefreshRef.current) {
        didFocusRefreshRef.current = true
        return
      }

      void loadSessions()
    }, [loadSessions])
  )

  async function handleLogout() {
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
  }

  async function handleRefresh() {
    try {
      setRefreshing(true)
      const data = await getMyActiveTables()
      setSessions(data)
    } catch (err: any) {
      Alert.alert('Refresh failed', err?.message ?? 'Unknown error')
    } finally {
      setRefreshing(false)
    }
  }

  const handleCopyJoinCode = useCallback(async (joinCode: string | null) => {
    await copyJoinCodeWithFeedback(joinCode)
  }, [])

  function handleRoutePress(route: (typeof GAME_HUB_LINKS)[number]['route'] | '/profile') {
    router.push(route)
  }

  function handleNestedPress(event: GestureResponderEvent) {
    event.stopPropagation()
  }

  function handleOpenSoloMode() {
    setSelectedGameMode('solo')
  }

  async function handleCreateSession() {
    if (selectedGameMode === 'solo') {
      router.push('/solo-score')
      return
    }

    if (!isExpectedPlayerOption(pendingExpectedPlayers)) {
      Alert.alert(
        'Choose expected players',
        'Select how many players are expected before starting the game.'
      )
      return
    }

    try {
      setCreating(true)
      const { session } = await createGameSession(pendingExpectedPlayers)

      await setActiveSessionId(String(session.id))
      await setActiveJoinCode(String(session.join_code))

      router.replace({
        pathname: '/duke-select',
        params: {
          sessionId: String(session.id),
          joinCode: String(session.join_code),
        },
      })
    } catch (err: any) {
      Alert.alert('Create game failed', err?.message ?? 'Unknown error')
    } finally {
      setCreating(false)
    }
  }

  async function handleResumeSession(session: InProgressSession) {
    try {
      await setActiveSessionId(String(session.id))
      await setActiveJoinCode(String(session.join_code))

      router.push({
        pathname: '/score',
        params: {
          sessionId: String(session.id),
          joinCode: String(session.join_code),
        },
      })
    } catch (err: any) {
      Alert.alert('Resume failed', err?.message ?? 'Unknown error')
    }
  }

  function handleDeleteSession(session: InProgressSession) {
    Alert.alert(
      session.is_host ? 'Delete table?' : 'Leave table?',
      session.is_host
        ? 'This removes the table if it has no locked scores yet.'
        : 'This removes your unfinished participation from the table.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: session.is_host ? 'Delete' : 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(session.id)
              if (session.is_host) {
                await deleteInProgressSession(session.id)
              } else {
                await leaveOwnedOrJoinedGame(session.id)
              }
              setSessions((current) => current.filter((item) => item.id !== session.id))
            } catch (err: any) {
              Alert.alert(
                session.is_host ? 'Delete failed' : 'Leave failed',
                err?.message ?? 'Unknown error'
              )
            } finally {
              setDeletingId('')
            }
          },
        },
      ]
    )
  }

  const updateExpectedPlayers = useCallback(
    async (session: InProgressSession, nextCount: number) => {
      if (!session.is_host) {
        Alert.alert('Host only', 'Only the session creator can set the table size.')
        return
      }

      const safeNextCount = clampExpectedPlayerCount(nextCount)
      if (safeNextCount === getExpectedPlayerCount(session)) {
        return
      }

      const previousCount = session.expected_player_count

      try {
        setSavingExpectedFor(session.id)
        setSessions((current) =>
          current.map((item) =>
            item.id === session.id ? { ...item, expected_player_count: safeNextCount } : item
          )
        )

        const { data, error } = await supabase
          .from('game_sessions')
          .update({ expected_player_count: safeNextCount })
          .eq('id', session.id)
          .eq('created_by', session.created_by)
          .select('expected_player_count')
          .maybeSingle()

        if (error) throw error
        if (!data) {
          throw new Error('The table size could not be updated.')
        }

        const confirmedCount = clampExpectedPlayerCount(data.expected_player_count)
        setSessions((current) =>
          current.map((item) =>
            item.id === session.id ? { ...item, expected_player_count: confirmedCount } : item
          )
        )
      } catch (err: any) {
        setSessions((current) =>
          current.map((item) =>
            item.id === session.id ? { ...item, expected_player_count: previousCount } : item
          )
        )
        Alert.alert(
          'Unable to update players',
          err?.message ?? 'Please try updating the table size again.'
        )
      } finally {
        setSavingExpectedFor('')
      }
    },
    []
  )

  const featuredSession = sessions[0] ?? null
  const additionalSessions = sessions.slice(1)
  const canCreateGame = selectedGameMode === 'solo' ? !creating : isExpectedPlayerOption(pendingExpectedPlayers) && !creating

  const featuredMeta = featuredSession
    ? buildSessionCardMeta({
        playerCount: featuredSession.player_count,
        totalEntries: featuredSession.total_entries,
        lockedCount: featuredSession.locked_count,
      })
    : null

  const featuredExpectedCount = featuredSession ? getExpectedPlayerCount(featuredSession) : 2
  const featuredJoinedCount = featuredSession ? getJoinedSeatCount(featuredSession) : 0
  const featuredSavedCount = featuredSession ? getSavedSeatCount(featuredSession) : 0

  return (
    <ImageBackground
      source={citizenBackdrop}
      style={styles.pageBackground}
      imageStyle={styles.pageBackgroundImage}
      resizeMode="cover"
    >
      <View style={styles.pageScrim}>
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.accent}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerRowCopy}>
              <ValeriaHeader
                compact
                title="Game Hub"
                subtitle="Create, join, resume, or leave an active table"
              />
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && styles.pressed,
                loggingOut && styles.disabled,
              ]}
              onPress={handleLogout}
              disabled={loggingOut}
            >
              <Text style={styles.logoutButtonText}>
                {loggingOut ? 'Logging Out...' : 'Logout'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.quickActionGrid}>
            <Pressable
              style={({ pressed }) => [
                styles.quickActionCard,
                styles.quickActionCardPrimary,
                pressed && styles.pressed,
                !canCreateGame && styles.disabled,
              ]}
              onPress={handleCreateSession}
              disabled={!canCreateGame}
            >
              <Text style={styles.quickActionTitle}>{creating ? 'Creating...' : 'Create Game'}</Text>
              <Text style={styles.quickActionBody}>
                {selectedGameMode === 'solo'
                  ? 'Solo mode selected. Tap to begin your solo game.'
                  : isExpectedPlayerOption(pendingExpectedPlayers)
                  ? `New ${pendingExpectedPlayers}-player table as host.`
                  : 'Select players below first.'}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.quickActionCard, pressed && styles.pressed]}
              onPress={() => router.push('/join-game')}
            >
              <Text style={styles.quickActionTitle}>Join Game</Text>
              <Text style={styles.quickActionBody}>
                Enter with a join code.
              </Text>
            </Pressable>
          </View>

          <View style={styles.preStartCard}>
            <Text style={styles.sectionCaption}>Before You Start</Text>
            <Text style={styles.preStartTitle}>Expected Players</Text>
            <Text style={styles.preStartBody}>
              {selectedGameMode === 'solo'
                ? 'Solo mode is selected. Tap Create Game when you are ready to begin.'
                : isExpectedPlayerOption(pendingExpectedPlayers)
                ? `${pendingExpectedPlayers} players expected, including guests.`
                : 'How many players, including guests?'}
            </Text>

            <View style={styles.expectedRow}>
              {EXPECTED_PLAYER_OPTIONS.map((count) => {
                const active =
                  selectedGameMode === 'multiplayer' && count === pendingExpectedPlayers

                return (
                  <Pressable
                    key={count}
                    style={({ pressed }) => [
                      styles.expectedChip,
                      active && styles.expectedChipActive,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => {
                      setSelectedGameMode('multiplayer')
                      setPendingExpectedPlayers(count)
                    }}
                  >
                    <Text style={[styles.expectedChipText, active && styles.expectedChipTextActive]}>
                      {count}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.soloModeButton,
                selectedGameMode === 'solo' && styles.soloModeButtonActive,
                pressed && styles.pressed,
              ]}
              onPress={handleOpenSoloMode}
            >
              <Text style={styles.soloModeButtonText}>Solo Mode</Text>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.quickActionCard,
              styles.quickActionCardWide,
              styles.resumeActionCard,
              pressed && featuredSession && styles.pressed,
              !featuredSession && styles.disabled,
            ]}
            onPress={() => {
              if (featuredSession) {
                void handleResumeSession(featuredSession)
              }
            }}
            disabled={!featuredSession}
          >
            <Text style={styles.quickActionTitle}>Resume Active Table</Text>
            <Text style={styles.quickActionBody}>
              {featuredSession
                ? 'Continue scoring where you left off.'
                : 'Appears when you create or join a table.'}
            </Text>
          </Pressable>

          <View style={styles.currentTableCard}>
            {loadingSessions ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={theme.colors.accent} />
                <Text style={styles.loadingText}>Loading active tables...</Text>
              </View>
            ) : featuredSession ? (
              <>
                <View style={styles.currentTableTop}>
                  <View style={styles.currentTableHeaderRow}>
                    <View style={styles.currentTableCopy}>
                      <Text style={styles.sectionCaption}>Current Table</Text>
                      <Text style={styles.currentTableTitle}>
                        {featuredSession.is_host ? 'Your Active Table' : 'Joined Table'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statePill,
                        featuredMeta?.isReadyToFinish
                          ? styles.statePillReady
                          : featuredSession.total_entries > 0
                          ? styles.statePillActive
                          : styles.statePillWaiting,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statePillText,
                          featuredMeta?.isReadyToFinish
                            ? styles.statePillReadyText
                            : featuredSession.total_entries > 0
                            ? styles.statePillActiveText
                            : styles.statePillWaitingText,
                        ]}
                      >
                        {featuredMeta?.statusValue ?? 'Waiting'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.currentTableMetaRow}>
                    {featuredSession.is_host ? (
                      <View style={styles.currentTableMetaCopyHost}>
                        <Text
                          style={[
                            styles.currentTableText,
                            styles.currentTableMetaText,
                            styles.currentTableMetaTextHost,
                          ]}
                        >
                          {'Host sees every seat,\nincluding guests.'}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.currentTableText, styles.currentTableMetaText]}>
                        The host controls the table size and final expected seat count.
                      </Text>
                    )}

                    <Pressable
                      style={({ pressed }) => [
                        styles.joinCodeInlineChip,
                        pressed && styles.pressed,
                        !featuredSession.join_code && styles.disabled,
                      ]}
                      onPress={() => void handleCopyJoinCode(featuredSession.join_code)}
                      disabled={!featuredSession.join_code}
                    >
                      <Text style={styles.joinCodeInlineLabel}>Join Code</Text>
                      <Text style={styles.joinCodeInlineValue}>
                        {featuredSession.join_code || 'No Code'}
                      </Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.qrChip,
                        pressed && styles.pressed,
                        !featuredSession.join_code && styles.disabled,
                      ]}
                      onPress={() => setQrJoinCode(featuredSession.join_code)}
                      disabled={!featuredSession.join_code}
                      accessibilityRole="button"
                      accessibilityLabel="Show join QR code"
                    >
                      <MaterialCommunityIcons
                        name="qrcode"
                        size={26}
                        color={theme.colors.accent}
                      />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.ribbonRow}>
                  <View style={styles.infoRibbon}>
                    <Text style={styles.ribbonStrong}>
                      {featuredJoinedCount} / {featuredExpectedCount} joined
                    </Text>
                    <Text style={styles.ribbonBody}>
                      Saved scores: {featuredSavedCount} / {featuredExpectedCount}. End Game stays
                      gated until every expected seat has a score.
                    </Text>
                  </View>

                  <View style={styles.infoRibbon}>
                    <Text style={styles.ribbonStrong}>Expected Players</Text>
                    <Text style={styles.ribbonBody}>
                      {featuredSession.is_host
                        ? 'Host locks the table size here.'
                        : 'Host-owned setting shown here for reference.'}
                    </Text>

                    <View style={styles.expectedRow}>
                      {EXPECTED_PLAYER_OPTIONS.map((count) => {
                        const active = count === featuredExpectedCount
                        const disabled =
                          !featuredSession.is_host || savingExpectedFor === featuredSession.id

                        return (
                          <Pressable
                            key={count}
                            style={({ pressed }) => [
                              styles.expectedChip,
                              active && styles.expectedChipActive,
                              disabled && styles.expectedChipDisabled,
                              pressed && !disabled && styles.pressed,
                            ]}
                            onPress={() => void updateExpectedPlayers(featuredSession, count)}
                            disabled={disabled}
                          >
                            <Text
                              style={[
                                styles.expectedChipText,
                                active && styles.expectedChipTextActive,
                              ]}
                            >
                              {count}
                            </Text>
                          </Pressable>
                        )
                      })}
                    </View>
                  </View>
                </View>

                <View style={styles.tableActionRow}>
                  <Pressable
                    style={({ pressed }) => [styles.tableActionButton, pressed && styles.pressed]}
                    onPress={() => void handleResumeSession(featuredSession)}
                  >
                    <Text style={styles.tableActionButtonText}>Resume Table</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.tableActionButton,
                      styles.tableActionButtonDestructive,
                      pressed && styles.pressed,
                      deletingId === featuredSession.id && styles.disabled,
                    ]}
                    onPress={() => handleDeleteSession(featuredSession)}
                    disabled={deletingId === featuredSession.id}
                  >
                    <Text style={styles.tableActionButtonText}>
                      {deletingId === featuredSession.id
                        ? featuredSession.is_host
                          ? 'Deleting...'
                          : 'Leaving...'
                        : featuredSession.is_host
                        ? 'Delete Table'
                        : 'Leave Table'}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.sectionCaption}>Current Table</Text>
                <Text style={styles.currentTableTitle}>No active table</Text>
                <Text style={styles.currentTableText}>
                  Create a new game or join one with a 6-character message code.
                </Text>
              </>
            )}
          </View>

          {additionalSessions.length ? (
            <View style={styles.additionalSection}>
              <View style={styles.sectionRow}>
                <Text style={styles.sectionTitle}>Other Active Tables</Text>
                <View style={styles.inlinePill}>
                  <Text style={styles.inlinePillText}>{additionalSessions.length}</Text>
                </View>
              </View>

              {additionalSessions.map((session) => {
                const meta = buildSessionCardMeta({
                  playerCount: session.player_count,
                  totalEntries: session.total_entries,
                  lockedCount: session.locked_count,
                })

                return (
                  <Pressable
                    key={session.id}
                    style={({ pressed }) => [styles.sessionRowCard, pressed && styles.pressed]}
                    onPress={() => void handleResumeSession(session)}
                  >
                    <View style={styles.sessionRowTop}>
                      <View style={styles.sessionRowCopy}>
                        <Text style={styles.sessionRowCode}>{session.join_code || 'No Code'}</Text>
                        <Text style={styles.sessionRowMeta}>
                          {session.is_host ? 'Host' : 'Participant'} • Updated{' '}
                          {formatDate(session.updated_at)}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statePill,
                          meta.isReadyToFinish
                            ? styles.statePillReady
                            : session.total_entries > 0
                            ? styles.statePillActive
                            : styles.statePillWaiting,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statePillText,
                            meta.isReadyToFinish
                              ? styles.statePillReadyText
                              : session.total_entries > 0
                              ? styles.statePillActiveText
                              : styles.statePillWaitingText,
                          ]}
                        >
                          {meta.statusValue}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.sessionRowFacts}>
                      <Text style={styles.sessionRowFact}>
                        Players {getJoinedSeatCount(session)} / {getExpectedPlayerCount(session)}
                      </Text>
                      <Text style={styles.sessionRowFact}>
                        Saved {getSavedSeatCount(session)} / {getExpectedPlayerCount(session)}
                      </Text>
                    </View>

                    <View style={styles.sessionRowFooter}>
                      <Text style={styles.sessionRowFooterText}>Tap row to resume</Text>

                      <Pressable
                        style={({ pressed }) => [
                          styles.rowDeleteButton,
                          pressed && styles.pressed,
                          deletingId === session.id && styles.disabled,
                        ]}
                        onPress={(event) => {
                          handleNestedPress(event)
                          handleDeleteSession(session)
                        }}
                        disabled={deletingId === session.id}
                      >
                        <Text style={styles.rowDeleteButtonText}>
                          {deletingId === session.id
                            ? session.is_host
                              ? 'Deleting...'
                              : 'Leaving...'
                            : session.is_host
                            ? 'Delete'
                            : 'Leave'}
                        </Text>
                      </Pressable>
                    </View>
                  </Pressable>
                )
              })}
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.profileRibbon, pressed && styles.pressed]}
            onPress={() => handleRoutePress('/profile')}
          >
            <View style={styles.profileRibbonCopy}>
              <Text style={styles.profileRibbonTitle}>Profile</Text>
              <Text style={styles.profileRibbonBody}>
                Recent recaps, personal history, and your player snapshot live here.
              </Text>
            </View>
            <Text style={styles.profileRibbonCta}>Open Profile</Text>
          </Pressable>

          <View style={styles.routeLinkGrid}>
            {GAME_HUB_LINKS.map((link) => (
              <Pressable
                key={link.route}
                style={({ pressed }) => [
                  styles.routeLinkButton,
                  pressed && styles.pressed,
                ]}
                onPress={() => handleRoutePress(link.route)}
              >
                <Text style={styles.routeLinkButtonText}>{link.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <JoinQrModal
        visible={qrJoinCode !== null}
        joinCode={qrJoinCode}
        onClose={() => setQrJoinCode(null)}
      />
    </ImageBackground>
  )
}

const styles = StyleSheet.create({
  pageBackground: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  pageBackgroundImage: {
    opacity: 1,
  },

  pageScrim: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 30, 0.76)',
  },

  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  content: {
    padding: 6,
    paddingTop: 2,
    paddingBottom: 20,
  },

  currentTableCard: {
    backgroundColor: pageSurface.panel,
    borderRadius: theme.radius.xxl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  currentTableTop: {
    gap: 10,
    marginBottom: 14,
  },

  currentTableHeaderRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  currentTableCopy: {
    flex: 1,
    minWidth: 0,
  },

  sectionCaption: {
    color: theme.colors.primaryLight,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },

  currentTableTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 6,
  },

  currentTableText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },

  currentTableMetaRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 2,
  },

  currentTableMetaText: {
    flex: 1,
    minWidth: 0,
  },

  currentTableMetaCopyHost: {
    flex: 1,
    minWidth: 0,
    minHeight: 56,
    justifyContent: 'center',
  },

  currentTableMetaTextHost: {
    lineHeight: 18,
  },

  joinCodeInlineChip: {
    marginLeft: 'auto',
    backgroundColor: pageSurface.inset,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    minWidth: 112,
    minHeight: 56,
    alignSelf: 'stretch',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  joinCodeInlineLabel: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 2,
  },

  joinCodeInlineValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  qrChip: {
    marginLeft: 8,
    backgroundColor: pageSurface.inset,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    minWidth: 56,
    minHeight: 56,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },

  ribbonRow: {
    gap: 10,
    marginBottom: 14,
  },

  infoRibbon: {
    backgroundColor: pageSurface.panelSoft,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    padding: 12,
  },

  ribbonStrong: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },

  ribbonBody: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

  expectedRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },

  expectedChip: {
    flex: 1,
    minWidth: 0,
    backgroundColor: pageSurface.inset,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  expectedChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryLight,
  },

  expectedChipDisabled: {
    opacity: 0.72,
  },

  expectedChipText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '900',
  },

  expectedChipTextActive: {
    color: theme.colors.text,
  },

  soloModeButton: {
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignSelf: 'stretch',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  soloModeButtonActive: {
    backgroundColor: pageSurface.panelRaised,
    borderColor: theme.colors.primaryLight,
  },

  soloModeButtonText: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },

  tableActionRow: {
    flexDirection: 'row',
    gap: 10,
  },

  tableActionButton: {
    flex: 1,
    minHeight: 52,
    backgroundColor: pageSurface.panelRaised,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  tableActionButtonDestructive: {
    backgroundColor: 'rgba(77, 25, 38, 0.78)',
    borderColor: 'rgba(255, 151, 178, 0.22)',
  },

  tableActionButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },

  headerRowCopy: {
    flex: 1,
    minWidth: 0,
  },

  logoutButton: {
    backgroundColor: pageSurface.panelRaised,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },

  logoutButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '900',
  },

  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },

  quickActionCard: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 86,
    backgroundColor: pageSurface.panelAlt,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    justifyContent: 'space-between',
    ...theme.shadow.card,
  },

  quickActionCardPrimary: {
    backgroundColor: 'rgba(55, 36, 95, 0.82)',
    borderColor: 'rgba(194, 170, 255, 0.24)',
  },

  quickActionCardWide: {
    flexBasis: '100%',
    minHeight: 76,
  },

  resumeActionCard: {
    marginBottom: 12,
  },

  quickActionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
  },

  quickActionBody: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

  preStartCard: {
    backgroundColor: pageSurface.panelAlt,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  preStartTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 6,
  },

  preStartBody: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

  additionalSection: {
    backgroundColor: pageSurface.panelAlt,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },

  inlinePill: {
    minWidth: 30,
    backgroundColor: 'rgba(139, 92, 246, 0.14)',
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },

  inlinePillText: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '900',
  },

  sessionRowCard: {
    backgroundColor: pageSurface.panelRaised,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 10,
  },

  sessionRowTop: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  sessionRowCopy: {
    flex: 1,
    minWidth: 0,
  },

  sessionRowCode: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 2,
  },

  sessionRowMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },

  sessionRowFacts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },

  sessionRowFact: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },

  sessionRowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },

  sessionRowFooterText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },

  rowDeleteButton: {
    backgroundColor: pageSurface.inset,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },

  rowDeleteButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },

  profileRibbon: {
    backgroundColor: pageSurface.panelAlt,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    ...theme.shadow.card,
  },

  profileRibbonCopy: {
    flex: 1,
    minWidth: 0,
  },

  profileRibbonTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },

  profileRibbonBody: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

  profileRibbonCta: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  routeLinkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  routeLinkButton: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 58,
    backgroundColor: pageSurface.panelRaised,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  routeLinkButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },

  statePill: {
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  statePillText: {
    fontSize: 12,
    fontWeight: '900',
  },

  statePillActive: {
    backgroundColor: 'rgba(112, 215, 165, 0.14)',
    borderColor: 'rgba(112, 215, 165, 0.45)',
  },

  statePillActiveText: {
    color: theme.colors.success,
  },

  statePillWaiting: {
    backgroundColor: 'rgba(245, 198, 92, 0.14)',
    borderColor: 'rgba(245, 198, 92, 0.45)',
  },

  statePillWaitingText: {
    color: theme.colors.gold,
  },

  statePillReady: {
    backgroundColor: 'rgba(127, 208, 255, 0.14)',
    borderColor: 'rgba(127, 208, 255, 0.45)',
  },

  statePillReadyText: {
    color: theme.colors.accent,
  },

  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 10,
  },

  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },

  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.94,
  },

  disabled: {
    opacity: 0.6,
  },
})
