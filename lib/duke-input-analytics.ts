import type { StatKey } from '../data/cards.ts'

type NumericValue = number | string | null | undefined

const profileLabelByKey: Record<StatKey, string> = {
  gold: 'Gold',
  magic: 'Mana',
  fight: 'Fight',
  vp: 'Victory Points',
  hammer: 'Hammer Symbols',
  helmet: 'Helmet Symbols',
  key: 'Key Symbols',
  holy: 'Holy Symbols',
  citizenCount: 'Citizens',
  monstersCount: 'Monsters',
  monsterPoints: 'Monster Points',
  bossCount: 'Boss',
  lieutenantCount: 'Lieutenant',
  beastCount: 'Beast',
  minionCount: 'Minion',
  domainCount: 'Domains',
  domainPoints: 'Domain Points',
}

export function getDukeInputStatLabel(statKey: string | null | undefined) {
  if (typeof statKey !== 'string') return ''
  return profileLabelByKey[statKey as StatKey] ?? ''
}

export type ScoreFamilyKey =
  | 'resource_conversion'
  | 'equipment'
  | 'citizens'
  | 'monsters'
  | 'domains'
  | 'direct_vp'

export type ScoreFamilyRow = {
  family_key: ScoreFamilyKey
  label: string
  points_share: number
  avg_points_generated: number
}

export type GlobalGameMarginBucket = 'lte_3' | 'lte_5'

export type RawGlobalInputProfileRow = {
  stat_key: string | null
  profile_scope?: string | null
  games_sample: NumericValue
  avg_input: NumericValue
  avg_points_generated: NumericValue
  points_share: NumericValue
}

export type RawGlobalGameMarginRow = {
  margin_bucket: string | null
  tables_sample: NumericValue
  tables_with_margin: NumericValue
  share_percentage: NumericValue
}

export type GlobalGameMarginRow = {
  margin_bucket: GlobalGameMarginBucket
  label: string
  tables_sample: number
  tables_with_margin: number
  share_percentage: number
}

const scoreFamilyByKey: Record<StatKey, ScoreFamilyKey> = {
  gold: 'resource_conversion',
  magic: 'resource_conversion',
  fight: 'resource_conversion',
  vp: 'direct_vp',
  hammer: 'equipment',
  helmet: 'equipment',
  key: 'equipment',
  holy: 'equipment',
  citizenCount: 'citizens',
  monstersCount: 'monsters',
  monsterPoints: 'monsters',
  bossCount: 'monsters',
  lieutenantCount: 'monsters',
  beastCount: 'monsters',
  minionCount: 'monsters',
  domainCount: 'domains',
  domainPoints: 'domains',
}

const scoreFamilyLabels: Record<ScoreFamilyKey, string> = {
  resource_conversion: 'Resource Conversion',
  equipment: 'Symbols',
  citizens: 'Citizens',
  monsters: 'Monsters',
  domains: 'Domains',
  direct_vp: 'Direct VP',
}

const resourceStatKeys: StatKey[] = ['gold', 'magic', 'fight', 'key']
const monsterStatKeys: StatKey[] = [
  'monstersCount',
  'monsterPoints',
  'bossCount',
  'lieutenantCount',
  'beastCount',
  'minionCount',
]
const domainStatKeys: StatKey[] = ['domainCount', 'domainPoints']
const marginLabels: Record<GlobalGameMarginBucket, string> = {
  // Buckets are cumulative — every game ≤3 pts is also counted in ≤5 pts.
  // The "or closer" suffix makes that obvious to readers.
  lte_3: '≤3 pts or closer',
  lte_5: '≤5 pts or closer',
}

export type DukeInputProfileScope = 'all_games' | 'winning_games'

export type RawDukeInputProfileRow = {
  duke_slug: string | null
  stat_key: string | null
  profile_scope: string | null
  games_sample: NumericValue
  avg_input: NumericValue
  avg_points_generated: NumericValue
  points_share: NumericValue
  global_points_share: NumericValue
  share_delta_vs_global: NumericValue
}

export type DukeInputProfileRow = {
  duke_slug: string
  stat_key: StatKey
  label: string
  profile_scope: DukeInputProfileScope
  games_sample: number
  avg_input: number
  avg_points_generated: number
  points_share: number
  global_points_share: number
  share_delta_vs_global: number
}

function toNumber(value: NumericValue) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }

  return 0
}

function isProfileScope(value: string | null | undefined): value is DukeInputProfileScope {
  return value === 'all_games' || value === 'winning_games'
}

function isStatKey(value: string | null | undefined): value is StatKey {
  return typeof value === 'string' && value in profileLabelByKey
}

function compareRowsByPointsShare(a: DukeInputProfileRow, b: DukeInputProfileRow) {
  if (b.points_share !== a.points_share) return b.points_share - a.points_share
  return a.label.localeCompare(b.label)
}

function compareFamilyRowsByPointsShare(a: ScoreFamilyRow, b: ScoreFamilyRow) {
  if (b.points_share !== a.points_share) return b.points_share - a.points_share
  return a.label.localeCompare(b.label)
}

function compareRowsByStatKeyOrder(
  a: DukeInputProfileRow,
  b: DukeInputProfileRow,
  statKeys: StatKey[]
) {
  const leftIndex = statKeys.indexOf(a.stat_key)
  const rightIndex = statKeys.indexOf(b.stat_key)

  if (leftIndex !== rightIndex) return leftIndex - rightIndex
  return a.label.localeCompare(b.label)
}

function selectRowsByStatKeys(rows: DukeInputProfileRow[], statKeys: StatKey[]) {
  return rows
    .filter((row) => statKeys.includes(row.stat_key))
    .sort((left, right) => compareRowsByStatKeyOrder(left, right, statKeys))
}

function isMarginBucket(value: string | null | undefined): value is GlobalGameMarginBucket {
  return value === 'lte_3' || value === 'lte_5'
}

export function resolveDukeInputProfileRows(
  rows: RawDukeInputProfileRow[]
): DukeInputProfileRow[] {
  return rows
    .filter((row) => isStatKey(row.stat_key) && isProfileScope(row.profile_scope))
    .map((row) => ({
      duke_slug: String(row.duke_slug ?? '').trim(),
      stat_key: row.stat_key as StatKey,
      label: getDukeInputStatLabel(row.stat_key),
      profile_scope: row.profile_scope as DukeInputProfileScope,
      games_sample: toNumber(row.games_sample),
      avg_input: toNumber(row.avg_input),
      avg_points_generated: toNumber(row.avg_points_generated),
      points_share: toNumber(row.points_share),
      global_points_share: toNumber(row.global_points_share),
      share_delta_vs_global: toNumber(row.share_delta_vs_global),
    }))
}

export function resolveGlobalInputProfileRows(rows: RawGlobalInputProfileRow[]) {
  return resolveDukeInputProfileRows(
    rows.map((row) => ({
      duke_slug: '__global__',
      stat_key: row.stat_key,
      profile_scope: row.profile_scope ?? 'all_games',
      games_sample: row.games_sample,
      avg_input: row.avg_input,
      avg_points_generated: row.avg_points_generated,
      points_share: row.points_share,
      global_points_share: row.points_share,
      share_delta_vs_global: 0,
    }))
  )
}

export function resolveGlobalGameMarginRows(rows: RawGlobalGameMarginRow[]): GlobalGameMarginRow[] {
  return rows
    .filter((row) => isMarginBucket(row.margin_bucket))
    .map((row) => ({
      margin_bucket: row.margin_bucket as GlobalGameMarginBucket,
      label: marginLabels[row.margin_bucket as GlobalGameMarginBucket],
      tables_sample: toNumber(row.tables_sample),
      tables_with_margin: toNumber(row.tables_with_margin),
      share_percentage: toNumber(row.share_percentage),
    }))
    .sort((left, right) => left.label.localeCompare(right.label))
}

export function buildScoreFamilyRows(rows: DukeInputProfileRow[]): ScoreFamilyRow[] {
  const familyRows = new Map<ScoreFamilyKey, ScoreFamilyRow>()

  for (const row of rows) {
    const familyKey = scoreFamilyByKey[row.stat_key]
    const current = familyRows.get(familyKey) ?? {
      family_key: familyKey,
      label: scoreFamilyLabels[familyKey],
      points_share: 0,
      avg_points_generated: 0,
    }

    current.points_share += row.points_share
    current.avg_points_generated += row.avg_points_generated
    familyRows.set(familyKey, current)
  }

  return [...familyRows.values()]
    .map((row) => ({
      ...row,
      points_share: Number(row.points_share.toFixed(1)),
      avg_points_generated: Number(row.avg_points_generated.toFixed(1)),
    }))
    .sort(compareFamilyRowsByPointsShare)
}

export function buildInputBreakdownSections(rows: DukeInputProfileRow[]) {
  return {
    familyRows: buildScoreFamilyRows(rows),
    resourceRows: selectRowsByStatKeys(rows, resourceStatKeys),
    monsterRows: selectRowsByStatKeys(rows, monsterStatKeys),
    domainRows: selectRowsByStatKeys(rows, domainStatKeys),
  }
}

export function buildDukeInputProfileState(
  rows: DukeInputProfileRow[],
  minimumWinningSample = 3
) {
  const usualRows = rows
    .filter((row) => row.profile_scope === 'all_games')
    .sort(compareRowsByPointsShare)
  const winningRows = rows
    .filter((row) => row.profile_scope === 'winning_games')
    .sort(compareRowsByPointsShare)
  const sections = buildInputBreakdownSections(usualRows)

  const winningSample = winningRows[0]?.games_sample ?? 0
  const canShowWinningProfile = winningSample >= minimumWinningSample

  return {
    ...sections,
    usualRows,
    winningRows: canShowWinningProfile ? winningRows : [],
    canShowWinningProfile,
    insightLines: canShowWinningProfile
      ? winningRows
          .filter((row) => row.share_delta_vs_global > 0)
          .slice(0, 3)
          .map(
            (row) =>
              `${row.label} is ${row.share_delta_vs_global.toFixed(1)} pts above the global share in wins`
          )
      : [],
  }
}
