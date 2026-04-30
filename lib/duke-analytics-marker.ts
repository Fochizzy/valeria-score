import type { StatKey } from '../data/cards.ts'
import { getDukeInputStatLabel } from './duke-input-analytics.ts'

const validStatKeys = new Set<StatKey>([
  'gold',
  'magic',
  'fight',
  'vp',
  'hammer',
  'helmet',
  'key',
  'holy',
  'citizenCount',
  'monstersCount',
  'monsterPoints',
  'bossCount',
  'lieutenantCount',
  'beastCount',
  'minionCount',
  'domainCount',
  'domainPoints',
])

function isStatKey(value: string): value is StatKey {
  return validStatKeys.has(value as StatKey)
}

export function getDukeAnalyticsStatMarker(statKey: string | null | undefined) {
  if (typeof statKey !== 'string') {
    return {
      iconKey: null,
      accessibilityLabel: '',
    }
  }

  const trimmedKey = statKey.trim()

  return {
    iconKey: isStatKey(trimmedKey) ? trimmedKey : null,
    accessibilityLabel: getDukeInputStatLabel(trimmedKey) || trimmedKey,
  }
}
