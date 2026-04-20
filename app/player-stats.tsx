import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { theme } from '../constants/theme'
import { cards } from '../data/cards'
import { cardImages } from '../data/cardImages'

type TimeWindow = 'all' | '30d'

type ScoreRow = {
  user_id: string | null
  owner_user_id: string | null
  guest_name: string | null
  guest_profile_id: string | null
  is_guest: boolean | null
  duke_slug: string | null
  total_score: number
  placement: number | null
  is_winner: boolean | null
  included_in_stats: boolean | null
  updated_at: string
}

type ProfileRow = {
  id: string
  display_name: string | null
  public_player_id: string | null
}

type GuestProfileRow = {
  id: string
  display_name: string
  public_player_id: string
}

type PlayerAggregate = {
  player_key: string
  player_name: string
  public_player_id: string | null
  player_type: 'user' | 'guest'
  games_played: number
  wins: number
  avg_score: number
  avg_finish: number
}

type PlayerDukeAggregate = {
  duke_slug: string
  games_played: number
  wins: number
  avg_score: number
  avg_finish: number
}

function formatDukeName(slug: string) {
  const card = cards.find((item) => item.slug === slug)
  if (card?.name) return card.name

  return slug
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getPlayerEntityKey(row: ScoreRow) {
  if (row.is_guest && row.guest_profile_id) return `guest:${row.guest_profile_id}`
  if (row.user_id) return `user:${row.user_id}`
  return null
}

export default function PlayerStatsScreen() {
  const [query, setQuery] = useState('')
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('all')
  const [dukeFilter, setDukeFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [players, setPlayers] = useState<PlayerAggregate[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerAggregate | null>(null)
  const [playerDukeStats, setPlayerDukeStats] = useState<PlayerDukeAggregate[]>([])

  const dukeOptions = useMemo(() => cards.map((card) => card.slug), [])

  async function loadData() {
    setLoading(true)
    try {
      const cutoff =
        timeWindow === '30d'
          ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          : null

      let scoresQuery = supabase
        .from('player_scores')
        .select(
          'user_id, owner_user_id, guest_name, guest_profile_id, is_guest, duke_slug, total_score, placement, is_winner, included_in_stats, updated_at'
        )
        .eq('included_in_stats', true)

      if (cutoff) {
        scoresQuery = scoresQuery.gte('updated_at', cutoff)
      }

      if (dukeFilter !== 'all') {
        scoresQuery = scoresQuery.eq('duke_slug', dukeFilter)
      }

      const [
        { data: scoreRows, error: scoreError },
        { data: profileRows, error: profileError },
        { data: guestRows, error: guestError },
      ] = await Promise.all([
        scoresQuery,
        supabase.from('profiles').select('id, display_name, public_player_id'),
        supabase.from('guest_profiles').select('id, display_name, public_player_id'),
      ])

      if (scoreError) throw scoreError
      if (profileError) throw profileError
      if (guestError) throw guestError

      const safeScores = (scoreRows ?? []) as ScoreRow[]
      const safeProfiles = (profileRows ?? []) as ProfileRow[]
      const safeGuests = (guestRows ?? []) as GuestProfileRow[]

      const profileMap = new Map<string, ProfileRow>(
        safeProfiles.map((profile) => [profile.id, profile])
      )

      const guestMap = new Map<string, GuestProfileRow>(
        safeGuests.map((guest) => [guest.id, guest])
      )

      const grouped = new Map<
        string,
        {
          player_type: 'user' | 'guest'
          player_name: string
          public_player_id: string | null
          totalScore: number
          totalFinish: number
          wins: number
          games: number
        }
      >()

      for (const row of safeScores) {
        const entityKey = getPlayerEntityKey(row)
        if (!entityKey) continue

        const current = grouped.get(entityKey) ?? {
          player_type: row.is_guest ? 'guest' : 'user',
          player_name: 'Player',
          public_player_id: null,
          totalScore: 0,
          totalFinish: 0,
          wins: 0,
          games: 0,
        }

        if (row.is_guest && row.guest_profile_id) {
          const guest = guestMap.get(row.guest_profile_id)
          current.player_type = 'guest'
          current.player_name = guest?.display_name || row.guest_name || 'Guest Player'
          current.public_player_id = guest?.public_player_id || null
        } else if (row.user_id) {
          const profile = profileMap.get(row.user_id)
          current.player_type = 'user'
          current.player_name =
            profile?.display_name || profile?.public_player_id || 'Player'
          current.public_player_id = profile?.public_player_id || null
        }

        current.games += 1
        current.totalScore += Number(row.total_score ?? 0)
        current.totalFinish += Number(row.placement ?? 0)
        if (row.is_winner) current.wins += 1

        grouped.set(entityKey, current)
      }

      let nextPlayers: PlayerAggregate[] = [...grouped.entries()].map(
        ([playerKey, aggregate]) => ({
          player_key: playerKey,
          player_name: aggregate.player_name,
          public_player_id: aggregate.public_player_id,
          player_type: aggregate.player_type,
          games_played: aggregate.games,
          wins: aggregate.wins,
          avg_score: aggregate.games ? aggregate.totalScore / aggregate.games : 0,
          avg_finish: aggregate.games ? aggregate.totalFinish / aggregate.games : 0,
        })
      )

      const normalizedQuery = query.trim().toUpperCase()
      if (normalizedQuery) {
        nextPlayers = nextPlayers.filter(
          (player) =>
            (player.public_player_id ?? '').toUpperCase().includes(normalizedQuery) ||
            player.player_name.toUpperCase().includes(normalizedQuery)
        )
      }

      nextPlayers.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins
        if (b.avg_score !== a.avg_score) return b.avg_score - a.avg_score
        return a.avg_finish - b.avg_finish
      })

      setPlayers(nextPlayers)

      if (selectedPlayer) {
        const selectedRows = safeScores.filter((row) => {
          const entityKey = getPlayerEntityKey(row)
          return entityKey === selectedPlayer.player_key
        })

        const dukeGrouped = new Map<
          string,
          {
            totalScore: number
            totalFinish: number
            wins: number
            games: number
          }
        >()

        for (const row of selectedRows) {
          const dukeSlug = row.duke_slug ?? 'unknown'
          const current = dukeGrouped.get(dukeSlug) ?? {
            totalScore: 0,
            totalFinish: 0,
            wins: 0,
            games: 0,
          }

          current.games += 1
          current.totalScore += Number(row.total_score ?? 0)
          current.totalFinish += Number(row.placement ?? 0)
          if (row.is_winner) current.wins += 1

          dukeGrouped.set(dukeSlug, current)
        }

        const nextDukeStats: PlayerDukeAggregate[] = [...dukeGrouped.entries()]
          .map(([duke_slug, aggregate]) => ({
            duke_slug,
            games_played: aggregate.games,
            wins: aggregate.wins,
            avg_score: aggregate.games ? aggregate.totalScore / aggregate.games : 0,
            avg_finish: aggregate.games ? aggregate.totalFinish / aggregate.games : 0,
          }))
          .sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins
            if (b.avg_score !== a.avg_score) return b.avg_score - a.avg_score
            return a.avg_finish - b.avg_finish
          })

        setPlayerDukeStats(nextDukeStats)
      } else {
        setPlayerDukeStats([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData().catch((err) => {
      console.error(err)
      setLoading(false)
    })
  }, [timeWindow, dukeFilter])

  async function onRefresh() {
    try {
      setRefreshing(true)
      await loadData()
    } finally {
      setRefreshing(false)
    }
  }

  const leaderboard = useMemo(() => players.slice(0, 30), [players])

  return (
    <ScrollView
      style={styles.container}
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
        <Text style={styles.kicker}>Global Leaderboard</Text>
        <Text style={styles.title}>Player Stats</Text>
        <Text style={styles.subtitle}>
          Search any player or guest by Player ID, then tap a row for duke breakdown.
        </Text>

        <TextInput
          value={query}
          onChangeText={(text) => setQuery(text.toUpperCase())}
          placeholder="Search Player ID or name"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterChip, timeWindow === 'all' && styles.filterChipActive]}
            onPress={() => setTimeWindow('all')}
          >
            <Text
              style={[styles.filterChipText, timeWindow === 'all' && styles.filterChipTextActive]}
            >
              All
            </Text>
          </Pressable>

          <Pressable
            style={[styles.filterChip, timeWindow === '30d' && styles.filterChipActive]}
            onPress={() => setTimeWindow('30d')}
          >
            <Text
              style={[styles.filterChipText, timeWindow === '30d' && styles.filterChipTextActive]}
            >
              30 Days
            </Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dukeRow}>
          <Pressable
            style={[styles.dukeChip, dukeFilter === 'all' && styles.dukeChipActive]}
            onPress={() => setDukeFilter('all')}
          >
            <Text style={[styles.dukeChipText, dukeFilter === 'all' && styles.dukeChipTextActive]}>
              All Dukes
            </Text>
          </Pressable>

          {dukeOptions.map((slug) => (
            <Pressable
              key={slug}
              style={[styles.dukeChip, dukeFilter === slug && styles.dukeChipActive]}
              onPress={() => setDukeFilter(slug)}
            >
              <Text
                style={[styles.dukeChipText, dukeFilter === slug && styles.dukeChipTextActive]}
              >
                {formatDukeName(slug)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>Leaderboard</Text>
          <Text style={styles.sectionCount}>{leaderboard.length}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={theme.colors.accent} />
            <Text style={styles.loadingText}>Loading leaderboard...</Text>
          </View>
        ) : leaderboard.length === 0 ? (
          <Text style={styles.emptyText}>No players found.</Text>
        ) : (
          leaderboard.map((player, index) => (
            <Pressable
              key={player.player_key}
              style={[
                styles.playerRow,
                selectedPlayer?.player_key === player.player_key && styles.playerRowSelected,
              ]}
              onPress={() => setSelectedPlayer(player)}
            >
              <View style={styles.leftCluster}>
                <View style={styles.playerRank}>
                  <Text style={styles.playerRankText}>{index + 1}</Text>
                </View>

                <View style={styles.playerMeta}>
                  <Text style={styles.playerName} numberOfLines={1}>
                    {player.player_name}
                  </Text>
                  <View style={styles.playerMetaRow}>
                    <Text style={styles.playerId} numberOfLines={1}>
                      {player.public_player_id ?? 'No Player ID'}
                    </Text>
                    <View
                      style={[
                        styles.typePill,
                        player.player_type === 'guest' ? styles.typePillGuest : styles.typePillUser,
                      ]}
                    >
                      <Text
                        style={[
                          styles.typePillText,
                          player.player_type === 'guest'
                            ? styles.typePillGuestText
                            : styles.typePillUserText,
                        ]}
                      >
                        {player.player_type === 'guest' ? 'Guest' : 'User'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.rightStats}>
                <View style={styles.miniStat}>
                  <Text style={styles.miniStatValue}>{player.wins}</Text>
                  <Text style={styles.miniStatLabel}>W</Text>
                </View>

                <View style={styles.miniStat}>
                  <Text style={styles.miniStatValue}>{player.games_played}</Text>
                  <Text style={styles.miniStatLabel}>G</Text>
                </View>

                <View style={styles.miniStat}>
                  <Text style={styles.miniStatValue}>{player.avg_score.toFixed(1)}</Text>
                  <Text style={styles.miniStatLabel}>AVG</Text>
                </View>
              </View>
            </Pressable>
          ))
        )}
      </View>

      {selectedPlayer ? (
        <View style={styles.sectionCard}>
          <View style={styles.selectedHeader}>
            <View>
              <Text style={styles.sectionTitle}>{selectedPlayer.player_name}</Text>
              <Text style={styles.selectedSub}>
                {selectedPlayer.public_player_id ?? 'No Player ID'} ·{' '}
                {selectedPlayer.player_type === 'guest' ? 'Guest' : 'User'}
              </Text>
            </View>

            <View style={styles.summaryPill}>
              <Text style={styles.summaryPillValue}>{selectedPlayer.games_played}</Text>
              <Text style={styles.summaryPillLabel}>Games</Text>
            </View>
          </View>

          {playerDukeStats.length === 0 ? (
            <Text style={styles.emptyText}>No duke stats for current filter.</Text>
          ) : (
            playerDukeStats.map((row) => (
              <View key={row.duke_slug} style={styles.dukeCard}>
                <View style={styles.dukeCardLeft}>
                  <View style={styles.dukeThumbWrap}>
                    {cardImages[row.duke_slug] ? (
                      <Image
                        source={cardImages[row.duke_slug]}
                        style={styles.dukeThumb}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.dukeThumbFallback}>
                        <Text style={styles.dukeThumbFallbackText}>No Image</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.dukeCardMeta}>
                    <Text style={styles.dukeStatName}>{formatDukeName(row.duke_slug)}</Text>
                    <Text style={styles.dukeStatSub}>
                      {row.games_played} games · {row.wins} wins · Avg finish {row.avg_finish.toFixed(2)}
                    </Text>
                  </View>
                </View>

                <View style={styles.dukeCardRight}>
                  <Text style={styles.dukeStatValue}>{row.avg_score.toFixed(1)}</Text>
                  <Text style={styles.dukeStatLabel}>Avg Score</Text>
                </View>
              </View>
            ))
          )}
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
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
    padding: 14,
    marginBottom: 12,
    ...theme.shadow.card,
  },
  kicker: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 1,
  },
  title: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 6,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  input: {
    backgroundColor: theme.colors.backgroundAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    flex: 1,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 10,
  },
  filterChipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  filterChipText: {
    color: theme.colors.text,
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 13,
  },
  filterChipTextActive: {
    color: theme.colors.background,
  },
  dukeRow: {
    marginTop: 2,
  },
  dukeChip: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  dukeChipActive: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  dukeChipText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  dukeChipTextActive: {
    color: theme.colors.background,
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
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  sectionCount: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '900',
  },
  loadingCard: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
  },
  playerRowSelected: {
    borderColor: theme.colors.accent,
    ...theme.shadow.glow,
  },
  leftCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  playerRank: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: theme.colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  playerRankText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  playerMeta: {
    flex: 1,
    minWidth: 0,
  },
  playerName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 2,
  },
  playerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playerId: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },
  typePill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typePillUser: {
    backgroundColor: 'rgba(89,183,255,0.16)',
    borderWidth: 1,
    borderColor: '#59B7FF',
  },
  typePillGuest: {
    backgroundColor: 'rgba(231,199,104,0.16)',
    borderWidth: 1,
    borderColor: '#E7C768',
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '900',
  },
  typePillUserText: {
    color: '#59B7FF',
  },
  typePillGuestText: {
    color: '#E7C768',
  },
  rightStats: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  miniStat: {
    minWidth: 48,
    alignItems: 'center',
  },
  miniStatValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  miniStatLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  selectedSub: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  summaryPill: {
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  summaryPillValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  summaryPillLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  dukeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    marginBottom: 8,
  },
  dukeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  dukeThumbWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 10,
  },
  dukeThumb: {
    width: '100%',
    height: '100%',
  },
  dukeThumbFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  dukeThumbFallbackText: {
    color: theme.colors.textMuted,
    fontSize: 8,
    fontWeight: '800',
    textAlign: 'center',
  },
  dukeCardMeta: {
    flex: 1,
    minWidth: 0,
  },
  dukeStatName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 2,
  },
  dukeStatSub: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  dukeCardRight: {
    alignItems: 'flex-end',
  },
  dukeStatValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  dukeStatLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
})