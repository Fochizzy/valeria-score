import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Image,
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

type DukeStatsRow = {
  duke_slug: string
  games_played: number
  avg_score: number
  avg_score_per_player: number
  win_percentage: number
  second_percentage: number
  third_percentage: number
  best_score: number
  most_wins_player_type: 'user' | 'guest' | null
  most_wins_player_key: string | null
  wins_with_duke: number | null
  best_avg_player_type: 'user' | 'guest' | null
  best_avg_player_key: string | null
  avg_with_duke: number | null
}

type ProfileRow = {
  id: string
  display_name: string | null
}

type GuestProfileRow = {
  id: string
  display_name: string
  public_player_id: string
}

type ResolvedDukeStatsRow = DukeStatsRow & {
  most_wins_player_name: string
  best_avg_player_name: string
  duke_name: string
}

function formatDukeName(slug: string) {
  const card = cards.find((item) => item.slug === slug)
  if (card?.name) return card.name

  if (!slug) return 'No Duke Selected'
  return slug
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function pct(value: number | null | undefined) {
  return `${Number(value ?? 0).toFixed(1)}%`
}

export default function DukeStatsScreen() {
  const [rows, setRows] = useState<ResolvedDukeStatsRow[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('duke_global_stats')
      .select('*')
      .order('win_percentage', { ascending: false })

    if (error) throw error

    const safeRows = (data ?? []) as DukeStatsRow[]

    const userIds = [
      ...new Set(
        safeRows
          .flatMap((row) => [
            row.most_wins_player_type === 'user' ? row.most_wins_player_key : null,
            row.best_avg_player_type === 'user' ? row.best_avg_player_key : null,
          ])
          .filter(Boolean)
      ),
    ] as string[]

    const guestIds = [
      ...new Set(
        safeRows
          .flatMap((row) => [
            row.most_wins_player_type === 'guest' ? row.most_wins_player_key : null,
            row.best_avg_player_type === 'guest' ? row.best_avg_player_key : null,
          ])
          .filter(Boolean)
      ),
    ] as string[]

    let profileMap = new Map<string, string>()
    let guestMap = new Map<string, string>()

    if (userIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds)

      if (profileError) throw profileError

      profileMap = new Map(
        ((profiles ?? []) as ProfileRow[]).map((p) => [
          p.id,
          p.display_name || 'Unknown Player',
        ])
      )
    }

    if (guestIds.length > 0) {
      const { data: guests, error: guestError } = await supabase
        .from('guest_profiles')
        .select('id, display_name, public_player_id')
        .in('id', guestIds)

      if (guestError) throw guestError

      guestMap = new Map(
        ((guests ?? []) as GuestProfileRow[]).map((g) => [
          g.id,
          `${g.display_name} (${g.public_player_id})`,
        ])
      )
    }

    const resolved: ResolvedDukeStatsRow[] = safeRows.map((row) => {
      const mostWinsName =
        row.most_wins_player_type === 'user'
          ? profileMap.get(row.most_wins_player_key || '') || 'Unknown Player'
          : row.most_wins_player_type === 'guest'
          ? guestMap.get(row.most_wins_player_key || '') || 'Unknown Guest'
          : '—'

      const bestAvgName =
        row.best_avg_player_type === 'user'
          ? profileMap.get(row.best_avg_player_key || '') || 'Unknown Player'
          : row.best_avg_player_type === 'guest'
          ? guestMap.get(row.best_avg_player_key || '') || 'Unknown Guest'
          : '—'

      return {
        ...row,
        most_wins_player_name: mostWinsName,
        best_avg_player_name: bestAvgName,
        duke_name: formatDukeName(row.duke_slug),
      }
    })

    setRows(resolved)
    setLoading(false)
  }, [])

  useEffect(() => {
    load().catch((err) => {
      console.error(err)
      setLoading(false)
    })
  }, [load])

  const onRefresh = async () => {
    try {
      setRefreshing(true)
      await load()
    } finally {
      setRefreshing(false)
    }
  }

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows

    return rows.filter((row) => {
      return (
        row.duke_name.toLowerCase().includes(q) ||
        row.duke_slug.toLowerCase().includes(q) ||
        row.most_wins_player_name.toLowerCase().includes(q) ||
        row.best_avg_player_name.toLowerCase().includes(q)
      )
    })
  }, [rows, search])

  const summary = useMemo(() => {
    if (!filteredRows.length) return null
    return filteredRows[0]
  }, [filteredRows])

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
        <View style={styles.heroTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>Global Analytics</Text>
            <Text style={styles.title}>Duke Stats</Text>
          </View>

          <View style={styles.topBadge}>
            <Text style={styles.topBadgeText}>{filteredRows.length}</Text>
          </View>
        </View>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by duke"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {summary ? (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>Top Win Rate</Text>
            <Text style={styles.summaryDuke} numberOfLines={1}>
              {summary.duke_name}
            </Text>
            <Text style={styles.summaryText}>{pct(summary.win_percentage)} WR</Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Loading stats...</Text>
          <Text style={styles.emptyText}>Building duke analytics from locked sessions.</Text>
        </View>
      ) : filteredRows.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No matching dukes</Text>
          <Text style={styles.emptyText}>Try a different search.</Text>
        </View>
      ) : (
        filteredRows.map((row, index) => (
          <View key={row.duke_slug} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.rankLabel}>#{index + 1}</Text>
              <View style={styles.winBadge}>
                <Text style={styles.winBadgeText}>{pct(row.win_percentage)} WR</Text>
              </View>
            </View>

            <View style={styles.playerCardTop}>
              <View style={styles.imageWrap}>
                {cardImages[row.duke_slug] ? (
                  <Image
                    source={cardImages[row.duke_slug]}
                    style={styles.dukeImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.imageFallback}>
                    <Text style={styles.imageFallbackText}>No Image</Text>
                  </View>
                )}
              </View>

              <View style={styles.headerMeta}>
                <Text style={styles.dukeName} numberOfLines={2}>
                  {row.duke_name}
                </Text>
                <Text style={styles.subMeta}>{row.games_played} games</Text>
                <Text style={styles.subMeta}>Best {row.best_score}</Text>
              </View>
            </View>

            <View style={styles.statGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{Number(row.avg_score).toFixed(1)}</Text>
                <Text style={styles.statLabel}>AVG</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {Number(row.avg_score_per_player).toFixed(1)}
                </Text>
                <Text style={styles.statLabel}>AVG/PLYR</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statValue}>{pct(row.second_percentage)}</Text>
                <Text style={styles.statLabel}>2ND</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statValue}>{pct(row.third_percentage)}</Text>
                <Text style={styles.statLabel}>3RD</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailMini}>
                <Text style={styles.detailTitle}>Most Wins</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {row.most_wins_player_name}
                </Text>
                <Text style={styles.detailSub}>Wins: {row.wins_with_duke ?? 0}</Text>
              </View>

              <View style={styles.detailMini}>
                <Text style={styles.detailTitle}>Best Average</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {row.best_avg_player_name}
                </Text>
                <Text style={styles.detailSub}>
                  Avg: {Number(row.avg_with_duke ?? 0).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 10,
    paddingBottom: 24,
  },
  heroCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.card,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  kicker: {
    color: theme.colors.primaryLight,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  topBadge: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  topBadgeText: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '900',
  },
  searchInput: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  summaryBox: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft ?? theme.colors.border,
    padding: 10,
  },
  summaryTitle: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryDuke: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 2,
  },
  summaryText: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '900',
  },
  emptyCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  card: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 10,
    ...theme.shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rankLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
  },
  winBadge: {
    backgroundColor: 'rgba(231, 199, 104, 0.14)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E7C768',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  winBadgeText: {
    color: '#E7C768',
    fontSize: 11,
    fontWeight: '900',
  },
  playerCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  imageWrap: {
    width: 70,
    height: 70,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 10,
  },
  dukeImage: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  imageFallbackText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  headerMeta: {
    flex: 1,
    minWidth: 0,
  },
  dukeName: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  subMeta: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 8,
  },
  statBox: {
    width: '48.5%',
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 9,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },
  statLabel: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '900',
  },
  detailRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  detailMini: {
    flex: 1,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
  },
  detailTitle: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailValue: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 3,
  },
  detailSub: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
})