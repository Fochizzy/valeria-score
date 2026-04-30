import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import VictoryFireworks from '../components/VictoryFireworks'
import ValeriaHeader from '../components/ValeriaHeader'
import { theme } from '../constants/theme'
import { Alert } from '../lib/themed-alert'
import { cardImages } from '../data/cardImages'
import {
  buildCompareEntries,
  type CompareEntry,
  type CompareGuestProfileRow,
  type CompareProfileRow,
  type CompareScoreRow,
} from '../lib/compare-entries'
import { copyJoinCodeWithFeedback } from '../lib/copy-join-code-client'
import { getBottomNavClearance } from '../lib/bottom-nav-layout'
import { supabase } from '../lib/supabase'
import {
  buildResultsShareMessage,
  resolveVictoryWinner,
} from '../lib/victory-results'

const compareBackdrop = require('../assets/compare.png')

const FULL_SCORE_SELECT =
  'id, session_id, owner_user_id, player_name, guest_profile_id, guest_entry_id, recap_player_name, recap_player_id, duke_slug, score_total, game_locked, placement, is_winner'

const LEGACY_SCORE_SELECT =
  'id, session_id, owner_user_id, player_name, guest_profile_id, guest_entry_id, duke_slug, score_total, game_locked'

async function loadSessionScoreRows(sessionId: string) {
  const { data, error } = await supabase
    .from('session_scores')
    .select(FULL_SCORE_SELECT)
    .eq('session_id', sessionId)

  if (!error) {
    return {
      rows: (data ?? []) as CompareScoreRow[],
      notice: '',
    }
  }

  const missingRankingColumn =
    error.message?.includes('session_scores.placement') ||
    error.message?.includes('session_scores.is_winner') ||
    error.message?.includes('session_scores.recap_player_name') ||
    error.message?.includes('session_scores.recap_player_id') ||
    error.message?.includes('column placement does not exist') ||
    error.message?.includes('column is_winner does not exist') ||
    error.message?.includes('column recap_player_name does not exist') ||
    error.message?.includes('column recap_player_id does not exist')

  if (!missingRankingColumn) throw error

  const { data: legacyData, error: legacyError } = await supabase
    .from('session_scores')
    .select(LEGACY_SCORE_SELECT)
    .eq('session_id', sessionId)

  if (legacyError) throw legacyError

  const legacyRows = ((legacyData ?? []) as Omit<
    CompareScoreRow,
    'placement' | 'is_winner'
  >[]).map((row) => ({
    ...row,
    placement: null,
    is_winner: null,
  }))

  return {
    rows: legacyRows,
    notice:
      'Live totals only — final placements unlock once everyone saves.',
  }
}

export default function VictoryScreen() {
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{
    sessionId?: string
    joinCode?: string
  }>()
  const sessionId = typeof params.sessionId === 'string' ? params.sessionId : ''
  const joinCode = typeof params.joinCode === 'string' ? params.joinCode : ''

  const [scores, setScores] = useState<CompareEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [loadNotice, setLoadNotice] = useState('')
  const [sharing, setSharing] = useState(false)

  const finalScores = useMemo(
    () => scores.filter((entry) => entry.hasScore),
    [scores]
  )
  const winner = useMemo(() => resolveVictoryWinner(finalScores), [finalScores])

  const loadVictoryScores = useCallback(async () => {
    if (!sessionId) {
      setScores([])
      setLoadNotice('')
      setLoadError('Open a finished session before viewing the Victory page.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setLoadError('')

      const scoreResponse = await loadSessionScoreRows(sessionId)
      const ownerIds = [
        ...new Set(
          scoreResponse.rows
            .map((row) => row.owner_user_id)
            .filter((value): value is string => Boolean(value))
        ),
      ]
      const guestProfileIds = [
        ...new Set(
          scoreResponse.rows
            .map((row) => row.guest_profile_id)
            .filter((value): value is string => Boolean(value))
        ),
      ]

      let profiles: CompareProfileRow[] = []
      let guestProfiles: CompareGuestProfileRow[] = []

      if (ownerIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, display_name, public_player_id')
          .in('id', ownerIds)

        if (profileError) throw profileError

        profiles = (profileData ?? []) as CompareProfileRow[]
      }

      if (guestProfileIds.length > 0) {
        const { data: guestProfileData, error: guestProfileError } = await supabase
          .from('guest_profiles')
          .select('id, display_name, public_player_id')
          .in('id', guestProfileIds)

        if (guestProfileError) throw guestProfileError

        guestProfiles = (guestProfileData ?? []) as CompareGuestProfileRow[]
      }

      const entries = buildCompareEntries({
        scoreRows: scoreResponse.rows,
        sessionPlayers: [],
        profiles,
        guestProfiles,
      }).filter((entry) => entry.hasScore)

      setScores(entries)
      setLoadNotice(scoreResponse.notice)
    } catch (error: any) {
      console.error(error)
      setLoadNotice('')
      setLoadError(
        error?.message ?? 'Unable to load final standings right now.'
      )
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    void loadVictoryScores()
  }, [loadVictoryScores])

  async function handleShareResults() {
    try {
      setSharing(true)
      await Share.share({
        title: 'Valeria Results',
        message: buildResultsShareMessage(finalScores),
      })
    } catch (error: any) {
      Alert.alert('Share failed', error?.message ?? 'Unknown error')
    } finally {
      setSharing(false)
    }
  }

  const handleCopyJoinCode = useCallback(async () => {
    await copyJoinCodeWithFeedback(joinCode)
  }, [joinCode])

  return (
    <ImageBackground
      source={compareBackdrop}
      style={styles.pageBackground}
      imageStyle={styles.pageBackgroundImage}
      resizeMode="cover"
    >
      <View style={styles.pageScrim}>
        <VictoryFireworks />

        <ScrollView
          style={styles.screen}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: getBottomNavClearance(insets.bottom) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <ValeriaHeader
            compact
            showBack
            title="Victory"
            subtitle="Final standings"
          />

          {joinCode ? (
            <Pressable
              style={({ pressed }) => [
                styles.joinCodePill,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleCopyJoinCode}
            >
              <Text style={styles.joinCodeLabel}>Join Code</Text>
              <Text style={styles.joinCodeValue}>{joinCode}</Text>
            </Pressable>
          ) : null}

          {loading ? (
            <View style={styles.statusCard}>
              <ActivityIndicator color={theme.colors.accent} />
              <Text style={styles.statusTitle}>Loading final standings...</Text>
              <Text style={styles.statusText}>
                Pulling the locked winner and final leaderboard.
              </Text>
            </View>
          ) : null}

          {!loading && loadError ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Unable to load Victory page</Text>
              <Text style={styles.errorText}>{loadError}</Text>

              <View style={styles.inlineButtons}>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => {
                    void loadVictoryScores()
                  }}
                >
                  <Text style={styles.secondaryButtonText}>Retry</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => router.replace('/create-session')}
                >
                  <Text style={styles.primaryButtonText}>Home Page</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {!loading && !loadError && loadNotice ? (
            <View style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>Final totals</Text>
              <Text style={styles.noticeText}>{loadNotice}</Text>
            </View>
          ) : null}

          {!loading && !loadError && winner ? (
            <View style={styles.winnerCard}>
              <Text style={styles.winnerKicker}>Winner</Text>

              <View style={styles.winnerTopRow}>
                <View style={styles.winnerCopy}>
                  <Text style={styles.winnerName}>
                    {winner.label}
                    {winner.isGuest ? ' (Guest)' : ''}
                  </Text>
                  <Text style={styles.winnerMeta}>
                    {winner.playerId ? `${winner.playerId} - ` : ''}
                    {winner.dukeName}
                  </Text>
                  <Text style={styles.winnerSupport}>Top score at this table</Text>
                </View>

                <View style={styles.scorePill}>
                  <Text style={styles.scorePillValue}>{winner.totalScore}</Text>
                  <Text style={styles.scorePillLabel}>PTS</Text>
                </View>
              </View>

              <View style={styles.winnerBottomRow}>
                <View style={styles.winnerImageWrap}>
                  {winner.dukeSlug && cardImages[winner.dukeSlug] ? (
                    <Image
                      source={cardImages[winner.dukeSlug]}
                      style={styles.winnerImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.winnerImageFallback}>
                      <Text style={styles.winnerImageFallbackText}>No Duke</Text>
                    </View>
                  )}
                </View>

                <View style={styles.winnerBadge}>
                  <Text style={styles.winnerBadgeText}>Final Rank #{winner.placement ?? 1}</Text>
                </View>
              </View>
            </View>
          ) : null}

          {!loading && !loadError ? (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Final Leaderboard</Text>

              {finalScores.length === 0 ? (
                <Text style={styles.emptyText}>No final scores were available for this session.</Text>
              ) : (
                finalScores.map((entry, index) => (
                  <View key={entry.id} style={styles.scoreRow}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankBadgeText}>
                        {entry.placement ?? index + 1}
                      </Text>
                    </View>

                    <View style={styles.rowThumbWrap}>
                      {entry.dukeSlug && cardImages[entry.dukeSlug] ? (
                        <Image
                          source={cardImages[entry.dukeSlug]}
                          style={styles.rowThumb}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.rowThumbFallback}>
                          <Text style={styles.rowThumbFallbackText}>No Duke</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.rowMeta}>
                      <Text style={styles.rowName}>
                        {entry.label}
                        {entry.isGuest ? ' (Guest)' : ''}
                      </Text>
                      <Text style={styles.rowSub}>
                        {entry.playerId ? `ID: ${entry.playerId} - ` : ''}
                        {entry.dukeName}
                      </Text>
                    </View>

                    <Text style={styles.rowScore}>{entry.totalScore}</Text>
                  </View>
                ))
              )}
            </View>
          ) : null}

          {!loading && !loadError ? (
            <View style={styles.inlineButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.buttonPressed,
                  sharing && styles.buttonDisabled,
                ]}
                onPress={handleShareResults}
                disabled={sharing}
              >
                <Text style={styles.secondaryButtonText}>
                  {sharing ? 'Sharing...' : 'Share Results'}
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => router.replace('/create-session')}
              >
                <Text style={styles.primaryButtonText}>Home Page</Text>
              </Pressable>
            </View>
          ) : null}
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
    backgroundColor: 'rgba(8, 12, 24, 0.72)',
  },

  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  content: {
    padding: 10,
    paddingTop: 4,
  },

  joinCodePill: {
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(244, 200, 92, 0.5)',
    backgroundColor: 'rgba(31, 22, 52, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 12,
  },

  joinCodeLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },

  joinCodeValue: {
    color: theme.colors.gold,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },

  statusCard: {
    backgroundColor: 'rgba(31, 22, 52, 0.92)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
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
    lineHeight: 19,
    fontWeight: '700',
    textAlign: 'center',
  },

  errorCard: {
    backgroundColor: 'rgba(255, 126, 138, 0.12)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.error,
    padding: 16,
    marginBottom: 12,
  },

  errorTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },

  errorText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },

  noticeCard: {
    backgroundColor: 'rgba(244, 200, 92, 0.12)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(244, 200, 92, 0.45)',
    padding: 14,
    marginBottom: 12,
  },

  noticeTitle: {
    color: theme.colors.gold,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },

  noticeText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

  winnerCard: {
    backgroundColor: 'rgba(41, 29, 65, 0.94)',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(244, 200, 92, 0.58)',
    padding: 16,
    marginBottom: 12,
    ...theme.shadow.glow,
  },

  winnerKicker: {
    color: theme.colors.gold,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 8,
  },

  winnerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },

  winnerCopy: {
    flex: 1,
    minWidth: 0,
  },

  winnerName: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 4,
  },

  winnerMeta: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },

  winnerSupport: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '800',
  },

  scorePill: {
    minWidth: 90,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(244, 200, 92, 0.45)',
    backgroundColor: 'rgba(18, 24, 43, 0.84)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scorePillValue: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '900',
  },

  scorePillLabel: {
    color: theme.colors.gold,
    fontSize: 10,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 0.9,
  },

  winnerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  winnerImageWrap: {
    width: 96,
    height: 96,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundAlt,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },

  winnerImage: {
    width: '100%',
    height: '100%',
  },

  winnerImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  winnerImageFallbackText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },

  winnerBadge: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(112, 215, 165, 0.45)',
    backgroundColor: 'rgba(112, 215, 165, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  winnerBadgeText: {
    color: theme.colors.success,
    fontSize: 14,
    fontWeight: '900',
  },

  sectionCard: {
    backgroundColor: 'rgba(25, 18, 43, 0.9)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },

  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },

  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'rgba(31, 22, 52, 0.92)',
    padding: 10,
    marginBottom: 10,
  },

  rankBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  rankBadgeText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  rowThumbWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundAlt,
    marginRight: 10,
  },

  rowThumb: {
    width: '100%',
    height: '100%',
  },

  rowThumbFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },

  rowThumbFallbackText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },

  rowMeta: {
    flex: 1,
    minWidth: 0,
  },

  rowName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 2,
  },

  rowSub: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },

  rowScore: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
    marginLeft: 10,
  },

  inlineButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },

  primaryButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.glow,
  },

  primaryButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },

  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(31, 22, 52, 0.92)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.border,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },

  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },

  buttonDisabled: {
    opacity: 0.55,
  },
})
