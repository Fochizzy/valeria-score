import { formatDukeName } from './duke-names.ts'
import { resolveSessionScoreDisplayIdentity } from './session-score-display.ts'

export type CompareScoreRow = {
  id: string
  session_id: string
  owner_user_id: string | null
  // Phase 1 — the user who can edit/delete this row. Equals owner_user_id for
  // self-played and guest rows, but differs for player profiles added by
  // someone else (where scored_by = the adder).
  scored_by_user_id: string | null
  player_name: string | null
  guest_profile_id: string | null
  guest_entry_id: string | null
  recap_player_name?: string | null
  recap_player_id?: string | null
  duke_slug: string | null
  score_total: number | null
  game_locked: boolean | null
  placement: number | null
  is_winner: boolean | null
}

export type CompareSessionPlayerRow = {
  session_id: string
  user_id: string | null
}

export type CompareProfileRow = {
  id: string
  display_name: string | null
  public_player_id: string | null
}

export type CompareGuestProfileRow = {
  id: string
  display_name: string | null
  public_player_id: string | null
}

export type CompareEntry = {
  id: string
  scoreId: string
  label: string
  playerId: string | null
  totalScore: number
  locked: boolean
  isGuest: boolean
  userId: string | null
  // Phase 1 — viewer needs this to know whether they're the row's editor
  // (scored_by_user_id), which gates tap-and-hold removal of guests / added
  // players. Falls back to userId for legacy rows where it's not set.
  scoredByUserId: string | null
  dukeSlug: string | null
  dukeName: string
  placement: number | null
  isWinner: boolean
  hasScore: boolean
  guestProfileId: string | null
  guestEntryId: string | null
}

type BuildCompareEntriesInput = {
  scoreRows: CompareScoreRow[]
  sessionPlayers: CompareSessionPlayerRow[]
  profiles: CompareProfileRow[]
  guestProfiles: CompareGuestProfileRow[]
}

export function buildCompareEntries({
  scoreRows,
  sessionPlayers,
  profiles,
  guestProfiles,
}: BuildCompareEntriesInput) {
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]))
  const guestProfileMap = new Map(
    guestProfiles.map((profile) => [profile.id, profile])
  )
  const scoredUserIds = new Set<string>()

  const scoredEntries: CompareEntry[] = scoreRows.map((row) => {
    const profile = row.owner_user_id ? profileMap.get(row.owner_user_id) : undefined
    const guestProfile = row.guest_profile_id
      ? guestProfileMap.get(row.guest_profile_id)
      : undefined
    const identity = resolveSessionScoreDisplayIdentity({
      row,
      profile,
      guestProfile,
    })
    const hasScore = Boolean(row.duke_slug)

    if (!identity.isGuest && row.owner_user_id) {
      scoredUserIds.add(row.owner_user_id)
    }

    return {
      id: row.id,
      scoreId: row.id,
      label: identity.label,
      playerId: identity.playerId,
      totalScore: Number(row.score_total || 0),
      locked: Boolean(row.game_locked),
      isGuest: identity.isGuest,
      userId: row.owner_user_id,
      // Fall back to owner_user_id for legacy rows that pre-date Phase 1.
      // For self-played and guest rows, scored_by_user_id == owner_user_id
      // anyway, so the fallback preserves existing behavior.
      scoredByUserId: row.scored_by_user_id ?? row.owner_user_id ?? null,
      dukeSlug: row.duke_slug ?? null,
      dukeName: formatDukeName(row.duke_slug),
      placement: row.placement ?? null,
      isWinner: Boolean(row.is_winner),
      hasScore,
      guestProfileId: row.guest_profile_id ?? null,
      guestEntryId: row.guest_entry_id ?? null,
    }
  })

  const pendingEntries: CompareEntry[] = sessionPlayers
    .filter(
      (player) => Boolean(player.user_id) && !scoredUserIds.has(String(player.user_id))
    )
    .map((player) => {
      const userId = String(player.user_id)
      const profile = profileMap.get(userId)

      return {
        id: `pending:${userId}`,
        scoreId: '',
        label: profile?.display_name || profile?.public_player_id || 'Player',
        playerId: profile?.public_player_id || null,
        totalScore: 0,
        locked: false,
        isGuest: false,
        userId,
        scoredByUserId: userId,
        dukeSlug: null,
        dukeName: 'No Duke Yet',
        placement: null,
        isWinner: false,
        hasScore: false,
        guestProfileId: null,
        guestEntryId: null,
      }
    })

  return [...scoredEntries, ...pendingEntries].sort((left, right) => {
    if (left.hasScore !== right.hasScore) {
      return left.hasScore ? -1 : 1
    }

    if ((left.placement ?? 9999) !== (right.placement ?? 9999)) {
      return (left.placement ?? 9999) - (right.placement ?? 9999)
    }

    if (left.totalScore !== right.totalScore) {
      return right.totalScore - left.totalScore
    }

    return left.label.localeCompare(right.label)
  })
}
