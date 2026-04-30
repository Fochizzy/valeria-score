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
import { copyJoinCodeWithFeedback } from '../lib/copy-join-code-client'
import { logoutAndClearActiveSessionState } from '../lib/logout'
import { supabase } from '../lib/supabase'
import { Alert } from '../lib/themed-alert'
import ValeriaHeader from '../components/ValeriaHeader'
import CountBadge from '../components/CountBadge'
import {
  createGameSession,
  deleteInProgressSession,
  getMyInProgressSessions,
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

const citizenBackdrop = require('../assets/Citizen Backdrop.png')
const pageSurface = {
  panel: 'rgba(25, 18, 43, 0.68)',
  panelAlt: 'rgba(31, 22, 52, 0.7)',
  panelRaised: 'rgba(38, 27, 63, 0.74)',
  inset: 'rgba(18, 24, 43, 0.66)',
}
const SESSION_SHORTCUTS = [
  { label: 'Player Stats', route: '/player-stats' as const },
  { label: 'Duke Stats', route: '/duke-stats' as const },
  { label: 'Profile', route: '/profile' as const },
]

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

export default function CreateSessionScreen() {
  const [creating, setCreating] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sessions, setSessions] = useState<InProgressSession[]>([])
  const [deletingId, setDeletingId] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const didFocusRefreshRef = useRef(false)

  const loadSessions = useCallback(async () => {
    try {
      setLoadingSessions(true)
      const data = await getMyInProgressSessions()
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
      const data = await getMyInProgressSessions()
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

  function handleShortcutPress(route: (typeof SESSION_SHORTCUTS)[number]['route']) {
    router.push(route)
  }

  function handleNestedPress(event: GestureResponderEvent) {
    event.stopPropagation()
  }

  async function handleCreateSession() {
    try {
      setCreating(true)
      const { session } = await createGameSession()

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
      Alert.alert('Create session failed', err?.message ?? 'Unknown error')
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
      session.is_host ? 'Delete session?' : 'Leave session?',
      session.is_host
        ? 'This removes the session if it has no locked scores yet.'
        : 'This removes your unfinished participation from the session.',
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
          <ValeriaHeader
            compact
            title="Game Sessions"
            subtitle="Create, resume, or leave an active table"
            rightLabel={loggingOut ? 'Logging Out...' : 'Logout'}
            onRightPress={handleLogout}
            rightDisabled={loggingOut}
          />

          <View style={styles.heroCard}>
            <View style={styles.heroContent}>
              <Text style={styles.kicker}>Valeria Score</Text>
              <Text style={styles.heroTitle}>Start or Resume</Text>
              <Text style={styles.subtitle}>
                Start a new table or jump back into any game you are currently part of.
              </Text>

              <View style={styles.heroButtons}>
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.pressed,
                    creating && styles.disabled,
                  ]}
                  onPress={handleCreateSession}
                  disabled={creating}
                >
                  <Text style={styles.primaryButtonText}>
                    {creating ? 'Creating...' : 'New Session'}
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => router.push('/join-game')}
                >
                  <Text style={styles.secondaryButtonText}>Join Game</Text>
                </Pressable>
              </View>

              <View style={styles.quickLinksSection}>
                <Text style={styles.quickLinksLabel}>Quick Links</Text>

                <View style={styles.quickLinksGrid}>
                  {SESSION_SHORTCUTS.map((shortcut) => (
                    <Pressable
                      key={shortcut.route}
                      style={({ pressed }) => [
                        styles.quickLinkButton,
                        shortcut.route === '/profile' && styles.quickLinkButtonWide,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => handleShortcutPress(shortcut.route)}
                    >
                      <Text style={styles.quickLinkButtonText}>{shortcut.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>In Progress</Text>
              <CountBadge value={sessions.length} />
            </View>

            {loadingSessions ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={theme.colors.accent} />
                <Text style={styles.loadingText}>Loading your games...</Text>
              </View>
            ) : sessions.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No active sessions</Text>
                <Text style={styles.emptyText}>
                  Create a new session to start scoring.
                </Text>

                <Pressable
                  style={({ pressed }) => [
                    styles.emptyButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={handleCreateSession}
                >
                  <Text style={styles.emptyButtonText}>Start New Session</Text>
                </Pressable>
              </View>
            ) : (
              sessions.map((session) => {
                const meta = buildSessionCardMeta({
                  playerCount: session.player_count,
                  totalEntries: session.total_entries,
                  lockedCount: session.locked_count,
                })

                return (
                  <Pressable
                    key={session.id}
                    style={({ pressed }) => [
                      styles.sessionCard,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => handleResumeSession(session)}
                  >
                    <View style={styles.sessionTop}>
                      <View style={styles.sessionMeta}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.sessionCodeButton,
                            pressed && styles.pressed,
                            !session.join_code && styles.disabled,
                          ]}
                          onPress={(event) => {
                            handleNestedPress(event)
                            void handleCopyJoinCode(session.join_code)
                          }}
                          disabled={!session.join_code}
                        >
                          <Text style={styles.sessionCodeLabel}>Join Code</Text>
                          <Text style={styles.sessionCode}>{session.join_code || 'No Code'}</Text>
                        </Pressable>

                        <Text style={styles.sessionTime}>Updated {formatDate(session.updated_at)}</Text>
                        <Text style={styles.sessionRole}>
                          {session.is_host ? 'Host' : 'Participant'}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.sessionPill,
                          meta.isReadyToFinish
                            ? styles.sessionPillReady
                            : session.total_entries > 0
                            ? styles.sessionPillActive
                            : styles.sessionPillWaiting,
                        ]}
                      >
                        <Text
                          style={[
                            styles.sessionPillText,
                            meta.isReadyToFinish
                              ? styles.sessionPillReadyText
                              : session.total_entries > 0
                              ? styles.sessionPillActiveText
                              : styles.sessionPillWaitingText,
                          ]}
                        >
                          {meta.statusValue}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.sessionFactsRow}>
                      <View style={styles.sessionFact}>
                        <Text style={styles.sessionFactLabel}>Players</Text>
                        <Text style={styles.sessionFactValue}>{meta.playersValue}</Text>
                      </View>

                      <View style={styles.sessionFact}>
                        <Text style={styles.sessionFactLabel}>Saved</Text>
                        <Text style={styles.sessionFactValue}>{meta.savedValue}</Text>
                      </View>
                    </View>

                    <View style={styles.sessionFooter}>
                      <View style={styles.sessionFooterCopy}>
                        <Text style={styles.sessionFooterTitle}>Tap anywhere to resume</Text>
                        <Text style={styles.sessionFooterText}>
                          {session.is_host
                            ? 'Jump back into scoring for this table.'
                            : 'Jump back into scoring for this shared table.'}
                        </Text>
                      </View>

                      <Pressable
                        style={({ pressed }) => [
                          styles.deleteButton,
                          pressed && styles.pressed,
                          deletingId === session.id && styles.disabled,
                        ]}
                        onPress={(event) => {
                          handleNestedPress(event)
                          handleDeleteSession(session)
                        }}
                        disabled={deletingId === session.id}
                      >
                        <Text style={styles.deleteButtonText}>
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
              })
            )}
          </View>
        </ScrollView>
      </View>
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
    padding: 10,
    paddingTop: 4,
    paddingBottom: theme.layout.floatingNavClearance,
  },

  heroCard: {
    backgroundColor: pageSurface.panel,
    borderRadius: theme.radius.xxl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  heroContent: {
    minHeight: 192,
    justifyContent: 'flex-end',
  },

  kicker: {
    color: theme.colors.primaryLight,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },

  heroTitle: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
  },

  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    marginBottom: 14,
  },

  heroButtons: {
    flexDirection: 'row',
    gap: 10,
  },

  quickLinksSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSoft,
    gap: 10,
  },

  quickLinksLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  quickLinksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  quickLinkButton: {
    flexGrow: 1,
    flexBasis: '48%',
    minHeight: 52,
    backgroundColor: pageSurface.inset,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickLinkButtonWide: {
    flexBasis: '100%',
  },

  quickLinkButtonText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },

  primaryButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.glow,
  },

  primaryButtonText: {
    color: theme.colors.text,
    fontWeight: '900',
    fontSize: 15,
  },

  secondaryButton: {
    minWidth: 112,
    backgroundColor: pageSurface.panelRaised,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 15,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    color: theme.colors.text,
    fontWeight: '800',
    fontSize: 14,
  },

  sectionCard: {
    backgroundColor: pageSurface.panelAlt,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    ...theme.shadow.card,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },

  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },

  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 10,
  },

  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },

  emptyCard: {
    backgroundColor: pageSurface.panelRaised,
    borderRadius: theme.radius.lg,
    padding: 18,
    alignItems: 'center',
  },

  emptyTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },

  emptyText: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '700',
  },

  emptyButton: {
    marginTop: 14,
    minWidth: 180,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.glow,
  },

  emptyButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },

  sessionCard: {
    backgroundColor: pageSurface.panelRaised,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 10,
    ...theme.shadow.card,
  },

  sessionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },

  sessionMeta: {
    flex: 1,
    minWidth: 0,
  },

  sessionCodeButton: {
    alignSelf: 'flex-start',
  },

  sessionCodeLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },

  sessionCode: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  sessionTime: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '700',
  },

  sessionRole: {
    color: theme.colors.accent,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },

  sessionPill: {
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  sessionPillText: {
    fontSize: 12,
    fontWeight: '900',
  },

  sessionPillActive: {
    backgroundColor: 'rgba(112, 215, 165, 0.14)',
    borderColor: 'rgba(112, 215, 165, 0.45)',
  },

  sessionPillActiveText: {
    color: theme.colors.success,
  },

  sessionPillWaiting: {
    backgroundColor: 'rgba(245, 198, 92, 0.14)',
    borderColor: 'rgba(245, 198, 92, 0.45)',
  },

  sessionPillWaitingText: {
    color: theme.colors.gold,
  },

  sessionPillReady: {
    backgroundColor: 'rgba(127, 208, 255, 0.14)',
    borderColor: 'rgba(127, 208, 255, 0.45)',
  },

  sessionPillReadyText: {
    color: theme.colors.accent,
  },

  sessionFactsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },

  sessionFact: {
    flex: 1,
    backgroundColor: pageSurface.inset,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  sessionFactLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  sessionFactValue: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  sessionFooter: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },

  sessionFooterCopy: {
    flex: 1,
    minWidth: 0,
  },

  sessionFooterTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },

  sessionFooterText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

  deleteButton: {
    minWidth: 94,
    backgroundColor: pageSurface.inset,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },

  deleteButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '800',
  },

  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.94,
  },

  disabled: {
    opacity: 0.6,
  },
})
