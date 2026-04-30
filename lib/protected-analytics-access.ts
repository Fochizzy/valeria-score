export type ProtectedAnalyticsPath =
  | '/player-stats'
  | '/duke-stats'
  | '/global-trends'
  | '/profile'

export type ProtectedAnalyticsSessionSnapshot =
  | {
      access_token?: string | null
      user?: {
        id?: string | null
      } | null
    }
  | null
  | undefined

export type ProtectedAnalyticsAccessState =
  | {
      canLoad: true
      actionPath: ProtectedAnalyticsPath
    }
  | {
      canLoad: false
      title: string
      body: string
      actionLabel: 'Go to Login'
      actionPath: '/login'
    }

const BLOCKED_COPY: Record<
  ProtectedAnalyticsPath,
  Pick<ProtectedAnalyticsAccessState & { canLoad: false }, 'title' | 'body'>
> = {
  '/player-stats': {
    title: 'Sign in to view player stats',
    body: 'Global player leaderboards and duke breakdowns are only available after you sign in.',
  },
  '/duke-stats': {
    title: 'Sign in to view duke stats',
    body: 'Global duke analytics and matchup trends are only available after you sign in.',
  },
  '/global-trends': {
    title: 'Sign in to view global trends',
    body: 'Meta snapshots, tier lists, and game-shape charts are only available after you sign in.',
  },
  '/profile': {
    title: 'Sign in to view your profile',
    body: 'Your history, dashboard summary, and shared guest cards are only available after you sign in.',
  },
}

export function buildProtectedAnalyticsAccessState(
  path: ProtectedAnalyticsPath,
  viewerUserId: string | null | undefined
): ProtectedAnalyticsAccessState {
  if (typeof viewerUserId === 'string' && viewerUserId.trim().length > 0) {
    return {
      canLoad: true,
      actionPath: path,
    }
  }

  return {
    canLoad: false,
    ...BLOCKED_COPY[path],
    actionLabel: 'Go to Login',
    actionPath: '/login',
  }
}

export function resolveProtectedAnalyticsViewerUserId(
  session: ProtectedAnalyticsSessionSnapshot
) {
  const accessToken =
    typeof session?.access_token === 'string' ? session.access_token.trim() : ''
  const viewerUserId = typeof session?.user?.id === 'string' ? session.user.id.trim() : ''

  if (!accessToken || !viewerUserId) {
    return null
  }

  return viewerUserId
}
