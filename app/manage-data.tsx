import { useCallback, useEffect, useMemo, useState } from 'react'
import {
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
import { theme } from '../constants/theme'

type GuestProfileRow = {
  id: string
  display_name: string
  public_player_id: string
}

type SessionRow = {
  id: string
  join_code: string | null
  created_at?: string | null
}

export default function ManageDataScreen() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [working, setWorking] = useState(false)

  const [userId, setUserId] = useState<string | null>(null)
  const [guestProfiles, setGuestProfiles] = useState<GuestProfileRow[]>([])
  const [ownedSessions, setOwnedSessions] = useState<SessionRow[]>([])

  const guestCount = useMemo(() => guestProfiles.length, [guestProfiles])
  const sessionCount = useMemo(() => ownedSessions.length, [ownedSessions])

  const load = useCallback(async () => {
    setLoading(true)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('No authenticated user')
      }

      setUserId(user.id)

      const [
        { data: guests, error: guestsError },
        { data: sessions, error: sessionsError },
      ] = await Promise.all([
        supabase
          .from('guest_profiles')
          .select('id, display_name, public_player_id')
          .eq('owner_user_id', user.id)
          .order('display_name', { ascending: true }),
        supabase
          .from('game_sessions')
          .select('id, join_code, created_at')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false }),
      ])

      if (guestsError) throw guestsError
      if (sessionsError) throw sessionsError

      setGuestProfiles((guests ?? []) as GuestProfileRow[])
      setOwnedSessions((sessions ?? []) as SessionRow[])
    } catch (err: any) {
      Alert.alert('Load failed', err?.message ?? 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true)
      await load()
    } finally {
      setRefreshing(false)
    }
  }, [load])

  const deleteGuestProfile = useCallback(
    async (guestId: string, guestLabel: string) => {
      if (!userId) return

      Alert.alert(
        'Delete guest profile?',
        `Delete ${guestLabel} and remove its score history?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                setWorking(true)

                const { error: scoresError } = await supabase
                  .from('player_scores')
                  .delete()
                  .eq('guest_profile_id', guestId)
                  .eq('owner_user_id', userId)

                if (scoresError) throw scoresError

                const { error: guestError } = await supabase
                  .from('guest_profiles')
                  .delete()
                  .eq('id', guestId)
                  .eq('owner_user_id', userId)

                if (guestError) throw guestError

                await load()
              } catch (err: any) {
                Alert.alert('Delete failed', err?.message ?? 'Unknown error')
              } finally {
                setWorking(false)
              }
            },
          },
        ]
      )
    },
    [load, userId]
  )

  const removeMyHistory = useCallback(async () => {
    if (!userId) return

    Alert.alert(
      'Remove yourself from history?',
      'This removes your own scores, your guest-created scores, and your joined player entries from history. It does not delete whole games created by other people.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove Me',
          style: 'destructive',
          onPress: async () => {
            try {
              setWorking(true)

              const { error: myScoresError } = await supabase
                .from('player_scores')
                .delete()
                .eq('user_id', userId)

              if (myScoresError) throw myScoresError

              const { error: guestScoresError } = await supabase
                .from('player_scores')
                .delete()
                .eq('owner_user_id', userId)

              if (guestScoresError) throw guestScoresError

              const { error: sessionPlayersError } = await supabase
                .from('session_players')
                .delete()
                .eq('user_id', userId)

              if (sessionPlayersError) throw sessionPlayersError

              Alert.alert('Done', 'Your history entries were removed.')
              await load()
            } catch (err: any) {
              Alert.alert('Remove failed', err?.message ?? 'Unknown error')
            } finally {
              setWorking(false)
            }
          },
        },
      ]
    )
  }, [load, userId])

  const deleteOwnedSession = useCallback(
    async (session: SessionRow) => {
      if (!userId) return

      Alert.alert(
        'Delete full game?',
        'This deletes the whole game, all scores, and all joined players for that session.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Game',
            style: 'destructive',
            onPress: async () => {
              try {
                setWorking(true)

                const { error: scoresError } = await supabase
                  .from('player_scores')
                  .delete()
                  .eq('session_id', session.id)

                if (scoresError) throw scoresError

                const { error: playersError } = await supabase
                  .from('session_players')
                  .delete()
                  .eq('session_id', session.id)

                if (playersError) throw playersError

                const { error: sessionError } = await supabase
                  .from('game_sessions')
                  .delete()
                  .eq('id', session.id)
                  .eq('created_by', userId)

                if (sessionError) throw sessionError

                await load()
              } catch (err: any) {
                Alert.alert('Delete failed', err?.message ?? 'Unknown error')
              } finally {
                setWorking(false)
              }
            },
          },
        ]
      )
    },
    [load, userId]
  )

  const deleteAllSupabaseData = useCallback(async () => {
    Alert.alert(
      'Delete Supabase account and data?',
      'This permanently deletes your app data and your Supabase Auth account. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              setWorking(true)

              const { data, error } = await supabase.functions.invoke('delete-account', {
                body: {},
              })

              if (error) throw error
              if (data?.error) throw new Error(data.error)

              await supabase.auth.signOut()
              Alert.alert('Account deleted', 'Your Supabase data and account were deleted.')
              router.replace('/')
            } catch (err: any) {
              Alert.alert('Delete failed', err?.message ?? 'Unknown error')
            } finally {
              setWorking(false)
            }
          },
        },
      ]
    )
  }, [])

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.accent}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <Text style={styles.kicker}>Privacy & Cleanup</Text>
        <Text style={styles.title}>Manage Data</Text>
        <Text style={styles.subtitle}>
          Delete guest profiles, remove yourself from history, delete games you created, or permanently delete your Supabase account and data.
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.buttonPressed,
            (working || loading) && styles.buttonDisabled,
          ]}
          onPress={removeMyHistory}
          disabled={working || loading}
        >
          <Text style={styles.actionButtonText}>Remove Me From Game History</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.dangerButton,
            pressed && styles.buttonPressed,
            (working || loading) && styles.buttonDisabled,
          ]}
          onPress={deleteAllSupabaseData}
          disabled={working || loading}
        >
          <Text style={styles.dangerButtonText}>Delete My Supabase Account & Data</Text>
        </Pressable>

        <Text style={styles.helperText}>
          This is permanent. It deletes public table data and your Supabase auth user.
        </Text>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Guest Profiles I Created</Text>
          <Text style={styles.sectionCount}>{guestCount}</Text>
        </View>

        {loading ? (
          <Text style={styles.emptyText}>Loading guest profiles...</Text>
        ) : guestProfiles.length === 0 ? (
          <Text style={styles.emptyText}>No guest profiles under your account.</Text>
        ) : (
          guestProfiles.map((guest) => (
            <View key={guest.id} style={styles.rowCard}>
              <View style={styles.rowMeta}>
                <Text style={styles.rowTitle}>{guest.display_name}</Text>
                <Text style={styles.rowSub}>{guest.public_player_id}</Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.smallDangerButton,
                  pressed && styles.buttonPressed,
                  working && styles.buttonDisabled,
                ]}
                onPress={() =>
                  deleteGuestProfile(
                    guest.id,
                    `${guest.display_name} (${guest.public_player_id})`
                  )
                }
                disabled={working}
              >
                <Text style={styles.smallDangerButtonText}>Delete</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Games I Created</Text>
          <Text style={styles.sectionCount}>{sessionCount}</Text>
        </View>

        {loading ? (
          <Text style={styles.emptyText}>Loading owned games...</Text>
        ) : ownedSessions.length === 0 ? (
          <Text style={styles.emptyText}>No owned game history found.</Text>
        ) : (
          ownedSessions.map((session) => (
            <View key={session.id} style={styles.rowCard}>
              <View style={styles.rowMeta}>
                <Text style={styles.rowTitle}>
                  {session.join_code ? `Code ${session.join_code}` : 'Owned Session'}
                </Text>
                <Text style={styles.rowSub}>{session.id}</Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.smallDangerButton,
                  pressed && styles.buttonPressed,
                  working && styles.buttonDisabled,
                ]}
                onPress={() => deleteOwnedSession(session)}
                disabled={working}
              >
                <Text style={styles.smallDangerButtonText}>Delete Game</Text>
              </Pressable>
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
    padding: 12,
    paddingBottom: 28,
  },
  heroCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    marginBottom: 12,
    ...theme.shadow.card,
  },
  kicker: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 6,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 12,
    ...theme.shadow.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 10,
  },
  sectionCount: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '900',
  },
  actionButton: {
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  actionButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  dangerButton: {
    backgroundColor: 'rgba(240, 138, 126, 0.14)',
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  dangerButtonText: {
    color: theme.colors.error,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  helperText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  rowMeta: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 2,
  },
  rowSub: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  smallDangerButton: {
    backgroundColor: 'rgba(240, 138, 126, 0.14)',
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  smallDangerButtonText: {
    color: theme.colors.error,
    fontSize: 12,
    fontWeight: '900',
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
})