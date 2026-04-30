type ScoreScreenSection =
  | 'resources'
  | 'equipment'
  | 'monsterSymbols'
  | 'counts'
  | 'points'

type ScoreScreenStatItem = {
  key: string
  section: ScoreScreenSection
}

const RESOURCE_ORDER = ['gold', 'fight', 'magic', 'vp']

function getScoreScreenSection<T extends ScoreScreenStatItem>(item: T): ScoreScreenSection {
  if (item.key === 'vp') {
    return 'resources'
  }

  return item.section
}

function sortResourceStats<T extends ScoreScreenStatItem>(items: T[]) {
  const orderMap = new Map(RESOURCE_ORDER.map((key, index) => [key, index]))

  return [...items].sort((left, right) => {
    const leftIndex = orderMap.get(left.key) ?? Number.MAX_SAFE_INTEGER
    const rightIndex = orderMap.get(right.key) ?? Number.MAX_SAFE_INTEGER
    return leftIndex - rightIndex
  })
}

export function groupScoreScreenStats<T extends ScoreScreenStatItem>(items: T[]) {
  const grouped = {
    resources: [] as T[],
    equipment: [] as T[],
    monsterSymbols: [] as T[],
    counts: [] as T[],
    points: [] as T[],
  }

  items.forEach((item) => {
    grouped[getScoreScreenSection(item)].push(item)
  })

  return {
    ...grouped,
    resources: sortResourceStats(grouped.resources),
  }
}
