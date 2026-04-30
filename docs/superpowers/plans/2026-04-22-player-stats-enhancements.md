# Player Stats Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `Player Stats` with win rate, podium rate, normalized finish, and best/favorite duke insights while preserving the current all-time, 30-day, and duke-filter behavior.

**Architecture:** Add one focused Supabase migration to extend the player analytics rollup tables and rebuild function, then extend the TypeScript resolver layer so the new metrics are available throughout the screen. Keep the React screen lean by extracting selected-player insight and formatting logic into a pure helper module that can be covered with the repo's existing `node:test` pattern.

**Tech Stack:** Expo Router, React Native, TypeScript, Supabase SQL migrations, Node built-in test runner, ESLint, TypeScript compiler

---

## File Map

- Create: `supabase/migrations/20260422170000_add_player_stats_rate_metrics.sql`
  Adds `podiums`, `win_rate`, `podium_rate`, and `avg_finish_percentile` to the player analytics tables, updates `private.rebuild_public_analytics()`, and reruns the rebuild.
- Create: `lib/player-stats-rate-migration.test.js`
  Locks the new migration filename and asserts that the migration adds the required columns and normalized-finish formulas.
- Modify: `lib/player-stats-data.ts`
  Extends the player analytics row types, adds the new numeric fields to the resolver output, and separates leaderboard sorting from duke-row sorting.
- Modify: `lib/player-stats-data.test.js`
  Covers normalization of the new metrics and the new duke-row sorting rules.
- Modify: `lib/player-stats-aggregates.ts`
  Makes `filterPlayers(...)` generic so `PlayerLeaderboardRow` data keeps its richer fields after filtering.
- Create: `lib/player-stats-insights.ts`
  Derives `favorite duke`, `best duke`, and the short display strings used by `app/player-stats.tsx`.
- Create: `lib/player-stats-insights.test.js`
  Verifies the sample-size rule and the tie breakers for best/favorite duke selection.
- Modify: `app/player-stats.tsx`
  Renders the new leaderboard support text, selected-player summary strip, duke insight cards, and richer duke-row copy.

### Task 1: Add migration regression coverage for the new player metrics

**Files:**
- Create: `lib/player-stats-rate-migration.test.js`

- [ ] **Step 1: Write the failing test**

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
  '20260422170000_add_player_stats_rate_metrics.sql'
)

function readMigration() {
  assert.ok(
    fs.existsSync(migrationPath),
    `Expected player stats rate migration at ${migrationPath}`
  )

  return fs.readFileSync(migrationPath, 'utf8')
}

test('player stats rate migration adds podium and rate columns to the player analytics tables', () => {
  const migration = readMigration()

  for (const tableName of [
    'player_global_stats',
    'player_global_stats_30d',
    'player_duke_stats',
    'player_duke_stats_30d',
  ]) {
    assert.match(
      migration,
      new RegExp(`alter table public\\.${tableName}[\\s\\S]*podiums integer not null default 0`, 'i')
    )
    assert.match(
      migration,
      new RegExp(`alter table public\\.${tableName}[\\s\\S]*win_rate numeric\\(10, 2\\) not null default 0`, 'i')
    )
    assert.match(
      migration,
      new RegExp(`alter table public\\.${tableName}[\\s\\S]*podium_rate numeric\\(10, 2\\) not null default 0`, 'i')
    )
    assert.match(
      migration,
      new RegExp(`alter table public\\.${tableName}[\\s\\S]*avg_finish_percentile numeric\\(10, 2\\) not null default 0`, 'i')
    )
  }
})

test('player stats rate migration rebuilds player analytics with normalized finish and rate formulas', () => {
  const migration = readMigration()

  assert.match(migration, /as finish_percentile/i)
  assert.match(migration, /when rs\.player_count <= 1 then 100::numeric/i)
  assert.match(migration, /count\(\*\) filter \(where ar\.placement <= 3\)::int as podiums/i)
  assert.match(migration, /round\(avg\(ar\.finish_percentile\), 2\) as avg_finish_percentile/i)
  assert.match(migration, /as win_rate/i)
  assert.match(migration, /as podium_rate/i)
  assert.match(migration, /select private\.rebuild_public_analytics\(\);/i)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node lib/player-stats-rate-migration.test.js`
Expected: FAIL because `supabase/migrations/20260422170000_add_player_stats_rate_metrics.sql` does not exist yet.

- [ ] **Step 3: Create the migration**

Create `supabase/migrations/20260422170000_add_player_stats_rate_metrics.sql` with these exact building blocks:

```sql
alter table public.player_global_stats
  add column if not exists podiums integer not null default 0,
  add column if not exists win_rate numeric(10, 2) not null default 0,
  add column if not exists podium_rate numeric(10, 2) not null default 0,
  add column if not exists avg_finish_percentile numeric(10, 2) not null default 0;

alter table public.player_global_stats_30d
  add column if not exists podiums integer not null default 0,
  add column if not exists win_rate numeric(10, 2) not null default 0,
  add column if not exists podium_rate numeric(10, 2) not null default 0,
  add column if not exists avg_finish_percentile numeric(10, 2) not null default 0;

alter table public.player_duke_stats
  add column if not exists podiums integer not null default 0,
  add column if not exists win_rate numeric(10, 2) not null default 0,
  add column if not exists podium_rate numeric(10, 2) not null default 0,
  add column if not exists avg_finish_percentile numeric(10, 2) not null default 0;

alter table public.player_duke_stats_30d
  add column if not exists podiums integer not null default 0,
  add column if not exists win_rate numeric(10, 2) not null default 0,
  add column if not exists podium_rate numeric(10, 2) not null default 0,
  add column if not exists avg_finish_percentile numeric(10, 2) not null default 0;
```

Inside the `analytics_rows` CTE for each player-rollup insert in `private.rebuild_public_analytics()`, add this computed field before `rs.updated_at`:

```sql
      case
        when rs.player_count <= 1 then 100::numeric
        else round(
          (1 - ((rs.placement - 1)::numeric / nullif((rs.player_count - 1)::numeric, 0))) * 100::numeric,
          2
        )
      end as finish_percentile,
```

Update the all-time and 30-day player-global inserts so their column list and `select` body include:

```sql
  insert into public.player_global_stats (
    player_key,
    player_name,
    public_player_id,
    games_played,
    wins,
    podiums,
    second_places,
    third_places,
    avg_score,
    avg_finish,
    avg_finish_percentile,
    win_rate,
    podium_rate,
    player_type
  )
```

```sql
  select
    ar.player_key,
    max(ar.player_name) as player_name,
    max(ar.public_player_id) as public_player_id,
    count(*)::int as games_played,
    count(*) filter (where ar.is_winner)::int as wins,
    count(*) filter (where ar.placement <= 3)::int as podiums,
    count(*) filter (where ar.placement = 2)::int as second_places,
    count(*) filter (where ar.placement = 3)::int as third_places,
    round(avg(ar.total_score), 2) as avg_score,
    round(avg(ar.placement::numeric), 2) as avg_finish,
    round(avg(ar.finish_percentile), 2) as avg_finish_percentile,
    round((count(*) filter (where ar.is_winner)::numeric / nullif(count(*), 0)::numeric) * 100::numeric, 2) as win_rate,
    round((count(*) filter (where ar.placement <= 3)::numeric / nullif(count(*), 0)::numeric) * 100::numeric, 2) as podium_rate,
    max(ar.player_type) as player_type
  from analytics_rows ar
  group by ar.player_key;
```

Update the all-time and 30-day player-duke inserts so their column list and `select` body include:

```sql
  insert into public.player_duke_stats (
    player_key,
    player_name,
    public_player_id,
    duke_slug,
    games_played,
    wins,
    podiums,
    avg_score,
    avg_finish,
    avg_finish_percentile,
    win_rate,
    podium_rate,
    player_type
  )
```

```sql
  select
    ar.player_key,
    max(ar.player_name) as player_name,
    max(ar.public_player_id) as public_player_id,
    ar.duke_slug,
    count(*)::int as games_played,
    count(*) filter (where ar.is_winner)::int as wins,
    count(*) filter (where ar.placement <= 3)::int as podiums,
    round(avg(ar.total_score), 2) as avg_score,
    round(avg(ar.placement::numeric), 2) as avg_finish,
    round(avg(ar.finish_percentile), 2) as avg_finish_percentile,
    round((count(*) filter (where ar.is_winner)::numeric / nullif(count(*), 0)::numeric) * 100::numeric, 2) as win_rate,
    round((count(*) filter (where ar.placement <= 3)::numeric / nullif(count(*), 0)::numeric) * 100::numeric, 2) as podium_rate,
    max(ar.player_type) as player_type
  from analytics_rows ar
  group by ar.player_key, ar.duke_slug;
```

Finish the migration with:

```sql
select private.rebuild_public_analytics();
```

- [ ] **Step 4: Run the migration regression tests**

Run: `node lib/player-stats-rate-migration.test.js`
Expected: PASS with 2 tests passing.

Run: `node lib/secure-analytics-rollups.test.js`
Expected: PASS with the existing analytics security checks still green.

### Task 2: Extend the player stats resolver output and preserve rich types after filtering

**Files:**
- Modify: `lib/player-stats-data.ts`
- Modify: `lib/player-stats-data.test.js`
- Modify: `lib/player-stats-aggregates.ts`

- [ ] **Step 1: Update the resolver test to require the new fields and duke sort**

Add these test cases to `lib/player-stats-data.test.js`:

```js
test('resolvePlayerLeaderboardRows normalizes podium and rate metrics from Supabase views', () => {
  const [row] = resolvePlayerLeaderboardRows([
    {
      player_key: 'guest:guest-1',
      player_name: '',
      public_player_id: 'gst001',
      player_type: 'guest',
      games_played: '5',
      wins: '2',
      podiums: '4',
      second_places: '1',
      third_places: '1',
      avg_score: '42.5',
      avg_finish: '1.8',
      avg_finish_percentile: '72.5',
      win_rate: '40',
      podium_rate: '80',
    },
  ])

  assert.deepEqual(row, {
    player_key: 'guest:guest-1',
    player_name: 'Guest Player',
    public_player_id: 'GST001',
    player_type: 'guest',
    games_played: 5,
    wins: 2,
    podiums: 4,
    second_places: 1,
    third_places: 1,
    avg_score: 42.5,
    avg_finish: 1.8,
    avg_finish_percentile: 72.5,
    win_rate: 40,
    podium_rate: 80,
  })
})

test('resolvePlayerDukeRows sorts the selected player breakdown by wins, win rate, normalized finish, and average score', () => {
  const rows = resolvePlayerDukeRows([
    {
      player_key: 'user:user-1',
      player_name: 'Izzy',
      public_player_id: 'IZZY01',
      player_type: 'user',
      duke_slug: 'cornelius_the_dreamer',
      games_played: 4,
      wins: 1,
      podiums: 3,
      avg_score: 44,
      avg_finish: 2.5,
      avg_finish_percentile: 60,
      win_rate: 25,
      podium_rate: 75,
    },
    {
      player_key: 'user:user-1',
      player_name: 'Izzy',
      public_player_id: 'IZZY01',
      player_type: 'user',
      duke_slug: 'aguilar_the_gilded_knight',
      games_played: 4,
      wins: 1,
      podiums: 2,
      avg_score: 40,
      avg_finish: 1.5,
      avg_finish_percentile: 90,
      win_rate: 25,
      podium_rate: 50,
    },
    {
      player_key: 'user:user-1',
      player_name: 'Izzy',
      public_player_id: 'IZZY01',
      player_type: 'user',
      duke_slug: 'reese_the_firebrand',
      games_played: 4,
      wins: 1,
      podiums: 3,
      avg_score: 47,
      avg_finish: 1.4,
      avg_finish_percentile: 90,
      win_rate: 50,
      podium_rate: 75,
    },
  ])

  assert.deepEqual(rows.map((row) => row.duke_slug), [
    'reese_the_firebrand',
    'aguilar_the_gilded_knight',
    'cornelius_the_dreamer',
  ])
})
```

- [ ] **Step 2: Run the resolver test to verify it fails**

Run: `node lib/player-stats-data.test.js`
Expected: FAIL because the new fields are missing from the resolver output and the duke-row sort still uses the older comparator.

- [ ] **Step 3: Extend the resolver code and make filtering generic**

In `lib/player-stats-data.ts`, update the row types and comparators:

```ts
export type RawPlayerLeaderboardRow = {
  player_key: string
  player_name: string | null
  public_player_id: string | null
  player_type: string | null
  games_played: NumericValue
  wins: NumericValue
  podiums?: NumericValue
  second_places?: NumericValue
  third_places?: NumericValue
  avg_score: NumericValue
  avg_finish: NumericValue
  avg_finish_percentile?: NumericValue
  win_rate?: NumericValue
  podium_rate?: NumericValue
}

export type PlayerLeaderboardRow = {
  player_key: string
  player_name: string
  public_player_id: string | null
  player_type: 'user' | 'guest'
  games_played: number
  wins: number
  podiums: number
  second_places: number
  third_places: number
  avg_score: number
  avg_finish: number
  avg_finish_percentile: number
  win_rate: number
  podium_rate: number
}
```

```ts
function compareLeaderboardRows(
  a: Pick<PlayerLeaderboardRow, 'wins' | 'avg_score' | 'avg_finish'>,
  b: Pick<PlayerLeaderboardRow, 'wins' | 'avg_score' | 'avg_finish'>
) {
  if (b.wins !== a.wins) return b.wins - a.wins
  if (b.avg_score !== a.avg_score) return b.avg_score - a.avg_score
  return a.avg_finish - b.avg_finish
}

function compareDukeRows(
  a: Pick<PlayerDukeRow, 'wins' | 'win_rate' | 'avg_finish_percentile' | 'avg_score' | 'duke_slug'>,
  b: Pick<PlayerDukeRow, 'wins' | 'win_rate' | 'avg_finish_percentile' | 'avg_score' | 'duke_slug'>
) {
  if (b.wins !== a.wins) return b.wins - a.wins
  if (b.win_rate !== a.win_rate) return b.win_rate - a.win_rate
  if (b.avg_finish_percentile !== a.avg_finish_percentile) {
    return b.avg_finish_percentile - a.avg_finish_percentile
  }
  if (b.avg_score !== a.avg_score) return b.avg_score - a.avg_score
  return a.duke_slug.localeCompare(b.duke_slug)
}
```

```ts
      return {
        player_key: row.player_key,
        player_name: playerName,
        public_player_id: normalizePublicPlayerId(row.public_player_id),
        player_type: playerType,
        games_played: toNumber(row.games_played),
        wins: toNumber(row.wins),
        podiums: toNumber(row.podiums),
        second_places: toNumber(row.second_places),
        third_places: toNumber(row.third_places),
        avg_score: toNumber(row.avg_score),
        avg_finish: toNumber(row.avg_finish),
        avg_finish_percentile: toNumber(row.avg_finish_percentile),
        win_rate: toNumber(row.win_rate),
        podium_rate: toNumber(row.podium_rate),
      }
```

```ts
    .sort(compareLeaderboardRows)
```

```ts
    .sort(compareDukeRows)
```

In `lib/player-stats-aggregates.ts`, keep the runtime logic the same but preserve richer row shapes:

```ts
type PlayerSearchRow = Pick<PlayerAggregate, 'public_player_id' | 'player_name'>

export function filterPlayers<T extends PlayerSearchRow>(players: T[], query: string): T[] {
  const normalizedQuery = query.trim().toUpperCase()
  if (!normalizedQuery) return players

  return players.filter(
    (player) =>
      (player.public_player_id ?? '').toUpperCase().includes(normalizedQuery) ||
      player.player_name.toUpperCase().includes(normalizedQuery)
  )
}
```

- [ ] **Step 4: Run the resolver and typecheck verification**

Run: `node lib/player-stats-data.test.js`
Expected: PASS with all resolver tests passing.

Run: `node node_modules\\typescript\\bin\\tsc --noEmit`
Expected: exit 0, including `app/player-stats.tsx` keeping access to the richer leaderboard fields after filtering.

### Task 3: Add a pure helper for best duke, favorite duke, and short display copy

**Files:**
- Create: `lib/player-stats-insights.ts`
- Create: `lib/player-stats-insights.test.js`

- [ ] **Step 1: Write the failing helper tests**

Create `lib/player-stats-insights.test.js` with:

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  deriveSelectedPlayerInsights,
  formatPlayerDukeSummary,
  formatPlayerLeaderboardSummary,
} from './player-stats-insights.ts'

const dukeRows = [
  {
    player_key: 'user:user-1',
    player_name: 'Izzy',
    public_player_id: 'IZZY01',
    player_type: 'user',
    duke_slug: 'aguilar_the_gilded_knight',
    games_played: 4,
    wins: 2,
    podiums: 3,
    avg_score: 45,
    avg_finish: 1.75,
    avg_finish_percentile: 80,
    win_rate: 50,
    podium_rate: 75,
  },
  {
    player_key: 'user:user-1',
    player_name: 'Izzy',
    public_player_id: 'IZZY01',
    player_type: 'user',
    duke_slug: 'cornelius_the_dreamer',
    games_played: 6,
    wins: 2,
    podiums: 4,
    avg_score: 44,
    avg_finish: 1.9,
    avg_finish_percentile: 76,
    win_rate: 33.3,
    podium_rate: 66.7,
  },
  {
    player_key: 'user:user-1',
    player_name: 'Izzy',
    public_player_id: 'IZZY01',
    player_type: 'user',
    duke_slug: 'reese_the_firebrand',
    games_played: 2,
    wins: 2,
    podiums: 2,
    avg_score: 52,
    avg_finish: 1,
    avg_finish_percentile: 100,
    win_rate: 100,
    podium_rate: 100,
  },
]

test('deriveSelectedPlayerInsights picks favorite duke by games played', () => {
  const result = deriveSelectedPlayerInsights(dukeRows)

  assert.equal(result.favoriteDuke?.dukeSlug, 'cornelius_the_dreamer')
  assert.equal(result.favoriteDuke?.gamesPlayed, 6)
})

test('deriveSelectedPlayerInsights ignores dukes with fewer than three games when choosing best duke', () => {
  const result = deriveSelectedPlayerInsights(dukeRows)

  assert.equal(result.bestDuke?.dukeSlug, 'aguilar_the_gilded_knight')
  assert.equal(result.bestDuke?.winRate, 50)
})

test('formatPlayerLeaderboardSummary and formatPlayerDukeSummary return compact UI copy', () => {
  assert.equal(
    formatPlayerLeaderboardSummary({
      wins: 12,
      podiums: 18,
      avg_finish_percentile: 71.4,
    }),
    '12 wins - 18 podiums - Norm finish 71.4'
  )

  assert.equal(
    formatPlayerDukeSummary({
      games_played: 4,
      wins: 2,
      win_rate: 50,
      avg_finish_percentile: 80,
    }),
    '4 games - 2 wins - WR 50.0% - Norm 80.0'
  )
})
```

- [ ] **Step 2: Run the helper test to verify it fails**

Run: `node lib/player-stats-insights.test.js`
Expected: FAIL with module-not-found errors because `lib/player-stats-insights.ts` does not exist yet.

- [ ] **Step 3: Implement the helper**

Create `lib/player-stats-insights.ts` with:

```ts
import type { PlayerDukeRow, PlayerLeaderboardRow } from './player-stats-data'

export type PlayerDukeInsight = {
  dukeSlug: string
  gamesPlayed: number
  wins: number
  winRate: number
  podiumRate: number
  avgFinishPercentile: number
  avgScore: number
}

export type SelectedPlayerInsights = {
  favoriteDuke: PlayerDukeInsight | null
  bestDuke: PlayerDukeInsight | null
}

function toInsight(row: PlayerDukeRow): PlayerDukeInsight {
  return {
    dukeSlug: row.duke_slug,
    gamesPlayed: row.games_played,
    wins: row.wins,
    winRate: row.win_rate,
    podiumRate: row.podium_rate,
    avgFinishPercentile: row.avg_finish_percentile,
    avgScore: row.avg_score,
  }
}

function compareFavorite(left: PlayerDukeRow, right: PlayerDukeRow) {
  if (right.games_played !== left.games_played) return right.games_played - left.games_played
  if (right.win_rate !== left.win_rate) return right.win_rate - left.win_rate
  if (right.avg_finish_percentile !== left.avg_finish_percentile) {
    return right.avg_finish_percentile - left.avg_finish_percentile
  }
  if (right.avg_score !== left.avg_score) return right.avg_score - left.avg_score
  return left.duke_slug.localeCompare(right.duke_slug)
}

function compareBest(left: PlayerDukeRow, right: PlayerDukeRow) {
  if (right.win_rate !== left.win_rate) return right.win_rate - left.win_rate
  if (right.avg_finish_percentile !== left.avg_finish_percentile) {
    return right.avg_finish_percentile - left.avg_finish_percentile
  }
  if (right.avg_score !== left.avg_score) return right.avg_score - left.avg_score
  if (right.games_played !== left.games_played) return right.games_played - left.games_played
  return left.duke_slug.localeCompare(right.duke_slug)
}

export function deriveSelectedPlayerInsights(rows: PlayerDukeRow[]): SelectedPlayerInsights {
  if (!rows.length) {
    return {
      favoriteDuke: null,
      bestDuke: null,
    }
  }

  const favoriteDuke = [...rows].sort(compareFavorite)[0] ?? null
  const bestCandidates = rows.filter((row) => row.games_played >= 3)
  const bestDuke = bestCandidates.length > 0 ? [...bestCandidates].sort(compareBest)[0] : null

  return {
    favoriteDuke: favoriteDuke ? toInsight(favoriteDuke) : null,
    bestDuke: bestDuke ? toInsight(bestDuke) : null,
  }
}

export function formatPlayerLeaderboardSummary(
  player: Pick<PlayerLeaderboardRow, 'wins' | 'podiums' | 'avg_finish_percentile'>
) {
  return `${player.wins} wins - ${player.podiums} podiums - Norm finish ${player.avg_finish_percentile.toFixed(1)}`
}

export function formatPlayerDukeSummary(
  row: Pick<PlayerDukeRow, 'games_played' | 'wins' | 'win_rate' | 'avg_finish_percentile'>
) {
  return `${row.games_played} games - ${row.wins} wins - WR ${row.win_rate.toFixed(1)}% - Norm ${row.avg_finish_percentile.toFixed(1)}`
}
```

- [ ] **Step 4: Run the helper test**

Run: `node lib/player-stats-insights.test.js`
Expected: PASS with all 3 helper tests passing.

### Task 4: Wire the richer metrics into the Player Stats screen

**Files:**
- Modify: `app/player-stats.tsx`

- [ ] **Step 1: Import the helper and derive the new selected-player data**

Add these imports:

```ts
import {
  deriveSelectedPlayerInsights,
  formatPlayerDukeSummary,
  formatPlayerLeaderboardSummary,
} from '../lib/player-stats-insights'
```

Add these memoized values:

```ts
  const selectedPlayerInsights = useMemo(
    () => deriveSelectedPlayerInsights(playerDukeStats),
    [playerDukeStats]
  )

  const selectedSummaryItems = useMemo(() => {
    if (!selectedPlayer) return []

    return [
      { label: 'Games', value: String(selectedPlayer.games_played) },
      { label: 'Win Rate', value: `${selectedPlayer.win_rate.toFixed(1)}%` },
      { label: 'Podium Rate', value: `${selectedPlayer.podium_rate.toFixed(1)}%` },
      { label: 'Norm Finish', value: selectedPlayer.avg_finish_percentile.toFixed(1) },
    ]
  }, [selectedPlayer])
```

Update the duke query ordering so it matches the approved sort:

```ts
        let dukeQuery = supabase
          .from(dukeView)
          .select('*')
          .eq('player_key', playerKey)
          .order('wins', { ascending: false })
          .order('win_rate', { ascending: false })
          .order('avg_finish_percentile', { ascending: false })
          .order('avg_score', { ascending: false })
```

- [ ] **Step 2: Update the leaderboard cards**

Replace the player subtitle and right-side metrics with:

```tsx
                      <Text style={styles.playerSub}>
                        {player.public_player_id ?? 'No Player ID'}
                      </Text>
                      <Text style={styles.playerSupportText}>
                        {formatPlayerLeaderboardSummary(player)}
                      </Text>
```

```tsx
                  <View style={styles.rightStats}>
                    <View style={styles.miniStat}>
                      <Text style={styles.miniStatValue}>{player.win_rate.toFixed(1)}%</Text>
                      <Text style={styles.miniStatLabel}>WR</Text>
                    </View>

                    <View style={styles.miniStat}>
                      <Text style={styles.miniStatValue}>{player.games_played}</Text>
                      <Text style={styles.miniStatLabel}>G</Text>
                    </View>

                    <View style={styles.miniStat}>
                      <Text style={styles.miniStatValue}>{player.avg_score.toFixed(1)}</Text>
                      <Text style={styles.miniStatLabel}>AVG</Text>
                    </View>
                  </View>
```

- [ ] **Step 3: Replace the selected-player header pill with the summary strip and duke insight cards**

Replace the single `summaryPill` block with:

```tsx
              <View style={styles.summaryStrip}>
                {selectedSummaryItems.map((item) => (
                  <View key={item.label} style={styles.summaryStatCard}>
                    <Text style={styles.summaryStatValue}>{item.value}</Text>
                    <Text style={styles.summaryStatLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.insightCardsRow}>
                <View style={styles.insightCard}>
                  <Text style={styles.insightCardKicker}>Favorite Duke</Text>
                  <Text style={styles.insightCardTitle}>
                    {selectedPlayerInsights.favoriteDuke
                      ? formatDukeName(selectedPlayerInsights.favoriteDuke.dukeSlug)
                      : 'No duke data'}
                  </Text>
                  <Text style={styles.insightCardText}>
                    {selectedPlayerInsights.favoriteDuke
                      ? `${selectedPlayerInsights.favoriteDuke.gamesPlayed} games - ${selectedPlayerInsights.favoriteDuke.winRate.toFixed(1)}% WR`
                      : 'Play tracked games to see a favorite duke.'}
                  </Text>
                </View>

                <View style={styles.insightCard}>
                  <Text style={styles.insightCardKicker}>Best Duke</Text>
                  <Text style={styles.insightCardTitle}>
                    {selectedPlayerInsights.bestDuke
                      ? formatDukeName(selectedPlayerInsights.bestDuke.dukeSlug)
                      : 'Not enough data yet'}
                  </Text>
                  <Text style={styles.insightCardText}>
                    {selectedPlayerInsights.bestDuke
                      ? `${selectedPlayerInsights.bestDuke.winRate.toFixed(1)}% WR - Norm ${selectedPlayerInsights.bestDuke.avgFinishPercentile.toFixed(1)}`
                      : 'Three tracked games with a duke are required.'}
                  </Text>
                </View>
              </View>
```

Update each duke row subtitle and trailing metrics to:

```tsx
                        <Text style={styles.dukeStatSub}>
                          {formatPlayerDukeSummary(row)}
                        </Text>
```

```tsx
                    <View style={styles.dukeCardRight}>
                      <Text style={styles.dukeStatValue}>{row.avg_score.toFixed(1)}</Text>
                      <Text style={styles.dukeStatLabel}>Avg Score</Text>
                      <Text style={styles.dukeStatMeta}>
                        Norm {row.avg_finish_percentile.toFixed(1)}
                      </Text>
                    </View>
```

- [ ] **Step 4: Add the supporting styles**

Add these styles to `app/player-stats.tsx`:

```ts
  playerSupportText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  summaryStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    marginBottom: 12,
  },
  summaryStatCard: {
    flexGrow: 1,
    minWidth: 110,
    backgroundColor: pageSurface.panelRaised,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  summaryStatValue: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  summaryStatLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  insightCardsRow: {
    gap: 10,
    marginBottom: 14,
  },
  insightCard: {
    backgroundColor: pageSurface.panelAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
  },
  insightCardKicker: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  insightCardTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },
  insightCardText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
  },
  dukeStatMeta: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },
```

- [ ] **Step 5: Run focused verification**

Run: `node lib/player-stats-rate-migration.test.js`
Expected: PASS

Run: `node lib/player-stats-data.test.js`
Expected: PASS

Run: `node lib/player-stats-insights.test.js`
Expected: PASS

Run: `node lib/secure-analytics-rollups.test.js`
Expected: PASS

Run: `node node_modules\\typescript\\bin\\tsc --noEmit`
Expected: exit 0

Run: `node node_modules\\eslint\\bin\\eslint.js app/player-stats.tsx lib/player-stats-aggregates.ts lib/player-stats-data.ts lib/player-stats-insights.ts lib/player-stats-data.test.js lib/player-stats-insights.test.js lib/player-stats-rate-migration.test.js`
Expected: exit 0 with no new lint errors in the touched files.

- [ ] **Step 6: Manual spot-check**

Open `Player Stats` in the app and verify:

- `All Time` leaderboard rows now show `WR`, `G`, and `AVG`
- the leaderboard support line shows wins, podiums, and normalized finish
- selecting a player shows `Games`, `Win Rate`, `Podium Rate`, and `Norm Finish`
- `Favorite Duke` and `Best Duke` cards react to the active time window and duke filter
- the `Best Duke` card falls back to `Not enough data yet` when every duke is below the three-game threshold

Note: Do not create a git commit in this workspace unless the human partner explicitly asks for one, because the working tree already contains unrelated changes.
