import { buildCompareProgress } from './compare-dashboard-state.ts'
import {
  buildCompareEntries,
  type CompareEntry,
  type CompareGuestProfileRow,
  type CompareProfileRow,
  type CompareScoreRow,
  type CompareSessionPlayerRow,
} from './compare-entries.ts'
import { supabase } from './supabase.ts'

type SessionRow = {
  id: string
  created_by: string
  join_code: string | null
  expected_player_count: number | null
}

type ScoreQueryResult = {
  rows: CompareScoreRow[]
  notice: string
}

type SessionQueryResult = {
  session: SessionRow | null
  notice: string
}

export type CompareDashboardData = {
  currentUserId: string
  isCreator: boolean
  sessionCreatorId: string
  expectedPlayerCount: number
  loadNotice: string
  scores: CompareEntry[]
}

const FULL_SCORE_SELECT =
  'id, session_id, owner_user_id, scored_by_user_id, player_name, guest_profile_id, guest_entry_id, recap_player_name, recap_player_id, duke_slug, score_total, game_locked, placement, is_winner'

const LEGACY_SCORE_SELECT =
  'id, session_id, owner_user_id, scored_by_user_id, player_name, guest_profile_id, guest_entry_id, duke_slug, score_total, game_locked'

const FULL_SESSION_SELECT = 'id, created_by, join_code, expected_player_count'

const LEGACY_SESSION_SELECT = 'id, created_by, join_code'

function collectUniqueIds(values: (string | null | undefined)[]) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

function buildCompareProgressEntries(entries: CompareEntry[]) {
  return entries.map((entry) => ({
    dukeSlug: entry.dukeSlug,
    isGuest: entry.isGuest,
    locked: entry.locked,
    userId: entry.userId,
    hasScore: entry.hasScore,
  }))
}

function isMissingRankingColumnError(error: { message?: string | null }) {
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

async function loadSessionScoreRows(sessionId: string): Promise<ScoreQueryResult> {
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

  if (!isMissingRankingColumnError(error)) throw error

  const { data: legacyData, error: legacyError } = await supabase
    .from('session_scores')
    .select(LEGACY_SCORE_SELECT)
    .eq('session_id', sessionId)

  if (legacyError) throw legacyError

  const legacyRows = (
    (legacyData ?? []) as Omit<CompareScoreRow, 'placement' | 'is_winner'>[]
  ).map((row) => ({
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

function isMissingExpectedPlayerCountError(error: { message?: string | null }) {
  const message = error.message ?? ''

  return (
    message.includes('expected_player_count') ||
    message.includes('column expected_player_count does not exist')
  )
}

function mergeNotices(...messages: (string | null | undefined)[]) {
  return messages
    .map((message) => String(message ?? '').trim())
    .filter(Boolean)
    .join('\n\n')
}

async function loadCompareSessionRow(sessionId: string): Promise<SessionQueryResult> {
  const { data, error } = await supabase
    .from('game_sessions')
    .select(FULL_SESSION_SELECT)
    .eq('id', sessionId)
    .maybeSingle()

  if (!error) {
    return {
      session: (data ?? null) as SessionRow | null,
      notice: '',
    }
  }

  if (!isMissingExpectedPlayerCountError(error)) {
    throw error
  }

  const { data: legacyData, error: legacyError } = await supabase
    .from('game_sessions')
    .select(LEGACY_SESSION_SELECT)
    .eq('id', sessionId)
    .maybeSingle()

  if (legacyError) throw legacyError

  return {
    session: legacyData
      ? ({
          ...(legacyData as Omit<SessionRow, 'expected_player_count'>),
          expected_player_count: null,
        } as SessionRow)
      : null,
    notice:
      'The compare player target control will appear after the latest database migration is applied.',
  }
}

async function loadProfiles(userIds: string[]) {
  if (userIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, public_player_id')
    .in('id', userIds)

  if (error) throw error

  return (data ?? []) as CompareProfileRow[]
}

async function loadGuestProfiles(guestProfileIds: string[]) {
  if (guestProfileIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('guest_profiles')
    .select('id, display_name, public_player_id')
    .in('id', guestProfileIds)

  if (error) throw error

  return (data ?? []) as CompareGuestProfileRow[]
}

export async function loadCompareDashboardData(
  sessionId: string
): Promise<CompareDashboardData> {
  const [authResult, sessionResponse, scoreResponse, playerResult] = await Promise.all([
    supabase.auth.getUser(),
    loadCompareSessionRow(sessionId),
    loadSessionScoreRows(sessionId),
    supabase
      .from('session_players')
      .select('session_id, user_id')
      .eq('session_id', sessionId),
  ])

  const {
    data: { user },
    error: authError,
  } = authResult

  const { data: playerData, error: playerError } = playerResult

  if (authError) throw authError
  if (playerError) throw playerError

  const safeSession = sessionResponse.session
  const safeScores = scoreResponse.rows
  const safePlayers = (playerData ?? []) as CompareSessionPlayerRow[]
  const userIds = collectUniqueIds([
    ...safeScores.map((row) => row.owner_user_id),
    ...safePlayers.map((row) => row.user_id),
  ])
  const guestProfileIds = collectUniqueIds(
    safeScores.map((row) => row.guest_profile_id)
  )

  const [profiles, guestProfiles] = await Promise.all([
    loadProfiles(userIds),
    loadGuestProfiles(guestProfileIds),
  ])

  const scores = buildCompareEntries({
    scoreRows: safeScores,
    sessionPlayers: safePlayers,
    profiles,
    guestProfiles,
  })
  const progress = buildCompareProgress({
    entries: buildCompareProgressEntries(scores),
    sessionCreatorId: safeSession?.created_by ?? '',
    expectedPlayerCount: safeSession?.expected_player_count,
  })

  return {
    currentUserId: user?.id ?? '',
    isCreator: Boolean(user?.id && safeSession?.created_by === user.id),
    sessionCreatorId: safeSession?.created_by ?? '',
    expectedPlayerCount: progress.totalParticipants,
    loadNotice: mergeNotices(scoreResponse.notice, sessionResponse.notice),
    scores,
  }
}
