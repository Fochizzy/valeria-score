export type PlayerStatsScoreRow = {
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

export type PlayerStatsProfileRow = {
  id: string
  display_name: string | null
  public_player_id: string | null
}

export type PlayerStatsGuestProfileRow = {
  id: string
  display_name: string
  public_player_id: string
}

export type PlayerAggregate = {
  player_key: string
  player_name: string
  public_player_id: string | null
  player_type: 'user' | 'guest'
  games_played: number
  wins: number
  avg_score: number
  avg_finish: number
}

export type PlayerDukeAggregate = {
  duke_slug: string
  games_played: number
  wins: number
  avg_score: number
  avg_finish: number
}

type PlayerSearchRow = Pick<PlayerAggregate, 'public_player_id' | 'player_name'>

export function getPlayerEntityKey(row: PlayerStatsScoreRow) {
  if (row.is_guest && row.guest_profile_id) return `guest:${row.guest_profile_id}`
  if (row.user_id) return `user:${row.user_id}`
  return null
}

export function buildPlayerAggregates(
  scoreRows: PlayerStatsScoreRow[],
  profileRows: PlayerStatsProfileRow[],
  guestRows: PlayerStatsGuestProfileRow[]
): PlayerAggregate[] {
  const profileMap = new Map<string, PlayerStatsProfileRow>(
    profileRows.map((profile) => [profile.id, profile])
  )

  const guestMap = new Map<string, PlayerStatsGuestProfileRow>(
    guestRows.map((guest) => [guest.id, guest])
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

  for (const row of scoreRows) {
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
      current.player_name = profile?.display_name || profile?.public_player_id || 'Player'
      current.public_player_id = profile?.public_player_id || null
    }

    current.games += 1
    current.totalScore += Number(row.total_score ?? 0)
    current.totalFinish += Number(row.placement ?? 0)
    if (row.is_winner) current.wins += 1

    grouped.set(entityKey, current)
  }

  return [...grouped.entries()]
    .map(([playerKey, aggregate]) => ({
      player_key: playerKey,
      player_name: aggregate.player_name,
      public_player_id: aggregate.public_player_id,
      player_type: aggregate.player_type,
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
}

export function filterPlayers<T extends PlayerSearchRow>(players: T[], query: string): T[] {
  const normalizedQuery = query.trim().toUpperCase()
  if (!normalizedQuery) return players

  return players.filter(
    (player) =>
      (player.public_player_id ?? '').toUpperCase().includes(normalizedQuery) ||
      player.player_name.toUpperCase().includes(normalizedQuery)
  )
}

export function buildPlayerDukeAggregates(
  scoreRows: PlayerStatsScoreRow[],
  playerKey: string | null
): PlayerDukeAggregate[] {
  if (!playerKey) return []

  const dukeGrouped = new Map<
    string,
    {
      totalScore: number
      totalFinish: number
      wins: number
      games: number
    }
  >()

  for (const row of scoreRows) {
    if (!row.duke_slug || getPlayerEntityKey(row) !== playerKey) continue

    const current = dukeGrouped.get(row.duke_slug) ?? {
      totalScore: 0,
      totalFinish: 0,
      wins: 0,
      games: 0,
    }

    current.games += 1
    current.totalScore += Number(row.total_score ?? 0)
    current.totalFinish += Number(row.placement ?? 0)
    if (row.is_winner) current.wins += 1

    dukeGrouped.set(row.duke_slug, current)
  }

  return [...dukeGrouped.entries()]
    .map(([dukeSlug, aggregate]) => ({
      duke_slug: dukeSlug,
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
}
