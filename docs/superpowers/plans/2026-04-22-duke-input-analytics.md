# Duke Input Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add input-derived duke analytics to `Duke Stats`, including compact card teasers plus an in-place selected-duke panel that compares usual scoring against winning-profile scoring.

**Architecture:** Extend the Supabase analytics refresh with a private duke-rules source, a normalized public input-profile table, and teaser columns on `duke_global_stats`. Keep the React screen lean by pushing selection/fallback rules into small pure `lib/` helpers and rendering the selected-duke comparison in a dedicated component.

**Tech Stack:** Expo Router, React Native, TypeScript, Supabase SQL migrations, Node built-in test runner

---

## File Map

- Create: `supabase/migrations/20260422180000_duke_input_analytics.sql`
  Responsibility: add `private.duke_score_rules`, `public.duke_input_stat_profiles`, teaser columns on `public.duke_global_stats`, and extend `private.rebuild_public_analytics()`.

- Create: `lib/duke-input-analytics-sql.test.js`
  Responsibility: lock the migration contract for new tables, teaser columns, JSON expansion, and RLS.

- Create: `lib/duke-input-analytics.ts`
  Responsibility: normalize `duke_input_stat_profiles` rows and build the selected-duke comparison state plus plain-language win insights.

- Create: `lib/duke-input-analytics.test.js`
  Responsibility: cover sorting, min-win gating, and insight generation.

- Modify: `lib/duke-stats-data.ts`
  Responsibility: normalize teaser fields returned from `duke_global_stats`.

- Modify: `lib/duke-stats-data.test.js`
  Responsibility: cover teaser fallback/default behavior.

- Create: `lib/duke-stats-screen-state.ts`
  Responsibility: keep selected-duke resolution and detail-panel fallback rules out of the React screen.

- Create: `lib/duke-stats-screen-state.test.js`
  Responsibility: cover default selection, reselection after filtering, and detail error fallback.

- Create: `components/DukeInputProfilePanel.tsx`
  Responsibility: render the selected-duke header, usual scoring rows, winning profile rows, and win-delta callouts.

- Modify: `app/duke-stats.tsx`
  Responsibility: fetch teaser/detail data, keep selection stable, render card teasers, and mount the selected-duke panel.

Use path-limited commits throughout because this workspace already contains unrelated staged and unstaged changes.

### Task 1: Add the selected-duke input analytics helper

**Files:**
- Create: `lib/duke-input-analytics.ts`
- Create: `lib/duke-input-analytics.test.js`

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildDukeInputProfileState,
  resolveDukeInputProfileRows,
} from './duke-input-analytics.ts'

const sampleRows = [
  {
    duke_slug: 'cornelius_the_dreamer',
    stat_key: 'domainPoints',
    profile_scope: 'all_games',
    games_sample: '8',
    avg_input: '3.2',
    avg_points_generated: '11.5',
    points_share: '26.4',
    global_points_share: '18.1',
    share_delta_vs_global: '8.3',
  },
  {
    duke_slug: 'cornelius_the_dreamer',
    stat_key: 'monsterPoints',
    profile_scope: 'all_games',
    games_sample: '8',
    avg_input: '5',
    avg_points_generated: '9.8',
    points_share: '22.5',
    global_points_share: '24.2',
    share_delta_vs_global: '-1.7',
  },
  {
    duke_slug: 'cornelius_the_dreamer',
    stat_key: 'domainPoints',
    profile_scope: 'winning_games',
    games_sample: '4',
    avg_input: '4.1',
    avg_points_generated: '15.2',
    points_share: '31.7',
    global_points_share: '18.1',
    share_delta_vs_global: '13.6',
  },
  {
    duke_slug: 'cornelius_the_dreamer',
    stat_key: 'monsterPoints',
    profile_scope: 'winning_games',
    games_sample: '4',
    avg_input: '4.3',
    avg_points_generated: '8.4',
    points_share: '17.5',
    global_points_share: '24.2',
    share_delta_vs_global: '-6.7',
  },
]

test('resolveDukeInputProfileRows normalizes numeric values and sorts each scope by points share', () => {
  const rows = resolveDukeInputProfileRows(sampleRows)

  assert.equal(rows[0].label, 'Domain Points')
  assert.equal(rows[0].points_share, 31.7)
  assert.equal(rows[0].profile_scope, 'winning_games')
  assert.equal(rows[1].label, 'Domain Points')
  assert.equal(rows[1].profile_scope, 'all_games')
})

test('buildDukeInputProfileState exposes both sections and plain-language insights when wins meet the threshold', () => {
  const state = buildDukeInputProfileState(resolveDukeInputProfileRows(sampleRows), 3)

  assert.equal(state.canShowWinningProfile, true)
  assert.equal(state.usualRows[0].label, 'Domain Points')
  assert.equal(state.winningRows[0].label, 'Domain Points')
  assert.match(state.insightLines[0], /Domain Points/i)
})

test('buildDukeInputProfileState hides winner comparisons below the minimum winning sample', () => {
  const state = buildDukeInputProfileState(
    resolveDukeInputProfileRows(
      sampleRows.map((row) =>
        row.profile_scope === 'winning_games'
          ? {
              ...row,
              games_sample: '2',
            }
          : row
      )
    ),
    3
  )

  assert.equal(state.canShowWinningProfile, false)
  assert.deepEqual(state.insightLines, [])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/duke-input-analytics.test.js`
Expected: FAIL with module-not-found or missing export errors because `lib/duke-input-analytics.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
import type { StatKey } from '../data/cards'
import { statMetaByKey } from '../data/statMeta'

type NumericValue = number | string | null | undefined

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
  return Boolean(value && statMetaByKey[value as StatKey])
}

function compareRows(a: DukeInputProfileRow, b: DukeInputProfileRow) {
  if (a.profile_scope !== b.profile_scope) {
    return a.profile_scope === 'winning_games' ? -1 : 1
  }
  if (b.points_share !== a.points_share) return b.points_share - a.points_share
  return a.label.localeCompare(b.label)
}

export function resolveDukeInputProfileRows(
  rows: RawDukeInputProfileRow[]
): DukeInputProfileRow[] {
  return rows
    .filter((row) => isStatKey(row.stat_key) && isProfileScope(row.profile_scope))
    .map((row) => ({
      duke_slug: String(row.duke_slug ?? '').trim(),
      stat_key: row.stat_key as StatKey,
      label: statMetaByKey[row.stat_key as StatKey].label,
      profile_scope: row.profile_scope as DukeInputProfileScope,
      games_sample: toNumber(row.games_sample),
      avg_input: toNumber(row.avg_input),
      avg_points_generated: toNumber(row.avg_points_generated),
      points_share: toNumber(row.points_share),
      global_points_share: toNumber(row.global_points_share),
      share_delta_vs_global: toNumber(row.share_delta_vs_global),
    }))
    .sort(compareRows)
}

export function buildDukeInputProfileState(
  rows: DukeInputProfileRow[],
  minimumWinningSample = 3
) {
  const usualRows = rows.filter((row) => row.profile_scope === 'all_games')
  const winningRows = rows.filter((row) => row.profile_scope === 'winning_games')
  const winningSample = winningRows[0]?.games_sample ?? 0
  const canShowWinningProfile = winningSample >= minimumWinningSample

  return {
    usualRows,
    winningRows: canShowWinningProfile ? winningRows : [],
    canShowWinningProfile,
    insightLines: canShowWinningProfile
      ? winningRows
          .filter((row) => row.share_delta_vs_global > 0)
          .sort((a, b) => b.share_delta_vs_global - a.share_delta_vs_global)
          .slice(0, 3)
          .map(
            (row) =>
              `${row.label} is ${row.share_delta_vs_global.toFixed(1)} pts above the global share in wins`
          )
      : [],
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test lib/duke-input-analytics.test.js`
Expected: PASS with 3 tests passing.

- [ ] **Step 5: Commit**

```bash
git add lib/duke-input-analytics.ts lib/duke-input-analytics.test.js
git commit --only -m "feat: add duke input analytics helper" -- lib/duke-input-analytics.ts lib/duke-input-analytics.test.js
```

### Task 2: Extend Supabase analytics for duke input profiles and teaser fields

**Files:**
- Create: `supabase/migrations/20260422180000_duke_input_analytics.sql`
- Create: `lib/duke-input-analytics-sql.test.js`

- [ ] **Step 1: Write the failing migration-contract test**

```js
const fs = require('fs')
const path = require('path')
const process = require('node:process')
const test = require('node:test')
const assert = require('node:assert/strict')

const migrationPath = path.join(
  process.cwd(),
  'supabase',
  'migrations',
  '20260422180000_duke_input_analytics.sql'
)

function readMigration() {
  assert.ok(fs.existsSync(migrationPath), `Expected migration at ${migrationPath}`)
  return fs.readFileSync(migrationPath, 'utf8')
}

test('creates duke input analytics tables and teaser columns', () => {
  const migration = readMigration()

  assert.match(migration, /create table private\.duke_score_rules\b/i)
  assert.match(migration, /create table public\.duke_input_stat_profiles\b/i)
  assert.match(
    migration,
    /alter table public\.duke_global_stats[\s\S]*add column if not exists top_input_stat_key text/i
  )
  assert.match(
    migration,
    /alter table public\.duke_global_stats[\s\S]*add column if not exists winner_edge_delta numeric/i
  )
})

test('expands session input json and secures the public profile table', () => {
  const migration = readMigration()

  assert.match(migration, /jsonb_each/i)
  assert.match(migration, /alter table public\.duke_input_stat_profiles enable row level security/i)
  assert.match(migration, /create policy duke_input_stat_profiles_select_authenticated/i)
  assert.match(
    migration,
    /grant select on public\.duke_input_stat_profiles to authenticated, service_role/i
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test lib/duke-input-analytics-sql.test.js`
Expected: FAIL because the migration file does not exist yet.

- [ ] **Step 3: Write the migration**

```sql
create table private.duke_score_rules (
  duke_slug text not null,
  stat_key text not null,
  multiplier numeric(10, 2) not null,
  scoring_mode text not null check (scoring_mode in ('multiply', 'divide_floor', 'none')),
  primary key (duke_slug, stat_key)
);

insert into private.duke_score_rules (duke_slug, stat_key, multiplier, scoring_mode)
values
  ('aguilar_the_gilded_knight', 'gold', 3, 'divide_floor'),
  ('aguilar_the_gilded_knight', 'magic', 3, 'divide_floor'),
  ('aguilar_the_gilded_knight', 'fight', 3, 'divide_floor'),
  ('aguilar_the_gilded_knight', 'vp', 1, 'multiply'),
  ('aguilar_the_gilded_knight', 'monstersCount', 1, 'multiply'),
  ('aguilar_the_gilded_knight', 'monsterPoints', 1, 'multiply'),
  ('aguilar_the_gilded_knight', 'domainCount', 2, 'multiply'),
  ('aguilar_the_gilded_knight', 'domainPoints', 1, 'multiply'),
  ('cornelius_the_dreamer', 'gold', 3, 'divide_floor'),
  ('cornelius_the_dreamer', 'magic', 3, 'divide_floor'),
  ('cornelius_the_dreamer', 'fight', 3, 'divide_floor'),
  ('cornelius_the_dreamer', 'vp', 1, 'multiply'),
  ('cornelius_the_dreamer', 'monsterPoints', 1, 'multiply'),
  ('cornelius_the_dreamer', 'domainCount', 2, 'multiply'),
  ('cornelius_the_dreamer', 'domainPoints', 1, 'multiply');

create table public.duke_input_stat_profiles (
  duke_slug text not null,
  stat_key text not null,
  profile_scope text not null check (profile_scope in ('all_games', 'winning_games')),
  games_sample integer not null default 0,
  avg_input numeric(10, 2) not null default 0,
  avg_points_generated numeric(10, 2) not null default 0,
  points_share numeric(10, 2) not null default 0,
  global_points_share numeric(10, 2) not null default 0,
  share_delta_vs_global numeric(10, 2) not null default 0,
  primary key (duke_slug, stat_key, profile_scope)
);

alter table public.duke_global_stats
  add column if not exists top_input_stat_key text,
  add column if not exists top_input_label text,
  add column if not exists top_input_points_share numeric(10, 2) not null default 0,
  add column if not exists winner_edge_stat_key text,
  add column if not exists winner_edge_label text,
  add column if not exists winner_edge_delta numeric(10, 2) not null default 0;

with analytics_rows as (
  select
    rs.id,
    rs.duke_slug,
    rs.is_winner,
    rs.total_score,
    ss.inputs
  from ranked_scores rs
  join public.session_scores ss
    on ss.id = rs.id
),
input_rows as (
  select
    ar.duke_slug,
    ar.is_winner,
    ar.total_score,
    entry.key::text as stat_key,
    (entry.value)::numeric as input_value,
    rules.multiplier,
    rules.scoring_mode,
    case
      when rules.scoring_mode = 'divide_floor' and rules.multiplier > 0
        then floor((entry.value)::numeric / rules.multiplier)
      when rules.scoring_mode = 'multiply'
        then (entry.value)::numeric * rules.multiplier
      else 0
    end as points_generated
  from analytics_rows ar
  cross join lateral jsonb_each(coalesce(ar.inputs, '{}'::jsonb)) entry
  join private.duke_score_rules rules
    on rules.duke_slug = ar.duke_slug
   and rules.stat_key = entry.key
),
profile_input_rows as (
  select
    duke_slug,
    stat_key,
    'all_games'::text as profile_scope,
    input_value,
    points_generated,
    total_score
  from input_rows

  union all

  select
    duke_slug,
    stat_key,
    'winning_games'::text as profile_scope,
    input_value,
    points_generated,
    total_score
  from input_rows
  where is_winner
),
profile_rollup as (
  select
    duke_slug,
    stat_key,
    profile_scope,
    count(*)::int as games_sample,
    round(avg(input_value), 2) as avg_input,
    round(avg(points_generated), 2) as avg_points_generated,
    round(
      avg(
        case
          when total_score > 0 then (points_generated / total_score::numeric) * 100
          else 0
        end
      ),
      2
    ) as points_share
  from profile_input_rows
  group by duke_slug, stat_key, profile_scope
),
global_profile_rollup as (
  select
    stat_key,
    profile_scope,
    round(
      avg(
        case
          when total_score > 0 then (points_generated / total_score::numeric) * 100
          else 0
        end
      ),
      2
    ) as points_share
  from profile_input_rows
  group by stat_key, profile_scope
)
insert into public.duke_input_stat_profiles (
  duke_slug,
  stat_key,
  profile_scope,
  games_sample,
  avg_input,
  avg_points_generated,
  points_share,
  global_points_share,
  share_delta_vs_global
)
select
  pr.duke_slug,
  pr.stat_key,
  pr.profile_scope,
  pr.games_sample,
  pr.avg_input,
  pr.avg_points_generated,
  pr.points_share,
  gp.points_share as global_points_share,
  round(pr.points_share - gp.points_share, 2) as share_delta_vs_global
from profile_rollup pr
join global_profile_rollup gp
  on gp.stat_key = pr.stat_key
 and gp.profile_scope = pr.profile_scope;

alter table public.duke_input_stat_profiles enable row level security;

create policy duke_input_stat_profiles_select_authenticated
on public.duke_input_stat_profiles
for select
to authenticated
using (true);

grant select on public.duke_input_stat_profiles to authenticated, service_role;
```

Use the existing ranked-score rebuild as the base for this migration rather than creating a second analytics function. Mirror every non-zero duke multiplier row from `data/cards.ts` into `private.duke_score_rules`, then derive teaser columns from the largest `all_games` points share and the largest positive `winning_games` delta.

- [ ] **Step 4: Run migration tests**

Run: `node --test lib/duke-input-analytics-sql.test.js lib/secure-analytics-rollups.test.js`
Expected: PASS with the new migration contract covered and the older analytics test still green.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260422180000_duke_input_analytics.sql lib/duke-input-analytics-sql.test.js
git commit --only -m "feat: add duke input analytics sql" -- supabase/migrations/20260422180000_duke_input_analytics.sql lib/duke-input-analytics-sql.test.js
```

### Task 3: Normalize teaser data and extract duke screen-state helpers

**Files:**
- Modify: `lib/duke-stats-data.ts`
- Modify: `lib/duke-stats-data.test.js`
- Create: `lib/duke-stats-screen-state.ts`
- Create: `lib/duke-stats-screen-state.test.js`

- [ ] **Step 1: Write the failing tests**

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveDukeStatsRows } from './duke-stats-data.ts'
import {
  buildDukeDetailPanelState,
  resolveSelectedDukeSlug,
} from './duke-stats-screen-state.ts'

test('resolveDukeStatsRows defaults missing teaser fields without breaking current duke stats', () => {
  const [row] = resolveDukeStatsRows([
    {
      duke_slug: 'cornelius_the_dreamer',
      games_played: 8,
      avg_score: 63.1,
      avg_score_per_player: 21,
      win_percentage: 54.3,
      second_percentage: 22.1,
      third_percentage: 11.5,
      best_score: 79,
      most_wins_player_type: 'user',
      most_wins_player_key: 'user-1',
      most_wins_player_name: 'Izzy',
      wins_with_duke: 4,
      best_avg_player_type: 'guest',
      best_avg_player_key: 'guest-1',
      best_avg_player_name: 'Mara',
      avg_with_duke: 68.2,
      top_input_stat_key: null,
      top_input_label: null,
      top_input_points_share: null,
      winner_edge_stat_key: null,
      winner_edge_label: null,
      winner_edge_delta: null,
    },
  ])

  assert.equal(row.top_input_label, '')
  assert.equal(row.top_input_points_share, 0)
  assert.equal(row.winner_edge_delta, 0)
})

test('resolveSelectedDukeSlug keeps the active duke when it still exists after filtering', () => {
  const slug = resolveSelectedDukeSlug('cornelius_the_dreamer', [
    { duke_slug: 'cornelius_the_dreamer' },
    { duke_slug: 'aguilar_the_gilded_knight' },
  ])

  assert.equal(slug, 'cornelius_the_dreamer')
})

test('buildDukeDetailPanelState keeps the list usable when detail data fails', () => {
  const state = buildDukeDetailPanelState({
    selectedSlug: 'cornelius_the_dreamer',
    detailError: 'Network down',
    detailLoading: false,
    profileRows: [],
  })

  assert.equal(state.showRetry, true)
  assert.match(state.message ?? '', /Network down/)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test lib/duke-stats-data.test.js lib/duke-stats-screen-state.test.js`
Expected: FAIL because teaser fields and screen-state helpers do not exist yet.

- [ ] **Step 3: Implement teaser normalization and screen-state helpers**

```ts
export type DukeStatsRow = {
  duke_slug: string
  games_played: number
  avg_score: number
  avg_score_per_player: number
  win_percentage: number
  second_percentage: number
  third_percentage: number
  best_score: number
  most_wins_player_type: DukeStatsPlayerType
  most_wins_player_key: string | null
  most_wins_player_name?: string | null
  wins_with_duke: number | null
  best_avg_player_type: DukeStatsPlayerType
  best_avg_player_key: string | null
  best_avg_player_name?: string | null
  avg_with_duke: number | null
  top_input_stat_key?: string | null
  top_input_label?: string | null
  top_input_points_share?: number | null
  winner_edge_stat_key?: string | null
  winner_edge_label?: string | null
  winner_edge_delta?: number | null
}

export type ResolvedDukeStatsRow = DukeStatsRow & {
  most_wins_player_name: string
  best_avg_player_name: string
  duke_name: string
  top_input_label: string
  top_input_points_share: number
  winner_edge_label: string
  winner_edge_delta: number
}

export function resolveDukeStatsRows(rows: DukeStatsRow[]): ResolvedDukeStatsRow[] {
  return rows.map((row) => ({
    ...row,
    most_wins_player_name: resolvePlayerName(
      row.most_wins_player_name,
      row.most_wins_player_type
    ),
    best_avg_player_name: resolvePlayerName(
      row.best_avg_player_name,
      row.best_avg_player_type
    ),
    duke_name: formatDukeName(row.duke_slug),
    top_input_label: normalizeName(row.top_input_label),
    top_input_points_share: Number(row.top_input_points_share ?? 0),
    winner_edge_label: normalizeName(row.winner_edge_label),
    winner_edge_delta: Number(row.winner_edge_delta ?? 0),
  }))
}
```

```ts
type SelectableDuke = {
  duke_slug: string
}

type BuildDukeDetailPanelStateInput = {
  selectedSlug: string | null
  detailLoading: boolean
  detailError: string
  profileRows: unknown[]
}

export function resolveSelectedDukeSlug(
  currentSlug: string | null,
  rows: SelectableDuke[]
) {
  if (!rows.length) return null
  if (currentSlug && rows.some((row) => row.duke_slug === currentSlug)) return currentSlug
  return rows[0].duke_slug
}

export function buildDukeDetailPanelState({
  selectedSlug,
  detailLoading,
  detailError,
  profileRows,
}: BuildDukeDetailPanelStateInput) {
  return {
    selectedSlug,
    showRetry: !detailLoading && Boolean(detailError),
    message: detailError || (!detailLoading && profileRows.length === 0 ? 'No input analytics yet.' : ''),
  }
}
```

- [ ] **Step 4: Run the focused tests**

Run: `node --test lib/duke-stats-data.test.js lib/duke-stats-screen-state.test.js lib/duke-input-analytics.test.js`
Expected: PASS with teaser defaults, selection rules, and profile-state helpers all green.

- [ ] **Step 5: Commit**

```bash
git add lib/duke-stats-data.ts lib/duke-stats-data.test.js lib/duke-stats-screen-state.ts lib/duke-stats-screen-state.test.js
git commit --only -m "feat: add duke stats teaser and screen state helpers" -- lib/duke-stats-data.ts lib/duke-stats-data.test.js lib/duke-stats-screen-state.ts lib/duke-stats-screen-state.test.js
```

### Task 4: Render the hybrid duke analytics UI in the screen

**Files:**
- Modify: `lib/duke-stats-screen-state.ts`
- Modify: `lib/duke-stats-screen-state.test.js`
- Create: `components/DukeInputProfilePanel.tsx`
- Modify: `app/duke-stats.tsx`

- [ ] **Step 1: Add a failing screen-state test for the detail fallback copy**

```js
test('buildDukeDetailPanelState shows the neutral low-sample message when there are no qualifying wins', () => {
  const state = buildDukeDetailPanelState({
    selectedSlug: 'cornelius_the_dreamer',
    detailLoading: false,
    detailError: '',
    profileRows: [{}],
    canShowWinningProfile: false,
  })

  assert.match(state.message ?? '', /Not enough winning data yet/i)
})
```

- [ ] **Step 2: Run the test to verify it fails before wiring the UI**

Run: `node --test lib/duke-stats-screen-state.test.js`
Expected: FAIL until the helper and UI-facing copy are aligned.

- [ ] **Step 3: Build the component and wire the screen**

```tsx
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { theme } from '../constants/theme'
import { cardImages } from '../data/cardImages'
import type { DukeInputProfileRow } from '../lib/duke-input-analytics'

type Props = {
  dukeName: string
  dukeSlug: string
  detailLoading: boolean
  detailMessage: string
  canShowWinningProfile: boolean
  usualRows: DukeInputProfileRow[]
  winningRows: DukeInputProfileRow[]
  insightLines: string[]
  onRetry: () => void
}

export default function DukeInputProfilePanel({
  dukeName,
  dukeSlug,
  detailLoading,
  detailMessage,
  canShowWinningProfile,
  usualRows,
  winningRows,
  insightLines,
  onRetry,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.imageWrap}>
          {cardImages[dukeSlug] ? (
            <Image source={cardImages[dukeSlug]} style={styles.image} resizeMode="cover" />
          ) : null}
        </View>
        <View style={styles.headerMeta}>
          <Text style={styles.title}>{dukeName}</Text>
          <Text style={styles.subtitle}>How this duke usually scores vs. how it wins</Text>
        </View>
      </View>

      {detailLoading ? <Text style={styles.message}>Loading input analytics...</Text> : null}
      {!detailLoading && detailMessage ? <Text style={styles.message}>{detailMessage}</Text> : null}
      {!detailLoading && detailMessage ? (
        <Pressable onPress={onRetry}>
          <Text style={styles.retry}>Retry detail load</Text>
        </Pressable>
      ) : null}

      {!detailLoading && !detailMessage ? (
        <>
          <Text style={styles.sectionTitle}>Usual Scoring</Text>
          {usualRows.map((row) => (
            <Text key={`usual-${row.stat_key}`} style={styles.rowText}>
              {row.label} - {row.avg_points_generated.toFixed(1)} pts avg - {row.points_share.toFixed(1)}%
            </Text>
          ))}

          <Text style={styles.sectionTitle}>Winning Profile</Text>
          {canShowWinningProfile ? (
            winningRows.map((row) => (
              <Text key={`win-${row.stat_key}`} style={styles.rowText}>
                {row.label} - {row.avg_points_generated.toFixed(1)} pts avg - {row.points_share.toFixed(1)}%
              </Text>
            ))
          ) : (
            <Text style={styles.message}>Not enough winning data yet.</Text>
          )}

          {insightLines.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>What Changes In Wins</Text>
              {insightLines.map((line) => (
                <Text key={line} style={styles.rowText}>
                  {line}
                </Text>
              ))}
            </>
          ) : null}
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 12,
    ...theme.shadow.card,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  imageWrap: {
    width: 72,
    height: 72,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundAlt,
    marginRight: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  headerMeta: {
    flex: 1,
  },
  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 4,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 10,
    marginBottom: 6,
  },
  rowText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  message: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  retry: {
    color: theme.colors.accent,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 8,
  },
})
```

```tsx
import DukeInputProfilePanel from '../components/DukeInputProfilePanel'
import {
  buildDukeInputProfileState,
  resolveDukeInputProfileRows,
  type DukeInputProfileRow,
} from '../lib/duke-input-analytics'
import {
  buildDukeDetailPanelState,
  resolveSelectedDukeSlug,
} from '../lib/duke-stats-screen-state'

const [selectedDukeSlug, setSelectedDukeSlug] = useState<string | null>(null)
const [detailRows, setDetailRows] = useState<DukeInputProfileRow[]>([])
const [detailLoading, setDetailLoading] = useState(false)
const [detailError, setDetailError] = useState('')

useEffect(() => {
  setSelectedDukeSlug((current) => resolveSelectedDukeSlug(current, filteredRows))
}, [filteredRows])

const selectedRow = useMemo(
  () => filteredRows.find((row) => row.duke_slug === selectedDukeSlug) ?? null,
  [filteredRows, selectedDukeSlug]
)

const loadSelectedDukeDetail = useCallback(async (dukeSlug: string | null) => {
  if (!dukeSlug) {
    setDetailRows([])
    setDetailError('')
    return
  }

  setDetailLoading(true)
  setDetailError('')

  try {
    const { data, error } = await supabase
      .from('duke_input_stat_profiles')
      .select('*')
      .eq('duke_slug', dukeSlug)

    if (error) throw error

    setDetailRows(resolveDukeInputProfileRows(data ?? []))
  } catch (err: any) {
    setDetailRows([])
    setDetailError(err?.message ?? 'Unable to load duke input analytics right now.')
  } finally {
    setDetailLoading(false)
  }
}, [])

useEffect(() => {
  void loadSelectedDukeDetail(selectedDukeSlug)
}, [loadSelectedDukeDetail, selectedDukeSlug])

const profileState = useMemo(() => buildDukeInputProfileState(detailRows, 3), [detailRows])

const detailState = useMemo(
  () =>
    buildDukeDetailPanelState({
      selectedSlug: selectedDukeSlug,
      detailLoading,
      detailError,
      profileRows: detailRows,
      canShowWinningProfile: profileState.canShowWinningProfile,
    }),
  [detailError, detailLoading, detailRows, profileState.canShowWinningProfile, selectedDukeSlug]
)
```

```tsx
{selectedRow ? (
  <DukeInputProfilePanel
    dukeName={selectedRow.duke_name}
    dukeSlug={selectedRow.duke_slug}
    detailLoading={detailLoading}
    detailMessage={detailState.message}
    canShowWinningProfile={profileState.canShowWinningProfile}
    usualRows={profileState.usualRows}
    winningRows={profileState.winningRows}
    insightLines={profileState.insightLines}
    onRetry={() => {
      void loadSelectedDukeDetail(selectedRow.duke_slug)
    }}
  />
) : null}

{filteredRows.map((row, index) => (
  <Pressable
    key={row.duke_slug}
    style={({ pressed }) => [
      styles.card,
      selectedDukeSlug === row.duke_slug && styles.cardSelected,
      pressed && styles.buttonPressed,
    ]}
    onPress={() => setSelectedDukeSlug(row.duke_slug)}
  >
    <Text style={styles.rankLabel}>#{index + 1}</Text>
    <Text style={styles.metaText}>
      Scores Through: {row.top_input_label || 'No input trend yet'}
      {row.top_input_label ? ` - ${row.top_input_points_share.toFixed(1)}%` : ''}
    </Text>
    <Text style={styles.metaText}>
      Winning Edge: {row.winner_edge_label || 'Not enough winning data yet'}
      {row.winner_edge_label ? ` - +${row.winner_edge_delta.toFixed(1)} pts` : ''}
    </Text>
  </Pressable>
))}
```

```ts
type BuildDukeDetailPanelStateInput = {
  selectedSlug: string | null
  detailLoading: boolean
  detailError: string
  profileRows: unknown[]
  canShowWinningProfile?: boolean
}

export function buildDukeDetailPanelState({
  selectedSlug,
  detailLoading,
  detailError,
  profileRows,
  canShowWinningProfile = true,
}: BuildDukeDetailPanelStateInput) {
  return {
    selectedSlug,
    showRetry: !detailLoading && Boolean(detailError),
    message: detailError
      ? detailError
      : !detailLoading && profileRows.length === 0
      ? 'No input analytics yet.'
      : !detailLoading && !canShowWinningProfile
      ? 'Not enough winning data yet.'
      : '',
  }
}
```

```ts
cardSelected: {
  borderColor: theme.colors.borderAccent ?? theme.colors.accent,
  ...theme.shadow.glow,
},
```

- [ ] **Step 4: Run verification commands**

Run: `node --test lib/duke-input-analytics.test.js lib/duke-input-analytics-sql.test.js lib/duke-stats-data.test.js lib/duke-stats-screen-state.test.js`
Expected: PASS

Run: `node node_modules\\typescript\\bin\\tsc --noEmit`
Expected: PASS with no type errors from the new duke analytics modules.

Run: `npm.cmd run lint`
Expected: PASS, or at minimum no new lint failures in `app/duke-stats.tsx`, `components/DukeInputProfilePanel.tsx`, and the touched `lib/` files.

Manual spot-check:
- open `Duke Stats`
- confirm the top filtered duke is auto-selected
- tap a different duke and verify the panel updates in place
- confirm card teasers still show even if the detail fetch fails
- confirm a low-win duke shows `Not enough winning data yet.`

- [ ] **Step 5: Commit**

```bash
git add components/DukeInputProfilePanel.tsx app/duke-stats.tsx
git commit --only -m "feat: add duke input analytics ui" -- components/DukeInputProfilePanel.tsx app/duke-stats.tsx
```
