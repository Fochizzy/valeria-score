// Route helper for opening the score screen on behalf of a registered player
// the viewer added to the session. Mirrors buildGuestScoreRoute but threads
// the player's user id (so the score row is keyed by owner_user_id) and a
// display name for the screen header.

type BuildAddedPlayerScoreRouteArgs = {
  sessionId: string
  joinCode?: string | null
  addedUserId: string
  addedPlayerName: string
  addedPlayerId?: string | null
}

export function buildAddedPlayerScoreRoute(args: BuildAddedPlayerScoreRouteArgs) {
  return {
    pathname: '/score' as const,
    params: {
      sessionId: args.sessionId,
      joinCode: args.joinCode ?? '',
      addedUserId: args.addedUserId,
      addedPlayerName: args.addedPlayerName,
      addedPlayerId: args.addedPlayerId ?? '',
    },
  }
}
