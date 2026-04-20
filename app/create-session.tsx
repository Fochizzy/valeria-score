import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '../lib/supabase'
import {
  createGameSession,
  deleteInProgressSession,
  getMyInProgressSessions,
  type InProgressSession,
} from '../lib/create-session'
import { setActiveJoinCode, setActiveSessionId } from '../lib/sessions'
import { theme } from '../constants/theme'

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

  async function handleLogout() {
    try {
      setLoggingOut(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
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
      'Delete session?',
      'This removes the session if it has no locked scores yet.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(session.id)
              await deleteInProgressSession(session.id)
              setSessions((current) => current.filter((item) => item.id !== session.id))
            } catch (err: any) {
              Alert.alert('Delete failed', err?.message ?? 'Unknown error')
            } finally {
              setDeletingId('')
            }
          },
        },
      ]
    )
  }

  return (
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
      <View style={styles.heroCard}>
        <Text style={styles.kicker}>Valeria Score</Text>
        <Text style={styles.title}>Game Sessions</Text>
        <Text style={styles.subtitle}>
          Start a new table or jump back into one that is still in progress.
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
              loggingOut && styles.disabled,
            ]}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            <Text style={styles.secondaryButtonText}>
              {loggingOut ? 'Logging Out...' : 'Logout'}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>In Progress</Text>
          <Text style={styles.sectionMeta}>{sessions.length} open</Text>
        </View>

        {loadingSessions ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={theme.colors.accent} />
            <Text style={styles.loadingText}>Loading your sessions...</Text>
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No active sessions</Text>
            <Text style={styles.emptyText}>
              Create a new session to start scoring.
            </Text>
          </View>
        ) : (
          sessions.map((session) => (
            <View key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sessionCode}>{session.join_code}</Text>
                  <Text style={styles.sessionTime}>
                    Updated {formatDate(session.updated_at)}
                  </Text>
                </View>

                <View style={styles.sessionPill}>
                  <Text style={styles.sessionPillText}>Open</Text>
                </View>
              </View>

              <View style={styles.sessionActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.resumeButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => handleResumeSession(session)}
                >
                  <Text style={styles.resumeButtonText}>Resume</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.deleteButton,
                    pressed && styles.pressed,
                    deletingId === session.id && styles.disabled,
                  ]}
                  onPress={() => handleDeleteSession(session)}
                  disabled={deletingId === session.id}
                >
                  <Text style={styles.deleteButtonText}>
                    {deletingId === session.id ? 'Deleting...' : 'Delete'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
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
    padding: 16,
    paddingBottom: 28,
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xxl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 20,
    marginBottom: 14,
    ...theme.shadow.glow,
  },
  kicker: {
    color: theme.colors.primaryLight,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  title: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 18,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 10,
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
    backgroundColor: theme.colors.surfaceRaised,
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
    backgroundColor: theme.colors.surfaceAlt,
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
  sectionMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
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
  },
  emptyCard: {
    backgroundColor: theme.colors.surfaceRaised,
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
  },
  sessionCard: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 10,
  },
  sessionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
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
  },
  sessionPill: {
    backgroundColor: 'rgba(112, 215, 165, 0.14)',
    borderColor: 'rgba(112, 215, 165, 0.45)',
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sessionPillText: {
    color: theme.colors.success,
    fontSize: 12,
    fontWeight: '900',
  },
  sessionActions: {
    flexDirection: 'row',
    gap: 10,
  },
  resumeButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.lg,
    paddingVertical: 13,
    alignItems: 'center',
  },
  resumeButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  deleteButton: {
    minWidth: 108,
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    paddingVertical: 13,
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