type BuildGuestScoreRouteArgs = {
  sessionId: string
  joinCode?: string | null
  guestName: string
  guestProfileId: string
  guestEntryId: string
}

export function buildGuestScoreRoute(args: BuildGuestScoreRouteArgs) {
  return {
    pathname: '/score' as const,
    params: {
      sessionId: args.sessionId,
      joinCode: args.joinCode ?? '',
      guestMode: '1',
      guestName: args.guestName,
      guestProfileId: args.guestProfileId,
      guestEntryId: args.guestEntryId,
    },
  }
}
