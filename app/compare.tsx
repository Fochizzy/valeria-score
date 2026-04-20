import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useLocalSearchParams, useNavigation, router } from 'expo-router'
import { supabase } from '../lib/supabase'
import { subscribeToPlayerScores } from '../lib/realtime'
import { finalizeGameStats } from '../lib/finalizeGameStats'
import { theme } from '../constants/theme'
import { cards } from '../data/cards'
import { cardImages } from '../data/cardImages'

type ScoreRow = {
  id: string
  session_id: string
  user_id: string | null
  owner_user_id: string | null
  guest_name: string | null
  is_guest: boolean
  total_score: number
  game_locked: boolean
  duke_slug: string | null
  placement: number | null
  is_winner: boolean | null
}

type ProfileRow = {
  id: string
  display_name: string | null
  public_player_id: string | null
}

type CompareEntry = {
  id: string
  scoreId: string
  label: string
  playerId: string | null
  totalScore: number
  locked: boolean
  isGuest: boolean
  userId: string | null
  dukeSlug: string | null
  dukeName: string
  placement: number | null
  isWinner: boolean
}

function formatDukeName(slug: string | null | undefined) {
  if (!slug) return 'No Duke'
  const card = cards.find((item) => item.slug === slug)
  if (card?.name) return card.name

  return slug
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function CompareScreen() {
  const { sessionId, joinCode } = useLocalSearchParams<{
    sessionId: string
    joinCode?: string
  }>()

  const navigation = useNavigation()
  const didLoadOnceRef = useRef(false)

  const [scores, setScores] = useState<CompareEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [livePulse, setLivePulse] = useState(false)

  const canShare = scores.length > 0 && !sharing
  const canFinish = scores.length > 0 && !finishing

  const safeJoinCode = useMemo(() => {
    return typeof joinCode === 'string' ? joinCode : '------'
  }, [joinCode])

  const fetchScores = useCallback(
    async (showLoading = false) => {
      if (!sessionId) return

      try {
        if (showLoading) setLoading(true)

        const { data: scoreData, error: scoreError } = await supabase
          .from('player_scores')
          .select(
            'id, session_id, user_id, owner_user_id, guest_name, is_guest, total_score, game_locked, duke_slug, placement, is_winner'
          )
          .eq('session_id', sessionId)

        if (scoreError) throw scoreError

        const safeScores = (scoreData ?? []) as ScoreRow[]

        const userIds = [
          ...new Set(
            safeScores
              .map((row) => row.user_id)
              .filter((value): value is string => Boolean(value))
          ),
        ]

        let profileMap = new Map<string, ProfileRow>()

        if (userIds.length > 0) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('id, display_name, public_player_id')
            .in('id', userIds)

          if (profileError) throw profileError

          profileMap = new Map(
            ((profileData ?? []) as ProfileRow[]).map((row) => [row.id, row])
          )
        }

        const mapped: CompareEntry[] = safeScores
          .map((row) => {
            const profile = row.user_id ? profileMap.get(row.user_id) : undefined
            const label = row.is_guest
              ? row.guest_name || 'Guest Player'
              : profile?.display_name || profile?.public_player_id || 'Player'

            return {
              id: row.id,
              scoreId: row.id,
              label,
              playerId: row.is_guest ? null : profile?.public_player_id || null,
              totalScore: Number(row.total_score || 0),
              locked: Boolean(row.game_locked),
              isGuest: Boolean(row.is_guest),
              userId: row.user_id,
              dukeSlug: row.duke_slug ?? null,
              dukeName: formatDukeName(row.duke_slug),
              placement: row.placement ?? null,
              isWinner: Boolean(row.is_winner),
            }
          })
          .sort((a, b) => {
            if ((a.placement ?? 9999) !== (b.placement ?? 9999)) {
              return (a.placement ?? 9999) - (b.placement ?? 9999)
            }
            return b.totalScore - a.totalScore
          })

        setScores(mapped)
        didLoadOnceRef.current = true
      } catch (err: any) {
        Alert.alert('Load failed', err?.message ?? 'Unknown error')
      } finally {
        if (showLoading) setLoading(false)
      }
    },
    [sessionId]
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

  const goToManageData = useCallback(() => {
    router.push('/manage-data')
  }, [])

  const addGuest = useCallback(() => {
    router.push({
      pathname: '/guest-player',
      params: {
        sessionId,
        joinCode: safeJoinCode,
      },
    })
  }, [safeJoinCode, sessionId])

  const handleLogout = useCallback(async () => {
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
  }, [])

  const deleteSession = useCallback(async () => {
    if (!sessionId) return

    try {
      setDeleting(true)

      const { error: scoresError } = await supabase
        .from('player_scores')
        .delete()
        .eq('session_id', sessionId)

      if (scoresError) throw scoresError

      const { error: playersError } = await supabase
        .from('session_players')
        .delete()
        .eq('session_id', sessionId)

      if (playersError) throw playersError

      const { error: sessionError } = await supabase
        .from('game_sessions')
        .delete()
        .eq('id', sessionId)

      if (sessionError) throw sessionError

      router.replace('/create-session')
    } catch (err: any) {
      Alert.alert('Delete failed', err?.message ?? 'Unknown error')
    } finally {
      setDeleting(false)
    }
  }, [sessionId])

  const handleFinishGame = useCallback(async () => {
    if (!sessionId) return

    if (scores.length === 0) {
      Alert.alert('No scores yet', 'Add at least one score before finishing the game.')
      return
    }

    Alert.alert(
      'Finish game?',
      'This will lock all saved scores, rank players, mark the winner, and write stats.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finish Game',
          style: 'destructive',
          onPress: async () => {
            try {
              setFinishing(true)

              const { error: lockError } = await supabase
                .from('player_scores')
                .update({
                  game_locked: true,
                  updated_at: new Date().toISOString(),
                })
                .eq('session_id', sessionId)

              if (lockError) throw lockError

              await finalizeGameStats(sessionId)
              await fetchScores(false)

              Alert.alert(
                'Game finished',
                'Scores were locked, ranked, and stats were finalized.'
              )
            } catch (err: any) {
              Alert.alert('Finish failed', err?.message ?? 'Unknown error')
            } finally {
              setFinishing(false)
            }
          },
        },
      ]
    )
  }, [fetchScores, scores.length, sessionId])

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() =>
            Alert.alert('Menu', '', [
              { text: 'Add Guest', onPress: addGuest },
              { text: 'Player Stats', onPress: goToPlayerStats },
              { text: 'Duke Stats', onPress: goToDukeStats },
              { text: 'Manage Data', onPress: goToManageData },
              { text: 'New Session', onPress: handleCreateSession },
              { text: 'Logout', onPress: handleLogout },
              {
                text: 'Delete Session',
                style: 'destructive',
                onPress: deleteSession,
              },
              { text: 'Cancel', style: 'cancel' },
            ])
          }
          style={styles.headerMenuButton}
        >
          <Text style={styles.headerMenuText}>⋯</Text>
        </TouchableOpacity>
      ),
    })
  }, [
    navigation,
    addGuest,
    goToPlayerStats,
    goToDukeStats,
    goToManageData,
    handleCreateSession,
    handleLogout,
    deleteSession,
  ])

  useEffect(() => {
    fetchScores(true)

    if (!sessionId) return

    const unsubscribe = subscribeToPlayerScores(sessionId, () => {
      setLivePulse(true)
      fetchScores(false)
      setTimeout(() => setLivePulse(false), 900)
    })

    return unsubscribe
  }, [fetchScores, sessionId])

  const shareResults = async () => {
    try {
      setSharing(true)

      const lines = scores.map((entry, index) => {
        const crown = entry.isWinner || index === 0 ? '👑 ' : ''
        const idText = entry.playerId ? ` (${entry.playerId})` : ''
        const rankText = entry.placement ? `${entry.placement}. ` : `${index + 1}. `
        return `${rankText}${crown}${entry.label}${idText} — ${entry.totalScore} · ${entry.dukeName}`
      })

      const message = ['Valeria Results', '', ...lines].join('\n')

      await Share.share({
        title: 'Valeria Results',
        message,
      })
    } catch (err: any) {
      Alert.alert('Share failed', err?.message ?? 'Unknown error')
    } finally {
      setSharing(false)
    }
  }

  const leader = scores[0] ?? null

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.heroCard, livePulse && styles.heroCardLive]}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroKicker}>Live Session</Text>
            <Text style={styles.heroTitle}>Compare Scores</Text>
            <Text style={styles.heroSubtitle}>Scores update live as players save.</Text>
          </View>

          <View style={styles.joinCodeCard}>
            <Text style={styles.joinCodeLabel}>Code</Text>
            <Text style={styles.joinCodeValue}>{safeJoinCode}</Text>
          </View>
        </View>

        <View style={styles.heroBottomRow}>
          <View style={styles.liveChip}>
            <Text style={styles.liveChipText}>{livePulse ? 'Live Update' : 'Realtime'}</Text>
          </View>

          <View style={styles.heroActions}>
            <Pressable
              style={({ pressed }) => [
                styles.secondaryHeroButton,
                pressed && styles.buttonPressed,
                !canShare && styles.ghostedButton,
              ]}
              onPress={shareResults}
              disabled={!canShare}
            >
              <Text style={[styles.secondaryHeroButtonText, !canShare && styles.ghostedButtonText]}>
                {sharing ? 'Sharing...' : 'Share'}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.finishButton,
                pressed && styles.buttonPressed,
                !canFinish && styles.ghostedButton,
              ]}
              onPress={handleFinishGame}
              disabled={!canFinish}
            >
              <Text style={[styles.finishButtonText, !canFinish && styles.ghostedButtonText]}>
                {finishing ? 'Finishing...' : 'Finish Game'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {leader ? (
        <View style={styles.leaderCard}>
          <Text style={styles.leaderKicker}>
            {leader.isWinner || leader.placement === 1 ? 'Winner' : 'Current Leader'}
          </Text>
          <View style={styles.leaderRow}>
            <View style={styles.leaderThumbWrap}>
              {leader.dukeSlug && cardImages[leader.dukeSlug] ? (
                <Image
                  source={cardImages[leader.dukeSlug]}
                  style={styles.leaderThumb}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.leaderThumbFallback}>
                  <Text style={styles.leaderThumbFallbackText}>No Duke</Text>
                </View>
              )}
            </View>

            <View style={styles.leaderMetaWrap}>
              <Text style={styles.leaderName}>👑 {leader.label}</Text>
              <Text style={styles.leaderMeta}>
                {leader.playerId ? `ID: ${leader.playerId}` : 'ID: —'}
              </Text>
              <Text style={styles.leaderDuke}>{leader.dukeName}</Text>
            </View>

            <View style={styles.leaderScoreWrap}>
              <View
                style={[
                  styles.statusDot,
                  leader.locked ? styles.statusDotLocked : styles.statusDotOpen,
                ]}
              />
              <Text style={styles.leaderScore}>{leader.totalScore}</Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Standings</Text>
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{scores.length}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Loading scores...</Text>
            <Text style={styles.emptyText}>Pulling the latest results for this session.</Text>
          </View>
        ) : scores.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No scores yet</Text>
            <Text style={styles.emptyText}>
              Add your own score or a guest player to begin the standings.
            </Text>
          </View>
        ) : (
          scores.map((entry, index) => (
            <View
              key={entry.id}
              style={[
                styles.scoreRow,
                (entry.isWinner || index === 0) && styles.scoreRowWinner,
              ]}
            >
              <View style={styles.rankWrap}>
                {entry.isWinner || index === 0 ? <Text style={styles.tinyCrown}>👑</Text> : null}
                <View
                  style={[
                    styles.rankBubble,
                    (entry.isWinner || index === 0) && styles.rankBubbleWinner,
                  ]}
                >
                  <Text style={styles.rankBubbleText}>
                    {entry.placement ?? index + 1}
                  </Text>
                </View>
              </View>

              <View style={styles.thumbWrap}>
                {entry.dukeSlug && cardImages[entry.dukeSlug] ? (
                  <Image
                    source={cardImages[entry.dukeSlug]}
                    style={styles.thumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.thumbFallback}>
                    <Text style={styles.thumbFallbackText}>No Duke</Text>
                  </View>
                )}
              </View>

              <View style={styles.scoreMeta}>
                <Text style={styles.scoreName}>
                  {entry.label}
                  {entry.isGuest ? ' (Guest)' : ''}
                </Text>

                <Text style={styles.scoreDuke}>{entry.dukeName}</Text>

                <View style={styles.scoreStatusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      entry.locked ? styles.statusDotLocked : styles.statusDotOpen,
                    ]}
                  />
                  <Text style={styles.scoreSubtext}>
                    {entry.playerId ? `ID: ${entry.playerId}` : 'ID: —'} ·{' '}
                    {entry.locked ? 'Locked' : 'Open'}
                  </Text>
                </View>
              </View>

              <Text style={styles.scoreValue}>{entry.totalScore}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.actionsCard}>
        <Text style={styles.sectionTitle}>Session Actions</Text>

        <View style={styles.actionsGrid}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryGridButton,
              pressed && styles.buttonPressed,
              sharing && styles.buttonDisabled,
            ]}
            onPress={shareResults}
            disabled={sharing}
          >
            <Text style={styles.primaryGridButtonText}>
              {sharing ? 'Sharing...' : 'Share Results'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.gridButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={addGuest}
          >
            <Text style={styles.gridButtonText}>Add Guest</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.finishGridButton,
              pressed && styles.buttonPressed,
              !canFinish && styles.buttonDisabled,
            ]}
            onPress={handleFinishGame}
            disabled={!canFinish}
          >
            <Text style={styles.finishGridButtonText}>
              {finishing ? 'Finishing...' : 'Finish Game'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.gridButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={goToPlayerStats}
          >
            <Text style={styles.gridButtonText}>Player Stats</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.gridButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={goToDukeStats}
          >
            <Text style={styles.gridButtonText}>Duke Stats</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.gridButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={goToManageData}
          >
            <Text style={styles.gridButtonText}>Manage Data</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.gridButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleCreateSession}
          >
            <Text style={styles.gridButtonText}>New Session</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.buttonPressed,
              loggingOut && styles.buttonDisabled,
            ]}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            <Text style={styles.logoutButtonText}>
              {loggingOut ? 'Logging Out...' : 'Logout'}
            </Text>
          </Pressable>
        </View>
      </View>

      {deleting ? (
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Deleting session...</Text>
          <Text style={styles.statusText}>
            Removing scores, players, and session record.
          </Text>
        </View>
      ) : null}
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

  headerMenuButton: {
    paddingRight: 12,
  },

  headerMenuText: {
    fontSize: 22,
    color: theme.colors.text,
    fontWeight: '900',
  },

  heroCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.border,
    padding: 14,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  heroCardLive: {
    ...theme.shadow.glowStrong,
  },

  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },

  heroTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  heroKicker: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },

  heroTitle: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 6,
  },

  heroSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },

  joinCodeCard: {
    minWidth: 96,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  joinCodeLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 2,
  },

  joinCodeValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },

  heroBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },

  heroActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },

  liveChip: {
    backgroundColor: 'rgba(220, 203, 255, 0.12)',
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },

  liveChipText: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: '900',
  },

  secondaryHeroButton: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  secondaryHeroButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  finishButton: {
    backgroundColor: theme.colors.accent,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...theme.shadow.glow,
  },

  finishButtonText: {
    color: theme.colors.background,
    fontSize: 13,
    fontWeight: '900',
  },

  leaderCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E7C768',
    padding: 14,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  leaderKicker: {
    color: '#E7C768',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  leaderThumbWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundAlt,
    borderWidth: 1,
    borderColor: '#E7C768',
    marginRight: 10,
  },

  leaderThumb: {
    width: '100%',
    height: '100%',
  },

  leaderThumbFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },

  leaderThumbFallbackText: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },

  leaderMetaWrap: {
    flex: 1,
    minWidth: 0,
  },

  leaderName: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 2,
  },

  leaderMeta: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },

  leaderDuke: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '800',
  },

  leaderScoreWrap: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },

  leaderScore: {
    color: theme.colors.text,
    fontSize: 32,
    fontWeight: '900',
    marginTop: 4,
  },

  sectionCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  actionsCard: {
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  sectionTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 10,
  },

  sectionBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: 'rgba(220, 203, 255, 0.12)',
    borderWidth: 1,
    borderColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  sectionBadgeText: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '900',
  },

  emptyState: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
  },

  emptyTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },

  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
  },

  scoreRowWinner: {
    borderColor: '#E7C768',
    ...theme.shadow.card,
  },

  rankWrap: {
    width: 34,
    alignItems: 'center',
    marginRight: 10,
  },

  tinyCrown: {
    fontSize: 12,
    marginBottom: 2,
  },

  rankBubble: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: theme.colors.backgroundAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rankBubbleWinner: {
    backgroundColor: 'rgba(231, 199, 104, 0.16)',
    borderColor: '#E7C768',
  },

  rankBubbleText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '900',
  },

  thumbWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 10,
  },

  thumb: {
    width: '100%',
    height: '100%',
  },

  thumbFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },

  thumbFallbackText: {
    color: theme.colors.textMuted,
    fontSize: 8,
    fontWeight: '800',
    textAlign: 'center',
  },

  scoreMeta: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },

  scoreName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 2,
  },

  scoreDuke: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },

  scoreStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  scoreSubtext: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginRight: 6,
  },

  statusDotLocked: {
    backgroundColor: theme.colors.success,
  },

  statusDotOpen: {
    backgroundColor: theme.colors.error,
  },

  scoreValue: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
  },

  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },

  primaryGridButton: {
    width: '48%',
    backgroundColor: theme.colors.accent,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    ...theme.shadow.glow,
  },

  primaryGridButtonText: {
    color: theme.colors.background,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },

  finishGridButton: {
    width: '48%',
    backgroundColor: 'rgba(231, 199, 104, 0.14)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E7C768',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },

  finishGridButtonText: {
    color: '#E7C768',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },

  gridButton: {
    width: '48%',
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },

  gridButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },

  logoutButton: {
    width: '48%',
    backgroundColor: 'rgba(240, 138, 126, 0.12)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.error,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },

  logoutButtonText: {
    color: theme.colors.error,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },

  statusCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.error,
    padding: 14,
    marginBottom: 8,
  },

  statusTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },

  statusText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },

  ghostedButton: {
    opacity: 0.38,
  },

  ghostedButtonText: {
    opacity: 0.75,
  },

  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },

  buttonDisabled: {
    opacity: 0.5,
  },
})