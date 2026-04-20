import type { StatKey } from './cards'
import { scoreIcons } from './scoreIcons'

export type StatSection = 'resources' | 'equipment' | 'counts' | 'points'

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
    label: 'Hammer',
    section: 'equipment',
    icon: scoreIcons.hammer,
  },
  {
    key: 'helmet',
    label: 'Helmet',
    section: 'equipment',
    icon: scoreIcons.helmet,
  },
  {
    key: 'key',
    label: 'Key',
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
    section: 'points',
    icon: scoreIcons.bossCount,
  },
  {
    key: 'lieutenantCount',
    label: 'Lieutenant',
    section: 'points',
    icon: scoreIcons.lieutenantCount,
  },
  {
    key: 'beastCount',
    label: 'Beast',
    section: 'points',
    icon: scoreIcons.beastCount,
  },
  {
    key: 'minionCount',
    label: 'Minion',
    section: 'points',
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