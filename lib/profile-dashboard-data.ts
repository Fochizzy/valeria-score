type NumericValue = number | string | null | undefined

type RawProfileSummary = {
  games?: NumericValue
  wins?: NumericValue
  avgScore?: NumericValue
} | null

type RawProfileHistoryRow = {
  sessionId: string
  dukeSlug: string
  totalScore: NumericValue
  rank: NumericValue
  playerCount: NumericValue
  updatedAt: string
}

type RawProfileGuestRow = {
  id: string
  display_name: string | null
  contact_email: string | null
  public_player_id: string | null
  wins?: NumericValue
  losses?: NumericValue
  topDuke?: string | null
  totalGames?: NumericValue
} | null

export type RawProfileDashboard = {
  displayName?: string | null
  summary?: RawProfileSummary
  history?: RawProfileHistoryRow[] | null
  sharedGuestProfiles?: RawProfileGuestRow[] | null
} | null

export type ProfileDashboard = {
  displayName: string
  summary: {
    games: number
    wins: number
    avgScore: number
  }
  history: {
    sessionId: string
    dukeSlug: string
    totalScore: number
    rank: number
    playerCount: number
    updatedAt: string
  }[]
  sharedGuestProfiles: {
    id: string
    display_name: string
    contact_email: string | null
    public_player_id: string | null
    stats: {
      wins: number
      losses: number
      topDuke: string
      totalGames: number
    }
  }[]
}

function toNumber(value: NumericValue) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function normalizeText(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizePublicPlayerId(value: string | null | undefined) {
  const normalized = normalizeText(value).toUpperCase()
  return normalized || null
}

export function createEmptyProfileDashboard(displayName = 'Player'): ProfileDashboard {
  return {
    displayName,
    summary: {
      games: 0,
      wins: 0,
      avgScore: 0,
    },
    history: [],
    sharedGuestProfiles: [],
  }
}

export function resolveProfileDashboard(
  payload: RawProfileDashboard,
  fallbackDisplayName = 'Player'
): ProfileDashboard {
  const base = createEmptyProfileDashboard(
    normalizeText(payload?.displayName) || fallbackDisplayName
  )

  return {
    displayName: base.displayName,
    summary: {
      games: toNumber(payload?.summary?.games),
      wins: toNumber(payload?.summary?.wins),
      avgScore: toNumber(payload?.summary?.avgScore),
    },
    history: [...(payload?.history ?? [])]
      .map((row) => ({
        sessionId: row.sessionId,
        dukeSlug: row.dukeSlug,
        totalScore: toNumber(row.totalScore),
        rank: toNumber(row.rank),
        playerCount: toNumber(row.playerCount),
        updatedAt: row.updatedAt,
      }))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    sharedGuestProfiles: (payload?.sharedGuestProfiles ?? [])
      .filter((row): row is NonNullable<RawProfileGuestRow> => Boolean(row?.id))
      .map((row) => ({
        id: row.id,
        display_name: normalizeText(row.display_name) || 'Guest Player',
        contact_email: row.contact_email ?? null,
        public_player_id: normalizePublicPlayerId(row.public_player_id),
        stats: {
          wins: toNumber(row.wins),
          losses: toNumber(row.losses),
          topDuke: normalizeText(row.topDuke) || '-',
          totalGames: toNumber(row.totalGames),
        },
      })),
  }
}
