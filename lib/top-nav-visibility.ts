const PATHS_WITHOUT_BOTTOM_NAV = [
  '/login',
  '/create-user',
  '/reset-password',
  '/choose-player-id',
  '/create-session',
  '/manage-data',
  '/duke-select',
  '/score',
  '/solo-score',
  '/solo-victory-condition',
  '/victory',
  '/game-recap',
]

export function shouldShowBottomNav(pathname: string) {
  if (!pathname || pathname === '/') return false
  return !PATHS_WITHOUT_BOTTOM_NAV.some((blocked) => pathname.startsWith(blocked))
}

export const shouldShowTopNav = shouldShowBottomNav
