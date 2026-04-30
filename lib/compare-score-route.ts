import { buildAddedPlayerScoreRoute } from './added-player-score-route.ts'
import type { CompareEntry } from './compare-entries'
import { buildGuestScoreRoute } from './guest-score-route.ts'

type CompareScoreRouteContext = {
  sessionId: string
  joinCode?: string | null
  currentUserId?: string | null
}

export function buildCompareEntryScoreRoute(
  entry: CompareEntry,
  context: CompareScoreRouteContext
) {
  const safeCurrentUserId = String(context.currentUserId ?? '').trim()
  // For Phase 1+ rows the editor is scoredByUserId; legacy rows fall back
  // to userId (which equalled scoredByUserId before the split).
  const safeEditorUserId = String(entry.scoredByUserId ?? entry.userId ?? '').trim()

  if (!safeCurrentUserId) {
    return null
  }

  // True guest rows (added via addGuestPlayerToSession) — they carry both a
  // guest profile reference and a guest entry id. Editable by whoever added
  // them (scoredByUserId). The "guest status" rule lives here: guests are not
  // tied to a logged-in user, so the adder retains edit rights.
  if (entry.guestProfileId && entry.guestEntryId) {
    if (safeEditorUserId !== safeCurrentUserId) return null

    return buildGuestScoreRoute({
      sessionId: context.sessionId,
      joinCode: context.joinCode ?? '',
      guestName: entry.label,
      guestProfileId: entry.guestProfileId,
      guestEntryId: entry.guestEntryId,
    })
  }

  // Self-played: viewer is also the linked player. This also covers the
  // case where a player was added on their behalf and has now joined the
  // session — the auto-merge trigger flips scoredByUserId to them, so the
  // adder no longer matches and only the linked player can edit.
  if (entry.userId && entry.userId === safeCurrentUserId) {
    return {
      pathname: '/score' as const,
      params: {
        sessionId: context.sessionId,
        joinCode: context.joinCode ?? '',
      },
    }
  }

  // Added-player path: the viewer added a registered player to this session
  // (either via add_player_to_session, which leaves player_name set but no
  // guest_entry_id, or any other "added on behalf" flow). The viewer is
  // the row's editor (scoredByUserId) but the linked player is someone
  // else, so we route to score-on-behalf mode.
  //
  // This deliberately also matches rows where entry.isGuest is true (because
  // player_name is set on add_player_to_session inserts). Those rows have an
  // owner_user_id pointing at the linked player and no guest profile/entry,
  // so they should behave like added players, not guests. Once the linked
  // player joins the session the auto-merge trigger flips scoredByUserId to
  // them and this branch stops matching for the original adder — they can no
  // longer edit, only the now-logged-in player can (via the self-played
  // branch above).
  if (entry.userId && safeEditorUserId === safeCurrentUserId) {
    return buildAddedPlayerScoreRoute({
      sessionId: context.sessionId,
      joinCode: context.joinCode ?? '',
      addedUserId: entry.userId,
      addedPlayerName: entry.label,
      addedPlayerId: entry.playerId,
    })
  }

  return null
}
