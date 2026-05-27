import { formatDukeName } from './duke-names.ts'
import type { PlayerAggregate } from './player-stats-aggregates'

export type InsightItem = {
  label: string
  value: string
  detail: string
}

export type PlainLanguageInsight = {
  title: string
  body: string
  // When present, the insight card can be wrapped in a Pressable that opens
  // the game-recap for this session.
  sessionId?: string
}

type ProfileHistoryItem = {
  sessionId?: string
  dukeSlug: string
  totalScore: number
  rank: number
  updatedAt: string
  playerCount?: number
}

type DukeHighlightRow = {
  duke_slug: string
  duke_name: string
  games_played: number
  avg_score: number
  win_percentage: number
}

type SessionCardMetaInput = {
  playerCount: number
  totalEntries: number
  lockedCount: number
}

type ProfilePlainLanguageInsightInput = {
  summary: {
    games: number
    wins: number
    avgScore: number
  }
  history: ProfileHistoryItem[]
}

function formatShortDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently'

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  })
}

function resolveFavoriteDuke(history: ProfileHistoryItem[]) {
  const dukeCounts = new Map<string, number>()

  for (const row of history) {
    dukeCounts.set(row.dukeSlug, (dukeCounts.get(row.dukeSlug) ?? 0) + 1)
  }

  return (
    [...dukeCounts.entries()].sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]
      return a[0].localeCompare(b[0])
    })[0] ?? ['', 0]
  )
}

export function buildProfileHighlights(history: ProfileHistoryItem[]): InsightItem[] {
  if (!history.length) return []

  const bestFinish = [...history].sort((a, b) => a.rank - b.rank)[0]
  const latest = [...history].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )[0]
  const [favoriteDukeSlug = '', favoriteDukeCount = 0] = resolveFavoriteDuke(history)

  return [
    {
      label: 'Best Finish',
      value: `#${bestFinish.rank}`,
      detail: `${bestFinish.totalScore} pts with ${formatDukeName(bestFinish.dukeSlug)}`,
    },
    {
      label: 'Favorite Duke',
      value: formatDukeName(favoriteDukeSlug, { emptyLabel: '-' }),
      detail: `${favoriteDukeCount} game${favoriteDukeCount === 1 ? '' : 's'}`,
    },
    {
      label: 'Last Score',
      value: `${latest.totalScore} pts`,
      detail: formatShortDate(latest.updatedAt),
    },
  ]
}

export function buildProfilePlainLanguageInsights({
  summary,
  history,
}: ProfilePlainLanguageInsightInput): PlainLanguageInsight[] {
  if (!history.length) {
    return [
      {
          title: 'Finalized Games',
          body: 'You have no finalized games yet, so this page will fill in once your first locked score is saved.',
      },
      {
        title: 'Favorite Duke',
          body: 'A few finalized sessions will make it clear which duke you keep coming back to.',
      },
      {
        title: 'Recent Form',
        body: 'Your latest score, best finish, and table habits will show up here after your first game.',
      },
    ]
  }

  const safeGames = Math.max(summary.games, history.length)
  const winsFromHistory = history.filter((row) => row.rank === 1).length
  const safeWins = Math.max(summary.wins, winsFromHistory)
  const historyAverageScore =
    history.reduce((total, row) => total + row.totalScore, 0) / Math.max(history.length, 1)
  const safeAverageScore = summary.avgScore > 0 ? summary.avgScore : historyAverageScore
  const winRate = safeGames > 0 ? (safeWins / safeGames) * 100 : 0
  const latest = [...history].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )[0]
  const bestFinish = [...history].sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })[0]
  const [favoriteDukeSlug = '', favoriteDukeCount = 0] = resolveFavoriteDuke(history)
  const averageRank =
    history.reduce((total, row) => total + Math.max(row.rank, 1), 0) / Math.max(history.length, 1)
  const averageTableSize =
    history.reduce((total, row) => total + Math.max(row.playerCount ?? 0, 1), 0) /
    Math.max(history.length, 1)

  return [
    {
      title: 'Overall Pace',
      body:
        safeGames === 1
            ? `You have 1 finalized game so far, and it finished at ${safeAverageScore.toFixed(1)} PTS.`
            : `Across ${safeGames} finalized games, you average ${safeAverageScore.toFixed(1)} PTS and win ${winRate.toFixed(1)}% of the time.`,
    },
    {
      title: 'Best Run',
      body: `Your best finish so far is #${bestFinish.rank} with ${formatDukeName(bestFinish.dukeSlug)} at ${bestFinish.totalScore} PTS.`,
      sessionId: bestFinish.sessionId,
    },
    {
      title: 'Favorite Duke',
      body: `You keep coming back to ${formatDukeName(favoriteDukeSlug, { emptyLabel: 'No Duke' })}; it shows up in ${favoriteDukeCount} of ${safeGames} finalized games.`,
    },
    {
      title: safeGames > 1 ? 'Table Pattern' : 'Latest Table',
      body:
        safeGames > 1
          ? `You usually land around #${Math.round(averageRank)} in ${Math.round(averageTableSize)}-player tables.`
          : `Your latest locked game was ${latest.totalScore} PTS with ${formatDukeName(latest.dukeSlug)} on ${formatShortDate(latest.updatedAt)}.`,
    },
  ]
}

export function buildPlayerHighlights(players: PlayerAggregate[]): InsightItem[] {
  if (!players.length) return []

  const leader = [...players].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins
    return b.avg_score - a.avg_score
  })[0]

  const mostActive = [...players].sort((a, b) => b.games_played - a.games_played)[0]
  const bestAverage = [...players].sort((a, b) => b.avg_score - a.avg_score)[0]

  return [
    {
      label: 'Leader',
      value: leader.player_name,
      detail: `${leader.wins} win${leader.wins === 1 ? '' : 's'}`,
    },
    {
      label: 'Most Active',
      value: mostActive.player_name,
      detail: `${mostActive.games_played} games`,
    },
    {
      label: 'Best Average',
      value: bestAverage.player_name,
      detail: `${bestAverage.avg_score.toFixed(1)} avg`,
    },
  ]
}

export function buildDukeHighlights(rows: DukeHighlightRow[]): InsightItem[] {
  if (!rows.length) return []

  const topWinRate = [...rows].sort((a, b) => b.win_percentage - a.win_percentage)[0]
  const mostPlayed = [...rows].sort((a, b) => b.games_played - a.games_played)[0]
  const bestAverage = [...rows].sort((a, b) => b.avg_score - a.avg_score)[0]

  return [
    {
      label: 'Top Win Rate',
      value: topWinRate.duke_name,
      detail: `${Number(topWinRate.win_percentage).toFixed(1)}% win rate`,
    },
    {
      label: 'Most Played',
      value: mostPlayed.duke_name,
      detail: `${mostPlayed.games_played} games`,
    },
    {
      label: 'Best Average',
      value: bestAverage.duke_name,
      detail: `${Number(bestAverage.avg_score).toFixed(1)} avg`,
    },
  ]
}

export function buildSessionCardMeta({
  playerCount,
  totalEntries,
  lockedCount,
}: SessionCardMetaInput) {
  const safePlayers = Math.max(0, Math.floor(playerCount || 0))
  const safeEntries = Math.max(0, Math.floor(totalEntries || 0))
  const safeLocked = Math.max(0, Math.floor(lockedCount || 0))

  const isReadyToFinish = safeEntries > 0 && safeLocked >= safeEntries

  return {
    playersValue: `${safePlayers} player${safePlayers === 1 ? '' : 's'}`,
    savedValue:
      safeEntries > 0 ? `${safeLocked} of ${safeEntries} locked` : 'No saved scores yet',
    statusValue: isReadyToFinish
      ? 'Ready to finish'
      : safeEntries > 0
      ? 'In progress'
      : 'Waiting for scores',
    isReadyToFinish,
  }
}
