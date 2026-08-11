import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'

import ValeriaHeader from '../components/ValeriaHeader'
import { theme } from '../constants/theme'
import { cardImages } from '../data/cardImages'
import {
  buildCompletedGameRecap,
  type CompletedGameRecapPlayer,
  type CompletedGameRecapScoreRow,
} from '../lib/completed-game-recap'
import { supabase } from '../lib/supabase'

const compareBackdrop = require('../assets/compare.png')

type RecapIdentityProfile = {
  id: string
  display_name: string | null
  public_player_id: string | null
}

const FULL_SCORE_SELECT =
  'id, owner_user_id, player_name, guest_profile_id, guest_entry_id, recap_player_name, recap_player_id, duke_slug, score_total, game_locked, placement, is_winner, inputs'

const LEGACY_SCORE_SELECT =
  'id, owner_user_id, player_name, guest_profile_id, guest_entry_id, duke_slug, score_total, game_locked, inputs'

function isMissingRecapColumnError(error: { message?: string | null }) {
  const message = error.message ?? ''

  return (
    message.includes('session_scores.placement') ||
    message.includes('session_scores.is_winner') ||
    message.includes('session_scores.recap_player_name') ||
    message.includes('session_scores.recap_player_id') ||
    message.includes('column placement does not exist') ||
    message.includes('column is_winner does not exist') ||
    message.includes('column recap_player_name does not exist') ||
    message.includes('column recap_player_id does not exist')
  )
}

async function loadRecapScoreRows(sessionId: string) {
  const { data, error } = await supabase
    .from('session_scores')
    .select(FULL_SCORE_SELECT)
    .eq('session_id', sessionId)
    .eq('game_locked', true)

  if (!error) {
    return (data ?? []) as CompletedGameRecapScoreRow[]
  }

  if (!isMissingRecapColumnError(error)) throw error

  const { data: legacyData, error: legacyError } = await supabase
    .from('session_scores')
    .select(LEGACY_SCORE_SELECT)
    .eq('session_id', sessionId)
    .eq('game_locked', true)

  if (legacyError) throw legacyError

  return ((legacyData ?? []) as Omit<
    CompletedGameRecapScoreRow,
    'placement' | 'is_winner' | 'recap_player_name' | 'recap_player_id'
  >[]).map((row) => ({
    ...row,
    placement: null,
    is_winner: null,
    recap_player_name: null,
    recap_player_id: null,
  }))
}

export default function GameRecapScreen() {
  const params = useLocalSearchParams<{
    sessionId?: string
  }>()
  const sessionId = typeof params.sessionId === 'string' ? params.sessionId : ''

  const [players, setPlayers] = useState<CompletedGameRecapPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const winner = useMemo(
    () => players.find((player) => player.isWinner) ?? players[0] ?? null,
    [players]
  )

  const loadRecap = useCallback(async () => {
    if (!sessionId) {
      setPlayers([])
      setLoadError('Open a completed game before viewing the recap.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setLoadError('')

      const scoreRows = await loadRecapScoreRows(sessionId)
      const ownerIds = [
        ...new Set(
          scoreRows
            .map((row) => row.owner_user_id)
            .filter((value): value is string => Boolean(value))
        ),
      ]
      const guestProfileIds = [
        ...new Set(
          scoreRows
            .map((row) => row.guest_profile_id)
            .filter((value): value is string => Boolean(value))
        ),
      ]

      let profiles: RecapIdentityProfile[] = []
      let guestProfiles: RecapIdentityProfile[] = []

      if (ownerIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, display_name, public_player_id')
          .in('id', ownerIds)

        if (profileError) throw profileError
        profiles = (profileData ?? []) as RecapIdentityProfile[]
      }

      if (guestProfileIds.length > 0) {
        const { data: guestProfileData, error: guestProfileError } = await supabase
          .from('guest_profiles')
          .select('id, display_name, public_player_id')
          .in('id', guestProfileIds)

        if (guestProfileError) throw guestProfileError
        guestProfiles = (guestProfileData ?? []) as RecapIdentityProfile[]
      }

      setPlayers(
        buildCompletedGameRecap({
          scoreRows,
          profiles,
          guestProfiles,
        })
      )
    } catch (error: any) {
      console.error(error)
      setLoadError(error?.message ?? 'Unable to load the finished recap right now.')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    void loadRecap()
  }, [loadRecap])

  return (
    <ImageBackground
      source={compareBackdrop}
      style={styles.pageBackground}
      imageStyle={styles.pageBackgroundImage}
      resizeMode="cover"
    >
      <View style={styles.pageScrim}>
        <ScrollView
          style={styles.screen}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <ValeriaHeader compact showBack title="Game Recap" subtitle="Final scoring breakdown" />

          {loading ? (
            <View style={styles.statusCard}>
              <ActivityIndicator color={theme.colors.accent} />
              <Text style={styles.statusTitle}>Loading recap...</Text>
              <Text style={styles.statusText}>
                Pulling every locked player card and final score.
              </Text>
            </View>
          ) : null}

          {!loading && loadError ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Unable to load recap</Text>
              <Text style={styles.errorText}>{loadError}</Text>

              <Pressable
                style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}
                onPress={() => {
                  void loadRecap()
                }}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          {!loading && !loadError && winner ? (
            <View style={styles.heroCard}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroCopy}>
                  <Text style={styles.heroKicker}>Table Winner</Text>
                  <Text style={styles.heroTitle}>
                    {winner.label}
                    {winner.isGuest ? ' (Guest)' : ''}
                  </Text>
                  <Text style={styles.heroSub}>
                    {winner.playerId ? `ID: ${winner.playerId} - ` : ''}
                    {winner.dukeName}
                  </Text>
                </View>

                <View style={styles.heroScorePill}>
                  <Text style={styles.heroScoreValue}>{winner.totalScore}</Text>
                  <Text style={styles.heroScoreLabel}>FINAL</Text>
                </View>
              </View>

              <View style={styles.heroBottomRow}>
                <View style={styles.heroImageWrap}>
                  {winner.dukeSlug && cardImages[winner.dukeSlug] ? (
                    <Image
                      source={cardImages[winner.dukeSlug]}
                      style={styles.heroImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.heroImageFallback}>
                      <Text style={styles.heroImageFallbackText}>No Duke</Text>
                    </View>
                  )}
                </View>

                <View style={styles.rankBanner}>
                  <Text style={styles.rankBannerText}>Rank #{winner.placement ?? 1}</Text>
                </View>
              </View>
            </View>
          ) : null}

          {!loading && !loadError && players.length === 0 ? (
            <View style={styles.statusCard}>
              <Text style={styles.statusTitle}>No completed scores yet</Text>
              <Text style={styles.statusText}>
                This game does not have any locked final score rows to recap.
              </Text>
            </View>
          ) : null}

          {!loading && !loadError
            ? players.map((player, index) => (
                <View key={player.id} style={styles.playerCard}>
                  <View style={styles.playerHeaderRow}>
                    <View style={styles.playerHeaderMain}>
                      <View style={[styles.placeBadge, player.isWinner && styles.placeBadgeWinner]}>
                        <Text style={styles.placeBadgeText}>{player.placement ?? index + 1}</Text>
                      </View>

                      <View style={styles.playerHeaderCopy}>
                        <Text style={styles.playerName}>
                          {player.label}
                          {player.isGuest ? ' (Guest)' : ''}
                        </Text>
                        <Text style={styles.playerMeta}>
                          {player.playerId ? `ID: ${player.playerId} - ` : ''}
                          {player.dukeName}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.playerScorePill}>
                      <Text style={styles.playerScoreValue}>{player.totalScore}</Text>
                      <Text style={styles.playerScoreLabel}>PTS</Text>
                    </View>
                  </View>

                  {player.stats.length === 0 ? (
                    <View style={styles.emptyStatsPanel}>
                      <Text style={styles.emptyStatsText}>
                        No scoring tiles were available for this final score.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.statsGrid}>
                      {player.stats.map((stat) => (
                        <View key={`${player.id}:${stat.key}`} style={styles.statTile}>
                          <View style={styles.statTileTopRow}>
                            <View style={styles.statIconWrap}>
                              <Image source={stat.icon} style={styles.statIcon} resizeMode="contain" />
                            </View>

                            <View style={styles.statCopy}>
                              <Text style={styles.statLabel}>{stat.label}</Text>
                              <Text style={styles.statCount}>Owned {stat.input}</Text>
                            </View>
                          </View>

                          <View style={styles.statBottomRow}>
                            <View
                              style={[
                                styles.ruleChip,
                                stat.isDivision ? styles.ruleChipDivision : styles.ruleChipMultiply,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.ruleChipText,
                                  stat.isDivision
                                    ? styles.ruleChipDivisionText
                                    : styles.ruleChipMultiplyText,
                                ]}
                              >
                                {stat.ruleText}
                              </Text>
                            </View>

                            <View style={styles.subtotalPill}>
                              <Text style={styles.subtotalText}>{stat.subtotal} pts</Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            : null}
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
    backgroundColor: 'rgba(8, 12, 24, 0.78)',
  },

  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  content: {
    padding: 10,
    paddingTop: 4,
    // '/game-recap' is in PATHS_WITHOUT_BOTTOM_NAV, so there is no nav bar to
    // clear here — just breathing room under the last player card. The shell's
    // SafeAreaView already pads the bottom inset.
    paddingBottom: 24,
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

  retryButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 11,
    ...theme.shadow.glow,
  },

  retryButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  heroCard: {
    backgroundColor: 'rgba(41, 29, 65, 0.94)',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(100, 168, 255, 0.5)',
    padding: 16,
    marginBottom: 12,
    ...theme.shadow.glow,
  },

  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },

  heroCopy: {
    flex: 1,
    minWidth: 0,
  },

  heroKicker: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 8,
  },

  heroTitle: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 4,
  },

  heroSub: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },

  heroScorePill: {
    minWidth: 92,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(244, 200, 92, 0.45)',
    backgroundColor: 'rgba(18, 24, 43, 0.84)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroScoreValue: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: '900',
  },

  heroScoreLabel: {
    color: theme.colors.gold,
    fontSize: 10,
    fontWeight: '900',
    marginTop: 4,
    letterSpacing: 0.9,
  },

  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  heroImageWrap: {
    width: 96,
    height: 96,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundAlt,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },

  heroImage: {
    width: '100%',
    height: '100%',
  },

  heroImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroImageFallbackText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },

  rankBanner: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(112, 215, 165, 0.45)',
    backgroundColor: 'rgba(112, 215, 165, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  rankBannerText: {
    color: theme.colors.success,
    fontSize: 14,
    fontWeight: '900',
  },

  playerCard: {
    backgroundColor: 'rgba(25, 18, 43, 0.9)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 12,
    ...theme.shadow.card,
  },

  playerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },

  playerHeaderMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },

  placeBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  placeBadgeWinner: {
    backgroundColor: theme.colors.gold,
  },

  placeBadgeText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },

  playerHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },

  playerName: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 3,
  },

  playerMeta: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },

  playerScorePill: {
    minWidth: 74,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(100, 168, 255, 0.45)',
    backgroundColor: 'rgba(18, 24, 43, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  playerScoreValue: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '900',
  },

  playerScoreLabel: {
    color: theme.colors.accent,
    fontSize: 10,
    fontWeight: '900',
    marginTop: 3,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  statTile: {
    width: '48.5%',
    minHeight: 122,
    backgroundColor: 'rgba(31, 22, 52, 0.92)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
  },

  statTileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },

  statIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  statIcon: {
    width: 28,
    height: 28,
  },

  statCopy: {
    flex: 1,
    minWidth: 0,
  },

  statLabel: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 4,
  },

  statCount: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  statBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 'auto',
  },

  ruleChip: {
    minWidth: 54,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  ruleChipMultiply: {
    backgroundColor: 'rgba(244, 200, 92, 0.18)',
    borderColor: 'rgba(244, 200, 92, 0.45)',
  },

  ruleChipDivision: {
    backgroundColor: 'rgba(100, 168, 255, 0.12)',
    borderColor: 'rgba(100, 168, 255, 0.45)',
  },

  ruleChipText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  ruleChipMultiplyText: {
    color: theme.colors.gold,
  },

  ruleChipDivisionText: {
    color: theme.colors.accent,
  },

  subtotalPill: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: 'rgba(18, 24, 43, 0.78)',
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },

  subtotalText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '900',
  },

  emptyStatsPanel: {
    borderRadius: 18,
    backgroundColor: 'rgba(31, 22, 52, 0.92)',
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },

  emptyStatsText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },

  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
})
