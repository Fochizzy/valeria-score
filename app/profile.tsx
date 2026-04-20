import { useCallback, useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native'
import { supabase } from '../lib/supabase'

type ScoreRow = {
  session_id: string
  user_id: string | null
  guest_profile_id: string | null
  duke_slug: string
  total_score: number
  updated_at: string
}

type SessionStat = {
  sessionId: string
  dukeSlug: string
  totalScore: number
  rank: number
  playerCount: number
  updatedAt: string
}

type GuestProfile = {
  id: string
  display_name: string
  contact_email: string | null
  public_player_id: string
}

function formatDukeName(slug: string) {
  if (!slug) return 'No Duke Selected'
  return slug
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleDateString()
}

export default function ProfileScreen() {
  const [displayName, setDisplayName] = useState('Player')
  const [history, setHistory] = useState<SessionStat[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [sharedGuestProfiles, setSharedGuestProfiles] = useState<GuestProfile[]>([])
  const [guestStats, setGuestStats] = useState<Record<
    string,
    { wins: number; losses: number; topDuke: string; totalGames: number }
  >>({})

  const load = useCallback(async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setHistory([])
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.display_name) {
      setDisplayName(profile.display_name)
    }

    const { data: myScores, error: myScoresError } = await supabase
      .from('player_scores')
      .select('session_id, user_id, guest_profile_id, duke_slug, total_score, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (myScoresError) throw myScoresError

    const sessionIds = [...new Set((myScores ?? []).map((row: ScoreRow) => row.session_id))]
    if (!sessionIds.length) {
      setHistory([])
    } else {
      const { data: allSessionScores, error: allError } = await supabase
        .from('player_scores')
        .select('session_id, user_id, guest_profile_id, duke_slug, total_score, updated_at')
        .in('session_id', sessionIds)

      if (allError) throw allError

      const grouped = new Map<string, ScoreRow[]>()

      for (const row of (allSessionScores ?? []) as ScoreRow[]) {
        const bucket = grouped.get(row.session_id) ?? []
        bucket.push(row)
        grouped.set(row.session_id, bucket)
      }

      const computed: SessionStat[] = ((myScores ?? []) as ScoreRow[]).map((row) => {
        const sessionRows = (grouped.get(row.session_id) ?? []).sort(
          (a, b) => b.total_score - a.total_score
        )

        const rank = sessionRows.findIndex(
          (sessionRow) => sessionRow.user_id === row.user_id
        ) + 1

        return {
          sessionId: row.session_id,
          dukeSlug: row.duke_slug,
          totalScore: row.total_score,
          rank,
          playerCount: sessionRows.length,
          updatedAt: row.updated_at,
        }
      })

      setHistory(
        computed.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
      )
    }

    const { data: guestRows, error: guestRowsError } = await supabase
      .from('player_scores')
      .select('guest_profile_id')
      .eq('owner_user_id', user.id)
      .not('guest_profile_id', 'is', null)

    if (guestRowsError) throw guestRowsError

    const guestIds = [...new Set((guestRows ?? []).map((r: any) => r.guest_profile_id).filter(Boolean))]

    if (!guestIds.length) {
      setSharedGuestProfiles([])
      setGuestStats({})
      return
    }

    const { data: guestProfiles, error: guestProfilesError } = await supabase
      .from('guest_profiles')
      .select('id, display_name, contact_email, public_player_id')
      .in('id', guestIds)

    if (guestProfilesError) throw guestProfilesError

    const safeGuestProfiles = (guestProfiles ?? []) as GuestProfile[]
    setSharedGuestProfiles(safeGuestProfiles)

    const { data: guestScoreRows, error: guestScoresError } = await supabase
      .from('player_scores')
      .select('session_id, user_id, guest_profile_id, duke_slug, total_score, updated_at')
      .in('guest_profile_id', guestIds)

    if (guestScoresError) throw guestScoresError

    const allGuestScoreRows = (guestScoreRows ?? []) as ScoreRow[]
    const allSessionIds = [...new Set(allGuestScoreRows.map((r) => r.session_id))]

    let allScoresAcrossSessions: ScoreRow[] = []
    if (allSessionIds.length) {
      const { data, error } = await supabase
        .from('player_scores')
        .select('session_id, user_id, guest_profile_id, duke_slug, total_score, updated_at')
        .in('session_id', allSessionIds)

      if (error) throw error
      allScoresAcrossSessions = (data ?? []) as ScoreRow[]
    }

    const sessionsMap = new Map<string, ScoreRow[]>()
    for (const row of allScoresAcrossSessions) {
      const bucket = sessionsMap.get(row.session_id) ?? []
      bucket.push(row)
      sessionsMap.set(row.session_id, bucket)
    }

    const nextGuestStats: Record<
      string,
      { wins: number; losses: number; topDuke: string; totalGames: number }
    > = {}

    for (const guest of safeGuestProfiles) {
      const guestRowsForProfile = allGuestScoreRows.filter(
        (row) => row.guest_profile_id === guest.id
      )

      let wins = 0
      let losses = 0
      const dukeCounts = new Map<string, number>()

      for (const row of guestRowsForProfile) {
        const sessionRows = (sessionsMap.get(row.session_id) ?? []).sort(
          (a, b) => b.total_score - a.total_score
        )

        const rank =
          sessionRows.findIndex(
            (sessionRow) =>
              sessionRow.guest_profile_id === row.guest_profile_id &&
              sessionRow.session_id === row.session_id &&
              sessionRow.updated_at === row.updated_at
          ) + 1

        if (rank === 1) wins += 1
        else losses += 1

        dukeCounts.set(row.duke_slug, (dukeCounts.get(row.duke_slug) ?? 0) + 1)
      }

      const topDuke =
        [...dukeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''

      nextGuestStats[guest.id] = {
        wins,
        losses,
        topDuke,
        totalGames: guestRowsForProfile.length,
      }
    }

    setGuestStats(nextGuestStats)
  }, [])

  useEffect(() => {
    load().catch(console.error)
  }, [load])

  const onRefresh = async () => {
    try {
      setRefreshing(true)
      await load()
    } finally {
      setRefreshing(false)
    }
  }

  const summary = useMemo(() => {
    const totalGames = history.length
    const wins = history.filter((item) => item.rank === 1).length
    const losses = totalGames - wins
    const averageFinish =
      totalGames > 0
        ? (history.reduce((sum, item) => sum + item.rank, 0) / totalGames).toFixed(2)
        : '0.00'

    const dukeCounts = new Map<string, number>()

    for (const game of history) {
      dukeCounts.set(game.dukeSlug, (dukeCounts.get(game.dukeSlug) ?? 0) + 1)
    }

    const topDukes = [...dukeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    return {
      totalGames,
      wins,
      losses,
      averageFinish,
      topDukes,
    }
  }, [history])

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#DCCBFF"
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <Text style={styles.kicker}>Player Record</Text>
        <Text style={styles.title}>{displayName}</Text>
        <Text style={styles.subtitle}>
          Long-term session history, duke usage, and comparative win/loss record.
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Games</Text>
          <Text style={styles.statValue}>{summary.totalGames}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Wins</Text>
          <Text style={styles.statValue}>{summary.wins}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Losses</Text>
          <Text style={styles.statValue}>{summary.losses}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Avg Finish</Text>
          <Text style={styles.statValue}>{summary.averageFinish}</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Most Used Dukes</Text>
        {summary.topDukes.length === 0 ? (
          <Text style={styles.emptyText}>No completed games yet.</Text>
        ) : (
          summary.topDukes.map(([slug, count]) => (
            <View key={slug} style={styles.row}>
              <Text style={styles.rowLabel}>{formatDukeName(slug)}</Text>
              <Text style={styles.rowValue}>{count}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Shared Guest Profiles</Text>
        {sharedGuestProfiles.length === 0 ? (
          <Text style={styles.emptyText}>No guest profiles used yet.</Text>
        ) : (
          sharedGuestProfiles.map((guest) => {
            const stats = guestStats[guest.id] ?? {
              wins: 0,
              losses: 0,
              topDuke: '',
              totalGames: 0,
            }

            return (
              <View key={guest.id} style={styles.guestCard}>
                <Text style={styles.guestName}>{guest.display_name}</Text>
                <Text style={styles.guestMeta}>
                  {guest.contact_email || 'No email'} • ID: {guest.public_player_id}
                </Text>
                <Text style={styles.guestMeta}>Games: {stats.totalGames}</Text>
                <Text style={styles.guestMeta}>Wins: {stats.wins}</Text>
                <Text style={styles.guestMeta}>Losses: {stats.losses}</Text>
                <Text style={styles.guestMeta}>
                  Favorite Duke: {stats.topDuke ? formatDukeName(stats.topDuke) : 'None yet'}
                </Text>
              </View>
            )
          })
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Game History</Text>

        {history.length === 0 ? (
          <Text style={styles.emptyText}>
            No saved sessions yet. Finish a score sheet to build your profile history.
          </Text>
        ) : (
          history.map((game) => (
            <View key={`${game.sessionId}-${game.updatedAt}`} style={styles.historyCard}>
              <View style={styles.historyTop}>
                <Text style={styles.historyDuke}>{formatDukeName(game.dukeSlug)}</Text>
                <Text style={styles.historyScore}>{game.totalScore}</Text>
              </View>

              <Text style={styles.historyMeta}>
                Finish: #{game.rank} of {game.playerCount}
              </Text>
              <Text style={styles.historyMeta}>Played: {formatDate(game.updatedAt)}</Text>
              <Text style={styles.historyMeta}>Session: {game.sessionId}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#140F1F' },
  content: { padding: 16, paddingBottom: 36 },
  heroCard: {
    backgroundColor: '#1E152C',
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#4F3A72',
  },
  kicker: {
    color: '#BCAEE0',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 6,
  },
  title: {
    color: '#FFF8FF',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
  },
  subtitle: {
    color: '#CFC3E8',
    fontSize: 14,
    lineHeight: 21,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  statCard: {
    width: '48.5%',
    backgroundColor: '#1E152C',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#4F3A72',
    marginBottom: 10,
  },
  statLabel: {
    color: '#C6B6EA',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
  },
  sectionCard: {
    backgroundColor: '#1E152C',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#4F3A72',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#FFF8FF',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 12,
  },
  emptyText: {
    color: '#CFC3E8',
    fontSize: 14,
    lineHeight: 21,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#312346',
  },
  rowLabel: {
    color: '#E6D8FF',
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    paddingRight: 12,
  },
  rowValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  guestCard: {
    backgroundColor: '#241836',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#4F3A72',
    padding: 14,
    marginBottom: 10,
  },
  guestName: {
    color: '#FFF8FF',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 6,
  },
  guestMeta: {
    color: '#CFC3E8',
    fontSize: 13,
    lineHeight: 20,
  },
  historyCard: {
    backgroundColor: '#241836',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#4F3A72',
    padding: 14,
    marginBottom: 10,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  historyDuke: {
    color: '#FFF8FF',
    fontSize: 16,
    fontWeight: '900',
    flex: 1,
    paddingRight: 12,
  },
  historyScore: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  historyMeta: {
    color: '#CFC3E8',
    fontSize: 13,
    lineHeight: 20,
  },
})