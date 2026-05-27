import type { StatKey } from './cards.ts'
import { scoreIcons } from './scoreIcons.ts'

export type StatSection =
  | 'resources'
  | 'equipment'
  | 'monsterSymbols'
  | 'counts'
  | 'points'

export type StatMetaItem = {
  key: StatKey
  label: string
  section: StatSection
  icon: any
}

export const statMeta: StatMetaItem[] = [
  {
    key: 'gold',
    label: 'Gold',
    section: 'resources',
    icon: scoreIcons.gold,
  },
  {
    key: 'magic',
    label: 'Mana',
    section: 'resources',
    icon: scoreIcons.magic,
  },
  {
    key: 'fight',
    label: 'Fight',
    section: 'resources',
    icon: scoreIcons.fight,
  },

  {
    key: 'hammer',
    label: 'Worker Symbol',
    section: 'equipment',
    icon: scoreIcons.hammer,
  },
  {
    key: 'helmet',
    label: 'Solider Symbol',
    section: 'equipment',
    icon: scoreIcons.helmet,
  },
  {
    key: 'key',
    label: 'Shadow Symbol',
    section: 'equipment',
    icon: scoreIcons.key,
  },
  {
    key: 'holy',
    label: 'Holy',
    section: 'equipment',
    icon: scoreIcons.holy,
  },

  {
    key: 'citizenCount',
    label: 'Citizens',
    section: 'counts',
    icon: scoreIcons.citizenCount,
  },
  {
    key: 'monstersCount',
    label: 'Monsters',
    section: 'counts',
    icon: scoreIcons.monstersCount,
  },
  {
    key: 'domainCount',
    label: 'Domains',
    section: 'counts',
    icon: scoreIcons.domainCount,
  },

  {
    key: 'vp',
    label: 'Victory Points',
    section: 'points',
    icon: scoreIcons.vp,
  },
  {
    key: 'monsterPoints',
    label: 'Monster Points',
    section: 'points',
    icon: scoreIcons.monsterPoints,
  },
  {
    key: 'domainPoints',
    label: 'Domain Points',
    section: 'points',
    icon: scoreIcons.domainPoints,
  },
  {
    key: 'bossCount',
    label: 'Boss',
    section: 'monsterSymbols',
    icon: scoreIcons.bossCount,
  },
  {
    key: 'lieutenantCount',
    label: 'Lieutenant',
    section: 'monsterSymbols',
    icon: scoreIcons.lieutenantCount,
  },
  {
    key: 'beastCount',
    label: 'Beast',
    section: 'monsterSymbols',
    icon: scoreIcons.beastCount,
  },
  {
    key: 'minionCount',
    label: 'Minion',
    section: 'monsterSymbols',
    icon: scoreIcons.minionCount,
  },
]

export const statMetaByKey: Record<StatKey, StatMetaItem> = statMeta.reduce(
  (acc, item) => {
    acc[item.key] = item
    return acc
  },
  {} as Record<StatKey, StatMetaItem>
)

export function getStatsForCard(
  multipliers: Record<StatKey, number>,
  section?: StatSection
) {
  return statMeta.filter((item) => {
    const visible = (multipliers[item.key] ?? 0) > 0
    if (!visible) return false
    if (!section) return true
    return item.section === section
  })
}
