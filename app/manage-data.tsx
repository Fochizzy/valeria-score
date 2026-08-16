import { MaterialCommunityIcons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { File, Paths } from 'expo-file-system'
import { router } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  Image,
  ImageBackground,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import ActionDialogModal, {
  type ActionDialogModalAction,
} from '../components/ActionDialogModal'
import { theme } from '../constants/theme'
import { getGuestProfileLabels } from '../lib/guest-profile-identity'
import {
  buildHistoryExportCsv,
  buildHistoryExportFileName,
  type HistoryExportSessionScoreRow,
} from '../lib/history-export'
import {
  buildManageDataHistoryItems,
  type ManageDataHistoryItem,
  type ManageDataSoloHistoryItem,
} from '../lib/manage-data-history'
import {
  deleteMyAccountAndData,
  deleteGuestProfile as deleteGuestProfileRpc,
  leaveAllGames as leaveAllGamesRpc,
  leaveOwnedOrJoinedGame as leaveOwnedOrJoinedGameRpc,
  deleteOwnedGame as deleteOwnedGameRpc,
  reopenFinishedGame as reopenFinishedGameRpc,
} from '../lib/manage'
import { buildDangerFlowCopy } from '../lib/p3-feedback'
import {
  buildSessionParticipationSummaries,
  filterCompletedSessions,
} from '../lib/session-participation-state'
import {
  clearActiveSessionState,
  setActiveJoinCode,
  setActiveSessionId,
} from '../lib/sessions'
import {
  getSoloVictoryConditionCopy,
  normalizeSoloDraft,
  SOLO_DRAFT_STORAGE_KEY,
} from '../lib/solo-mode'
import {
  deleteSoloGameResult,
  loadSoloResults,
  type SoloGameResultRow,
} from '../lib/solo-stats'
import { supabase } from '../lib/supabase'
import { Alert } from '../lib/themed-alert'

const logo = require('../assets/valeria_logo.png')
const accountBackdrop = require('../assets/Deletion Page.png')
const DISPLAY_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'serif',
})

type GuestProfileRow = {
  id: string
  display_name: string
  public_player_id: string
}

type SessionRow = {
  id: string
  join_code: string | null
  created_at?: string | null
  updated_at?: string | null
  is_host: boolean
}

function formatHistoryDate(value: string | null | undefined) {
  if (!value) return null

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleString()
}

function buildHistoryCardCopy(item: ManageDataHistoryItem) {
  if (item.kind === 'session') {
    return {
      label: item.isHost ? 'Hosted Game' : 'Joined Game',
      title: item.joinCode ? `Join Code ${item.joinCode}` : 'Completed Game',
      subtitle: item.updatedAt ? `Finished ${formatHistoryDate(item.updatedAt)}` : item.id,
    }
  }

  const savedAt = formatHistoryDate(item.updatedAt ?? item.createdAt)
  const winnerCopy = item.winner === 'player' ? 'Player victory' : 'Dark Lord victory'

  return {
    label: 'Solo Game',
    title: getSoloVictoryConditionCopy(item.victoryCondition)?.title ?? 'Solo Result',
    subtitle: savedAt ? `${winnerCopy} · Saved ${savedAt}` : winnerCopy,
  }
}

export default function ManageDataScreen() {
  const [refreshing, setRefreshing] = useState(false)
  const [working, setWorking] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(20)
  const [guestProfiles, setGuestProfiles] = useState<GuestProfileRow[]>([])
  const [completedSessions, setCompletedSessions] = useState<SessionRow[]>([])
  const [soloResults, setSoloResults] = useState<SoloGameResultRow[]>([])
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<ManageDataHistoryItem | null>(
    null
  )
  const longPressHistoryIdRef = useRef<string | null>(null)
  const didFocusRefreshRef = useRef(false)

  const guestCount = useMemo(() => guestProfiles.length, [guestProfiles])
  const historyItems = useMemo(
    () => buildManageDataHistoryItems({ completedSessions, soloResults }),
    [completedSessions, soloResults]
  )
  const sessionCount = useMemo(() => historyItems.length, [historyItems])

  const load = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) throw new Error('No authenticated user')
      const [
        { data: guests, error: guestsError },
        { data: memberships, error: membershipError },
        nextSoloResults,
      ] =
        await Promise.all([
          supabase
            .from('guest_profiles')
            .select('id, display_name, public_player_id')
            .eq('owner_user_id', user.id)
            .order('display_name', { ascending: true }),
          supabase
            .from('session_players')
            .select('session_id')
            .eq('user_id', user.id),
          loadSoloResults(user.id),
        ])

      if (guestsError) throw guestsError
      if (membershipError) throw membershipError

      const sessionIds = [
        ...new Set(
          ((memberships ?? []) as { session_id: string }[]).map((row) => row.session_id)
        ),
      ]

      let sessions: SessionRow[] = []

      if (sessionIds.length > 0) {
        const [
          { data: sessionData, error: sessionsError },
          { data: scoreRows, error: scoreError },
          { data: playerRows, error: playerError },
        ] = await Promise.all([
          supabase
            .from('game_sessions')
            .select('id, join_code, created_at, created_by')
            .in('id', sessionIds),
          supabase
            .from('session_scores')
            .select('session_id, game_locked, updated_at')
            .in('session_id', sessionIds),
          supabase
            .from('session_players')
            .select('session_id')
            .in('session_id', sessionIds),
        ])

        if (sessionsError) throw sessionsError
        if (scoreError) throw scoreError
        if (playerError) throw playerError

        sessions = filterCompletedSessions(
          buildSessionParticipationSummaries({
            sessions: ((sessionData ?? []) as {
              id: string
              join_code: string
              created_at: string
              created_by: string
            }[]) ?? [],
            scoreRows: ((scoreRows ?? []) as {
              session_id: string
              game_locked: boolean | null
              updated_at: string | null
            }[]) ?? [],
            playerRows: ((playerRows ?? []) as { session_id: string }[]) ?? [],
            currentUserId: user.id,
          })
        ).map((session) => ({
          id: session.id,
          join_code: session.join_code,
          created_at: session.created_at,
          updated_at: session.updated_at,
          is_host: session.is_host,
        }))
      }

      setGuestProfiles((guests ?? []) as GuestProfileRow[])
      setCompletedSessions(sessions)
      setSoloResults(nextSoloResults)
    } catch (err: any) {
      Alert.alert('Load failed', err?.message ?? 'Unknown error')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useFocusEffect(
    useCallback(() => {
      if (!didFocusRefreshRef.current) {
        didFocusRefreshRef.current = true
        return
      }

      void load()
    }, [load])
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const handleExportHistoryCsv = useCallback(async () => {
    try {
      setExportingCsv(true)

      const sessionIds = completedSessions.map((session) => session.id)
      let scoreRows: HistoryExportSessionScoreRow[] = []

      if (sessionIds.length > 0) {
        // Prefer the recap identity columns; fall back for databases that
        // predate them, mirroring the recap screen's tolerance.
        const primary = await supabase
          .from('session_scores')
          .select(
            'session_id, player_name, recap_player_name, recap_player_id, duke_slug, score_total, placement, is_winner'
          )
          .in('session_id', sessionIds)
          .eq('game_locked', true)

        if (!primary.error) {
          scoreRows = (primary.data ?? []) as HistoryExportSessionScoreRow[]
        } else {
          const legacy = await supabase
            .from('session_scores')
            .select(
              'session_id, player_name, duke_slug, score_total, placement, is_winner'
            )
            .in('session_id', sessionIds)
            .eq('game_locked', true)

          if (legacy.error) throw legacy.error
          scoreRows = (legacy.data ?? []) as HistoryExportSessionScoreRow[]
        }
      }

      const scoreRowsBySession = new Map<string, HistoryExportSessionScoreRow[]>()

      for (const row of scoreRows) {
        const bucket = scoreRowsBySession.get(row.session_id)

        if (bucket) {
          bucket.push(row)
        } else {
          scoreRowsBySession.set(row.session_id, [row])
        }
      }

      const csv = buildHistoryExportCsv({
        sessionGames: completedSessions.map((session) => ({
          id: session.id,
          joinCode: session.join_code,
          finishedAt: session.updated_at ?? session.created_at ?? null,
        })),
        scoreRowsBySession,
        soloGames: soloResults,
      })

      const file = new File(
        Paths.cache,
        buildHistoryExportFileName(new Date().toISOString())
      )
      file.write(csv)

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export game history',
        })
      } else {
        Alert.alert('Export ready', `CSV saved to ${file.uri}`)
      }
    } catch (err: any) {
      Alert.alert('Export failed', err?.message ?? 'Unknown error')
    } finally {
      setExportingCsv(false)
    }
  }, [completedSessions, soloResults])

  const handleDeleteGuestProfile = useCallback(
    async (guestId: string, guestLabel: string) => {
      const copy = buildDangerFlowCopy('deleteGuestProfile', guestLabel)

      Alert.alert(copy.title, copy.body, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: copy.confirmLabel,
          style: 'destructive',
          onPress: async () => {
            try {
              setWorking(true)
              await deleteGuestProfileRpc(guestId)
              await load()
              Alert.alert('Deleted', `${guestLabel} was removed.`)
            } catch (err: any) {
              Alert.alert('Delete failed', err?.message ?? 'Unknown error')
            } finally {
              setWorking(false)
            }
          },
        },
      ])
    },
    [load]
  )

  const handleDeleteOwnedSession = useCallback(
    async (session: SessionRow) => {
      const label = session.join_code ? `game ${session.join_code}` : 'this game'
      const copy = buildDangerFlowCopy('deleteOwnedGame', label)

      Alert.alert(copy.title, copy.body, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: copy.confirmLabel,
          style: 'destructive',
          onPress: async () => {
            try {
              setWorking(true)
              await deleteOwnedGameRpc(session.id)
              await load()
              Alert.alert('Deleted', `${label} was removed.`)
            } catch (err: any) {
              Alert.alert('Delete failed', err?.message ?? 'Unable to delete game.')
            } finally {
              setWorking(false)
            }
          },
        },
      ])
    },
    [load]
  )

  const handleOpenRecap = useCallback((session: SessionRow) => {
    const target = session.join_code
      ? {
          pathname: '/game-recap',
          params: {
            sessionId: session.id,
            joinCode: session.join_code,
          },
        }
      : {
          pathname: '/game-recap',
          params: {
            sessionId: session.id,
          },
        }

    router.push(target as never)
  }, [])

  const handleEditSoloGame = useCallback((soloGame: ManageDataSoloHistoryItem) => {
    router.push({
      pathname: '/solo-score',
      params: {
        soloGameId: soloGame.id,
      },
    } as never)
  }, [])

  const handleOpenHistoryItem = useCallback(
    (item: ManageDataHistoryItem) => {
      if (item.kind === 'session') {
        handleOpenRecap({
          id: item.id,
          join_code: item.joinCode,
          created_at: item.createdAt,
          updated_at: item.updatedAt,
          is_host: item.isHost,
        })
        return
      }

      handleEditSoloGame(item)
    },
    [handleEditSoloGame, handleOpenRecap]
  )

  const handleDeleteMyInvolvement = useCallback(
    async (session: SessionRow) => {
      Alert.alert('Delete My Involvement?', 'This finished game stays in shared history, but your player ID will be replaced with Mx. Doe and removed from your personal stats.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Involvement',
          style: 'destructive',
          onPress: async () => {
            try {
              setWorking(true)
              await leaveOwnedOrJoinedGameRpc(session.id)
              await clearActiveSessionState()
              await load()
              Alert.alert('Removed', 'Your involvement was removed from this game.')
            } catch (err: any) {
              Alert.alert('Remove failed', err?.message ?? 'Unknown error')
            } finally {
              setWorking(false)
            }
          },
        },
      ])
    },
    [load]
  )

  const handleReopenSession = useCallback(
    async (session: SessionRow) => {
      Alert.alert(
        'Re-Open Game?',
        'This finished game will move back to active play for everyone. Existing scores stay in place, but every player will need to re-save before the host can finish it again.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Re-Open Game',
            style: 'destructive',
            onPress: async () => {
              try {
                setWorking(true)
                await reopenFinishedGameRpc(session.id)
                await Promise.all([
                  setActiveSessionId(session.id),
                  setActiveJoinCode(session.join_code ?? ''),
                ])
                await load()
                router.replace({
                  pathname: '/compare',
                  params: session.join_code
                    ? { sessionId: session.id, joinCode: session.join_code }
                    : { sessionId: session.id },
                } as never)
              } catch (err: any) {
                Alert.alert('Re-open failed', err?.message ?? 'Unable to re-open game.')
              } finally {
                setWorking(false)
              }
            },
          },
        ]
      )
    },
    [load]
  )

  const handleDeleteSoloHistory = useCallback(
    async (soloGame: ManageDataSoloHistoryItem) => {
      Alert.alert(
        'Delete Solo Game?',
        'This permanently removes the saved solo result from your solo history and solo statistics.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Solo Game',
            style: 'destructive',
            onPress: async () => {
              try {
                setWorking(true)
                await deleteSoloGameResult(soloGame.id)

                try {
                  const storedDraft = await AsyncStorage.getItem(SOLO_DRAFT_STORAGE_KEY)
                  if (storedDraft) {
                    const parsedDraft = normalizeSoloDraft(JSON.parse(storedDraft))
                    if (parsedDraft.savedGameId === soloGame.id) {
                      await AsyncStorage.removeItem(SOLO_DRAFT_STORAGE_KEY)
                    }
                  }
                } catch {}

                await load()
                Alert.alert('Deleted', 'The solo game was removed.')
              } catch (err: any) {
                Alert.alert('Delete failed', err?.message ?? 'Unable to delete solo game.')
              } finally {
                setWorking(false)
              }
            },
          },
        ]
      )
    },
    [load]
  )

  const removeMyHistory = useCallback(async () => {
    const copy = buildDangerFlowCopy('removeMyHistory')

    Alert.alert(copy.title, copy.body, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: copy.confirmLabel,
        style: 'destructive',
        onPress: async () => {
          try {
            setWorking(true)
            await leaveAllGamesRpc()
            await clearActiveSessionState()
            await load()
            Alert.alert('Done', 'Your finished games now show Mx. Doe, and any unfinished participation was removed.')
          } catch (err: any) {
            Alert.alert('Remove failed', err?.message ?? 'Unknown error')
          } finally {
            setWorking(false)
          }
        },
      },
    ])
  }, [load])

  const deleteMyAccount = useCallback(async () => {
    const copy = buildDangerFlowCopy('deleteAccount')

    Alert.alert(copy.title, copy.body, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: copy.confirmLabel,
        style: 'destructive',
        onPress: async () => {
          try {
            setWorking(true)
            await deleteMyAccountAndData()
            await clearActiveSessionState()
            router.replace('/')
          } catch (err: any) {
            Alert.alert('Delete failed', err?.message ?? 'Unknown error')
          } finally {
            setWorking(false)
          }
        },
      },
    ])
  }, [])
  const historyMenuActions: ActionDialogModalAction[] = useMemo(() => {
    if (!selectedHistoryItem) {
      return [{ id: 'cancel', text: 'Cancel', style: 'cancel' }]
    }

    if (selectedHistoryItem.kind === 'solo') {
      return [
        {
          id: 'editSoloGame',
          text: 'Edit Solo Game',
          onPress: () => {
            setSelectedHistoryItem(null)
            handleEditSoloGame(selectedHistoryItem)
          },
        },
        {
          id: 'deleteSoloGame',
          text: 'Delete Solo Game',
          style: 'destructive',
          disabled: working,
          onPress: () => {
            setSelectedHistoryItem(null)
            void handleDeleteSoloHistory(selectedHistoryItem)
          },
        },
        {
          id: 'cancel',
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setSelectedHistoryItem(null),
        },
      ]
    }

    const actions: ActionDialogModalAction[] = [
      {
        id: 'viewRecap',
        text: 'View Recap',
        onPress: () => {
          setSelectedHistoryItem(null)
          handleOpenRecap({
            id: selectedHistoryItem.id,
            join_code: selectedHistoryItem.joinCode,
            created_at: selectedHistoryItem.createdAt,
            updated_at: selectedHistoryItem.updatedAt,
            is_host: selectedHistoryItem.isHost,
          })
        },
      },
      {
        id: 'deleteMyInvolvement',
        text: 'Delete My Involvement',
        style: 'destructive',
        disabled: working,
        onPress: () => {
          setSelectedHistoryItem(null)
          void handleDeleteMyInvolvement({
            id: selectedHistoryItem.id,
            join_code: selectedHistoryItem.joinCode,
            created_at: selectedHistoryItem.createdAt,
            updated_at: selectedHistoryItem.updatedAt,
            is_host: selectedHistoryItem.isHost,
          })
        },
      },
    ]

    if (selectedHistoryItem.isHost) {
      actions.push({
        id: 'reopenGame',
        text: 'Re-Open Game',
        disabled: working,
        onPress: () => {
          setSelectedHistoryItem(null)
          void handleReopenSession({
            id: selectedHistoryItem.id,
            join_code: selectedHistoryItem.joinCode,
            created_at: selectedHistoryItem.createdAt,
            updated_at: selectedHistoryItem.updatedAt,
            is_host: selectedHistoryItem.isHost,
          })
        },
      })

      actions.push({
        id: 'deleteGame',
        text: 'Delete Game',
        style: 'destructive',
        disabled: working,
        onPress: () => {
          setSelectedHistoryItem(null)
          void handleDeleteOwnedSession({
            id: selectedHistoryItem.id,
            join_code: selectedHistoryItem.joinCode,
            created_at: selectedHistoryItem.createdAt,
            updated_at: selectedHistoryItem.updatedAt,
            is_host: selectedHistoryItem.isHost,
          })
        },
      })
    }

    actions.push({
      id: 'cancel',
      text: 'Cancel',
      style: 'cancel',
      onPress: () => setSelectedHistoryItem(null),
    })

    return actions
  }, [
    handleDeleteSoloHistory,
    handleDeleteMyInvolvement,
    handleDeleteOwnedSession,
    handleEditSoloGame,
    handleOpenRecap,
    handleReopenSession,
    selectedHistoryItem,
    working,
  ])

  return (
    <View style={styles.screen}>
      <ImageBackground
        source={accountBackdrop}
        style={styles.backdrop}
        imageStyle={styles.backdropImage}
        resizeMode="cover"
      >
        <View style={styles.backdropTint}>
          <ScrollView
            style={styles.scroll}
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
            <View style={styles.heroSection}>
              <View style={styles.logoCrop}>
                <Image source={logo} style={styles.logo} resizeMode="contain" />
              </View>
              <Text style={styles.brandWord}>Account</Text>
              <Text style={styles.heroSubtitle}>
                Review guest profiles, finished games, and the account data tied to your
                scoring history.
              </Text>
            </View>

            <View style={styles.cardsStack}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Manage Your Account</Text>
                <Text style={styles.summaryBody}>
                  Keep cleanup tools in one place without breaking the visual language of the
                  rest of the app.
                </Text>

                <View style={styles.summaryStats}>
                  <View style={styles.summaryPill}>
                    <Text style={styles.summaryValue}>{guestCount}</Text>
                    <Text style={styles.summaryPillLabel}>Guests</Text>
                  </View>

                  <View style={styles.summaryPill}>
                    <Text style={styles.summaryValue}>{sessionCount}</Text>
                    <Text style={styles.summaryPillLabel}>Games</Text>
                  </View>
                </View>
              </View>

              <View style={styles.sectionsColumn}>
                <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconWrap}>
                    <MaterialCommunityIcons
                      name="account-group"
                      size={18}
                      color={theme.colors.accent}
                    />
                  </View>

                  <View style={styles.sectionHeaderCopy}>
                    <Text style={styles.sectionTitle}>Guest Profiles</Text>
                    <Text style={styles.sectionSubtitle}>
                      Guest profiles you created. Shared viewers can open them on Profile, but only you can delete them here.
                    </Text>
                  </View>
                </View>

                {guestProfiles.length === 0 ? (
                  <View style={styles.emptyPanel}>
                    <Text style={styles.emptyTitle}>No guest profiles yet</Text>
                    <Text style={styles.emptyText}>
                      Guest profiles you create during sessions will show up here for owner-only cleanup.
                    </Text>
                  </View>
                ) : (
                  guestProfiles.map((guest) => {
                    const labels = getGuestProfileLabels(guest.display_name, guest.public_player_id)

                    return (
                      <View key={guest.id} style={styles.entryPanel}>
                        <View style={styles.entryMetaCard}>
                          <Text style={styles.entryLabel}>Guest Profile</Text>
                          <Text style={styles.entryTitle}>{labels.title}</Text>
                          {labels.subtitle ? (
                            <Text style={styles.entrySub}>{labels.subtitle}</Text>
                          ) : null}
                        </View>

                        <Pressable
                          style={({ pressed }) => [
                            styles.utilityButton,
                            styles.utilityButtonDanger,
                            pressed && styles.buttonPressed,
                            working && styles.buttonDisabled,
                          ]}
                          onPress={() => handleDeleteGuestProfile(guest.id, labels.title)}
                          disabled={working}
                        >
                          <Text style={styles.utilityButtonText}>Delete</Text>
                        </Pressable>
                      </View>
                    )
                  })
                )}
              </View>

              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconWrap}>
                    <MaterialCommunityIcons
                      name="sword-cross"
                      size={18}
                      color={theme.colors.accent}
                    />
                  </View>

                  <View style={styles.sectionHeaderCopy}>
                    <Text style={styles.sectionTitle}>Completed Games</Text>
                    <Text style={styles.sectionSubtitle}>
                      Finished games and solo runs tied to your account. Tap to open or hold for actions.
                    </Text>
                  </View>
                </View>

                {historyItems.length > 0 ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.exportCsvButton,
                      pressed && styles.buttonPressed,
                      exportingCsv && styles.exportCsvButtonBusy,
                    ]}
                    onPress={() => void handleExportHistoryCsv()}
                    disabled={exportingCsv}
                    accessibilityRole="button"
                    accessibilityLabel="Export game history as CSV"
                  >
                    <MaterialCommunityIcons
                      name="file-delimited-outline"
                      size={16}
                      color={theme.colors.accent}
                    />
                    <Text style={styles.exportCsvButtonText}>
                      {exportingCsv ? 'Exporting...' : 'Export CSV'}
                    </Text>
                  </Pressable>
                ) : null}

                {historyItems.length === 0 ? (
                  <View style={styles.emptyPanel}>
                    <Text style={styles.emptyTitle}>No finished games yet</Text>
                    <Text style={styles.emptyText}>
                      Completed multiplayer games and saved solo runs will appear here.
                    </Text>
                  </View>
                ) : (
                  historyItems.slice(0, visibleHistoryCount).map((item) => {
                    const copy = buildHistoryCardCopy(item)
                    const pressKey = `${item.kind}:${item.id}`

                    return (
                    <View key={pressKey} style={styles.entryPanel}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.entryMetaCard,
                          styles.completedGameSurface,
                          pressed && styles.buttonPressed,
                        ]}
                        onPress={() => {
                          if (longPressHistoryIdRef.current === pressKey) {
                            longPressHistoryIdRef.current = null
                            return
                          }

                          handleOpenHistoryItem(item)
                        }}
                        onLongPress={() => {
                          longPressHistoryIdRef.current = pressKey
                          setSelectedHistoryItem(item)
                        }}
                        delayLongPress={350}
                      >
                        <Text style={styles.entryLabel}>{copy.label}</Text>
                        <Text style={styles.entryTitle}>{copy.title}</Text>
                        <Text style={styles.entrySub}>{copy.subtitle}</Text>
                      </Pressable>

                      <View style={styles.utilityHint}>
                        <Text style={styles.utilityHintText}>Hold</Text>
                        <Text style={styles.utilityHintSub}>Menu</Text>
                      </View>
                    </View>
                    )
                  })
                )}

                {historyItems.length > visibleHistoryCount ? (
                  <Pressable
                    style={({ pressed }) => [
                      styles.showMoreButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => setVisibleHistoryCount((count) => count + 20)}
                    accessibilityRole="button"
                    accessibilityLabel="Show more completed games"
                  >
                    <Text style={styles.showMoreButtonText}>
                      Show more ({historyItems.length - visibleHistoryCount} remaining)
                    </Text>
                  </Pressable>
                ) : null}
              </View>

                <View style={[styles.sectionCard, styles.dangerCard]}>
                  <View style={styles.sectionHeader}>
                    <View style={[styles.sectionIconWrap, styles.dangerIconWrap]}>
                      <MaterialCommunityIcons name="alert" size={18} color="#FFD0D8" />
                    </View>

                    <View style={styles.sectionHeaderCopy}>
                      <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
                      <Text style={[styles.sectionSubtitle, styles.dangerSubtitle]}>
                        Permanent actions that remove history or the full account.
                      </Text>
                    </View>
                  </View>

                  <Pressable
                    style={({ pressed }) => [
                      styles.dangerAction,
                      pressed && styles.buttonPressed,
                      working && styles.buttonDisabled,
                    ]}
                    onPress={removeMyHistory}
                    disabled={working}
                  >
                    <View style={[styles.actionBadge, styles.actionBadgeMuted]}>
                      <MaterialCommunityIcons name="history" size={18} color="#FFC4D0" />
                    </View>

                    <View style={styles.actionCopy}>
                      <Text style={styles.actionTitle}>Remove Me From All Games</Text>
                      <Text style={styles.actionText}>
                        Completed recaps stay shared, but your player ID becomes Mx. Doe and
                        unfinished participation is removed.
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.dangerAction,
                      styles.dangerActionStrong,
                      pressed && styles.buttonPressed,
                      working && styles.buttonDisabled,
                    ]}
                    onPress={deleteMyAccount}
                    disabled={working}
                  >
                    <View style={[styles.actionBadge, styles.actionBadgeStrong]}>
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={18}
                        color="#FFE3E8"
                      />
                    </View>

                    <View style={styles.actionCopy}>
                      <Text style={styles.actionTitle}>Delete My Account & Data</Text>
                      <Text style={styles.actionText}>
                        Permanently remove your profile, sessions, and linked records.
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </ImageBackground>

      <ActionDialogModal
        visible={Boolean(selectedHistoryItem)}
        kicker={selectedHistoryItem?.kind === 'solo' ? 'Solo Game' : 'Completed Game'}
        title={
          selectedHistoryItem?.kind === 'session'
            ? selectedHistoryItem.joinCode
              ? `Game ${selectedHistoryItem.joinCode}`
              : 'Game Actions'
            : 'Solo Game Actions'
        }
        message={
          selectedHistoryItem?.kind === 'solo'
            ? 'Edit this solo result or remove it from your solo history.'
            : 'Choose an action for this finished session.'
        }
        actions={historyMenuActions}
        onRequestClose={() => setSelectedHistoryItem(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  backdrop: {
    flex: 1,
  },

  backdropImage: {
    opacity: 0.98,
  },

  backdropTint: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 30, 0.7)',
  },

  scroll: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },

  heroSection: {
    alignItems: 'center',
    marginBottom: 4,
  },

  logoCrop: {
    width: 340,
    maxWidth: '100%',
    height: 88,
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },

  logo: {
    width: 328,
    height: 136,
  },

  brandWord: {
    marginTop: -16,
    marginBottom: 8,
    color: '#F5EBFF',
    fontSize: 30,
    fontFamily: DISPLAY_FONT,
    fontWeight: '900',
    letterSpacing: 1.4,
    textAlign: 'center',
    textTransform: 'uppercase',
    textShadowColor: 'rgba(44, 19, 65, 0.95)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },

  heroSubtitle: {
    maxWidth: 330,
    color: '#F3E9FF',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(10, 15, 30, 0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  cardsStack: {
    marginTop: 18,
  },

  summaryCard: {
    backgroundColor: 'rgba(22, 17, 39, 0.92)',
    borderRadius: theme.radius.xxl,
    padding: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  summaryLabel: {
    color: theme.colors.primaryLight,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 8,
  },

  summaryBody: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },

  summaryStats: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  summaryPill: {
    flex: 1,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    paddingVertical: 12,
    alignItems: 'center',
  },

  summaryValue: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
  },

  summaryPillLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  sectionsColumn: {
    gap: 12,
  },

  sectionCard: {
    backgroundColor: 'rgba(22, 17, 39, 0.92)',
    borderRadius: theme.radius.xxl,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },

  sectionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionHeaderCopy: {
    flex: 1,
  },

  sectionTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 2,
  },

  sectionSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },

  emptyPanel: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    padding: 14,
  },

  exportCsvButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    paddingVertical: 10,
    marginBottom: 10,
  },

  exportCsvButtonBusy: {
    opacity: 0.6,
  },

  exportCsvButtonText: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '900',
  },

  showMoreButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    paddingVertical: 10,
    marginTop: 10,
  },

  showMoreButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
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
    lineHeight: 19,
    fontWeight: '700',
  },

  entryPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },

  entryMetaCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    padding: 12,
  },

  completedGameSurface: {
    justifyContent: 'center',
  },

  entryLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },

  entryTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },

  entrySub: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    marginTop: 4,
  },

  utilityButton: {
    minWidth: 86,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  utilityButtonDanger: {
    borderColor: 'rgba(255, 160, 184, 0.54)',
    backgroundColor: 'rgba(105, 45, 65, 0.38)',
  },

  utilityButtonText: {
    color: '#FFC2D2',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },

  utilityHint: {
    minWidth: 70,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },

  utilityHintText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },

  utilityHintSub: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },

  dangerCard: {
    borderColor: 'rgba(255, 160, 184, 0.5)',
    backgroundColor: 'rgba(44, 17, 31, 0.94)',
  },

  dangerIconWrap: {
    borderColor: 'rgba(255, 177, 197, 0.52)',
    backgroundColor: 'rgba(103, 43, 63, 0.62)',
  },

  dangerTitle: {
    color: '#FFD6DF',
  },

  dangerSubtitle: {
    color: '#F6B0C0',
  },

  dangerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 160, 184, 0.42)',
    backgroundColor: 'rgba(92, 36, 57, 0.44)',
    padding: 12,
    marginTop: 10,
  },

  dangerActionStrong: {
    backgroundColor: 'rgba(125, 42, 68, 0.64)',
    borderColor: 'rgba(255, 185, 202, 0.6)',
  },

  actionBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionBadgeMuted: {
    borderColor: 'rgba(255, 180, 198, 0.45)',
    backgroundColor: 'rgba(120, 47, 72, 0.4)',
  },

  actionBadgeStrong: {
    borderColor: 'rgba(255, 214, 222, 0.62)',
    backgroundColor: 'rgba(153, 55, 84, 0.52)',
  },

  actionCopy: {
    flex: 1,
  },

  actionTitle: {
    color: '#FFD6DF',
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 3,
  },

  actionText: {
    color: '#F4B6C5',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },

  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },

  buttonDisabled: {
    opacity: 0.58,
  },
})
