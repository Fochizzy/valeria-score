export type AnalyticsRouteKey = 'players' | 'dukes' | 'trends' | 'solo'

export type AnalyticsRouteToggleSegment = {
  key: AnalyticsRouteKey
  label: string
  href: '/player-stats' | '/duke-stats' | '/global-trends' | '/solo-stats'
}

export const analyticsRouteHrefByKey: Record<
  AnalyticsRouteKey,
  AnalyticsRouteToggleSegment['href']
> = Object.freeze({
  players: '/player-stats',
  dukes: '/duke-stats',
  trends: '/global-trends',
  solo: '/solo-stats',
})

export function buildAnalyticsRouteToggleSegments(
  current: AnalyticsRouteKey
): AnalyticsRouteToggleSegment[] {
  void current

  return [
    { key: 'players', label: 'Players', href: analyticsRouteHrefByKey.players },
    { key: 'dukes', label: 'Dukes', href: analyticsRouteHrefByKey.dukes },
    { key: 'trends', label: 'Trends', href: analyticsRouteHrefByKey.trends },
    { key: 'solo', label: 'Solo', href: analyticsRouteHrefByKey.solo },
  ]
}
