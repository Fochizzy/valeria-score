# Solo Strategy Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the approved `Win Patterns`, `Risk Patterns`, and `Matchups` solo analytics sections with the 3-game threshold and optional-duke auto-win handling.

**Architecture:** Extend `lib/solo-stats.ts` with pure strategy-summary builders that derive from the existing normalized solo result rows, then render those summaries on `app/solo-stats.tsx` as three stacked cards in the approved page order. Keep all ranking and threshold logic out of the screen so the UI stays presentational and the behavior remains easy to unit test.

**Tech Stack:** Expo Router, React Native, TypeScript, Node test runner, existing solo analytics helpers in `lib/solo-stats.ts`

---

### Task 1: Add Failing Strategy Tests

**Files:**
- Modify: `C:\Users\izzyh\Desktop\valeria-score\lib\solo-stats.test.js`
- Create: `C:\Users\izzyh\Desktop\valeria-score\lib\solo-stats-screen-layout.test.js`
- Test: `C:\Users\izzyh\Desktop\valeria-score\lib\solo-stats.test.js`
- Test: `C:\Users\izzyh\Desktop\valeria-score\lib\solo-stats-screen-layout.test.js`

- [ ] **Step 1: Write the failing aggregate tests**

```js
import {
  buildSoloStrategySections,
  buildSoloMatchupRows,
} from './solo-stats.ts'

test('buildSoloStrategySections applies the 3-game threshold to strongest duke and toughest dark lord', () => {
  const rows = [
    { player_duke_slug: 'aguilar_the_gilded_knight', dark_lord_duke_slug: 'drakkenstrike', victory_condition: 'five_stacks_exhausted', winner: 'player', resolution: 'contested', player_total: 45, dark_lord_total: 39, player_inputs: { gold: 8, vp: 5 }, dark_lord_inputs: {} },
    { player_duke_slug: 'aguilar_the_gilded_knight', dark_lord_duke_slug: 'drakkenstrike', victory_condition: 'five_stacks_exhausted', winner: 'player', resolution: 'contested', player_total: 41, dark_lord_total: 34, player_inputs: { gold: 7, vp: 5 }, dark_lord_inputs: {} },
    { player_duke_slug: 'aguilar_the_gilded_knight', dark_lord_duke_slug: 'drakkenstrike', victory_condition: 'slay_all_monsters', winner: 'player', resolution: 'player_auto', player_total: 0, dark_lord_total: 0, player_inputs: {}, dark_lord_inputs: {} },
    { player_duke_slug: 'cornelius_the_dreamer', dark_lord_duke_slug: 'drakkenstrike', victory_condition: 'five_stacks_exhausted', winner: 'dark_lord', resolution: 'contested', player_total: 36, dark_lord_total: 41, player_inputs: { gold: 5, vp: 4 }, dark_lord_inputs: {} },
    { player_duke_slug: 'cornelius_the_dreamer', dark_lord_duke_slug: 'drakkenstrike', victory_condition: 'five_stacks_exhausted', winner: 'dark_lord', resolution: 'contested', player_total: 34, dark_lord_total: 42, player_inputs: { gold: 4, vp: 3 }, dark_lord_inputs: {} },
    { player_duke_slug: 'cornelius_the_dreamer', dark_lord_duke_slug: 'drakkenstrike', victory_condition: 'monster_attacks_empty_column', winner: 'dark_lord', resolution: 'dark_lord_auto', player_total: 0, dark_lord_total: 0, player_inputs: {}, dark_lord_inputs: {} },
  ]

  const strategy = buildSoloStrategySections(rows)

  assert.equal(strategy.winPatterns.strongestDuke?.dukeSlug, 'aguilar_the_gilded_knight')
  assert.equal(strategy.riskPatterns.toughestDarkLord?.dukeSlug, 'drakkenstrike')
})

test('buildSoloStrategySections keeps duke-less auto rows in loss split but excludes them from matchup rankings', () => {
  const rows = [
    { player_duke_slug: '', dark_lord_duke_slug: '', victory_condition: 'monster_attacks_empty_column', winner: 'dark_lord', resolution: 'dark_lord_auto', player_total: 0, dark_lord_total: 0, player_inputs: {}, dark_lord_inputs: {} },
    { player_duke_slug: 'aguilar_the_gilded_knight', dark_lord_duke_slug: 'gurika_the_guardian', victory_condition: 'five_stacks_exhausted', winner: 'player', resolution: 'contested', player_total: 48, dark_lord_total: 40, player_inputs: { gold: 7, vp: 6 }, dark_lord_inputs: {} },
    { player_duke_slug: 'aguilar_the_gilded_knight', dark_lord_duke_slug: 'gurika_the_guardian', victory_condition: 'five_stacks_exhausted', winner: 'player', resolution: 'contested', player_total: 44, dark_lord_total: 36, player_inputs: { gold: 6, vp: 6 }, dark_lord_inputs: {} },
    { player_duke_slug: 'aguilar_the_gilded_knight', dark_lord_duke_slug: 'gurika_the_guardian', victory_condition: 'five_stacks_exhausted', winner: 'player', resolution: 'contested', player_total: 42, dark_lord_total: 39, player_inputs: { gold: 6, vp: 5 }, dark_lord_inputs: {} },
  ]

  const strategy = buildSoloStrategySections(rows)
  const matchups = buildSoloMatchupRows(rows)

  assert.deepEqual(strategy.riskPatterns.lossTypeSplit, { autoLosses: 1, contestedLosses: 0 })
  assert.equal(matchups.every((row) => row.playerDukeSlug && row.darkLordDukeSlug), true)
})
```

- [ ] **Step 2: Run the aggregate tests to verify they fail**

Run: `node --test lib/solo-stats.test.js`
Expected: FAIL with missing export or missing property assertions for the new strategy builders.

- [ ] **Step 3: Write the failing screen layout test**

```js
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const source = fs.readFileSync(path.join(process.cwd(), 'app', 'solo-stats.tsx'), 'utf8')

test('solo stats screen renders strategy sections before solo point distribution', () => {
  assert.match(source, /Win Patterns/)
  assert.match(source, /Risk Patterns/)
  assert.match(source, /Matchups/)
  assert.match(
    source,
    /Win Patterns[\s\S]*Risk Patterns[\s\S]*Matchups[\s\S]*Solo Point Distribution/
  )
})
```

- [ ] **Step 4: Run the screen layout test to verify it fails**

Run: `node --test lib/solo-stats-screen-layout.test.js`
Expected: FAIL because the strategy section titles do not exist yet in `app/solo-stats.tsx`.

### Task 2: Implement Strategy Aggregates in `lib/solo-stats.ts`

**Files:**
- Modify: `C:\Users\izzyh\Desktop\valeria-score\lib\solo-stats.ts`
- Test: `C:\Users\izzyh\Desktop\valeria-score\lib\solo-stats.test.js`

- [ ] **Step 1: Add strategy summary types**

```ts
export type SoloStrategyStatRow = {
  label: string
  value: string
  helper: string
}

export type SoloMatchupRow = {
  playerDukeSlug: string
  darkLordDukeSlug: string
  games: number
  wins: number
  losses: number
  winRate: number
  avgMargin: number
}

export type SoloStrategySections = {
  winPatterns: {
    strongestDuke: SoloDukeUsageRow | null
    bestVictoryCondition: SoloConditionSummaryRow | null
    contestedConversion: { wins: number; total: number; winRate: number }
    winningInsight: string
  }
  riskPatterns: {
    hardestVictoryCondition: SoloConditionSummaryRow | null
    toughestDarkLord: SoloDukeUsageRow | null
    lossTypeSplit: { autoLosses: number; contestedLosses: number }
    lossTrapCategory: string
    lossInsight: string
  }
  matchups: {
    best: SoloMatchupRow[]
    worst: SoloMatchupRow[]
    mostPlayed: SoloMatchupRow | null
  }
}
```

- [ ] **Step 2: Implement matchup aggregation and threshold helpers**

```ts
function buildMatchupKey(row: SoloGameResultRow) {
  return `${row.playerDukeSlug}__${row.darkLordDukeSlug}`
}

function qualifiesForStrategyRanking(games: number) {
  return games >= 3
}

export function buildSoloMatchupRows(rows: RawSoloRow[] | SoloGameResultRow[]) {
  const normalized = normalizeSoloResultRows(rows as RawSoloRow[]).filter(
    (row) => row.playerDukeSlug.length > 0 && row.darkLordDukeSlug.length > 0
  )

  const aggregate = new Map<string, { playerDukeSlug: string; darkLordDukeSlug: string; games: number; wins: number; losses: number; totalMargin: number }>()

  for (const row of normalized) {
    const key = buildMatchupKey(row)
    const bucket = aggregate.get(key) ?? {
      playerDukeSlug: row.playerDukeSlug,
      darkLordDukeSlug: row.darkLordDukeSlug,
      games: 0,
      wins: 0,
      losses: 0,
      totalMargin: 0,
    }
    bucket.games += 1
    bucket.totalMargin += row.playerTotal - row.darkLordTotal
    if (row.winner === 'player') bucket.wins += 1
    else bucket.losses += 1
    aggregate.set(key, bucket)
  }

  return [...aggregate.values()].map((bucket) => ({
    ...bucket,
    winRate: roundRate(bucket.wins, bucket.games),
    avgMargin: averageRounded(bucket.totalMargin, bucket.games),
  }))
}
```

- [ ] **Step 3: Implement strategy section builders**

```ts
export function buildSoloStrategySections(rows: RawSoloRow[] | SoloGameResultRow[]): SoloStrategySections {
  const normalized = normalizeSoloResultRows(rows as RawSoloRow[])
  const conditionRows = buildSoloConditionRows(normalized)
  const playerDukeRows = buildSoloDukeUsageRows(normalized).filter((row) => qualifiesForStrategyRanking(row.games))
  const darkLordRows = buildSoloDarkLordUsageRows(normalized).filter((row) => qualifiesForStrategyRanking(row.games))
  const matchupRows = buildSoloMatchupRows(normalized)
  const qualifiedMatchups = matchupRows.filter((row) => qualifiesForStrategyRanking(row.games))

  const contestedRows = normalized.filter((row) => row.resolution === 'contested')
  const contestedWins = contestedRows.filter((row) => row.winner === 'player').length
  const winCategoryStats = buildSoloCategoryStats(normalized.filter((row) => row.winner === 'player'), cardsLookup)
  const lossCategoryStats = buildSoloCategoryStats(normalized.filter((row) => row.winner === 'dark_lord'), cardsLookup)

  return {
    winPatterns: {
      strongestDuke: playerDukeRows[0] ?? null,
      bestVictoryCondition: [...conditionRows].sort((a, b) => b.winRate - a.winRate)[0] ?? null,
      contestedConversion: {
        wins: contestedWins,
        total: contestedRows.length,
        winRate: roundRate(contestedWins, contestedRows.length),
      },
      winningInsight: buildSoloCategoryInsight(winCategoryStats, 'wins'),
    },
    riskPatterns: {
      hardestVictoryCondition: [...conditionRows].sort((a, b) => a.winRate - b.winRate)[0] ?? null,
      toughestDarkLord: [...darkLordRows].sort((a, b) => a.winRate - b.winRate || a.avgPlayerTotal - b.avgPlayerTotal)[0] ?? null,
      lossTypeSplit: {
        autoLosses: normalized.filter((row) => row.resolution === 'dark_lord_auto').length,
        contestedLosses: normalized.filter((row) => row.resolution === 'contested' && row.winner === 'dark_lord').length,
      },
      lossTrapCategory: buildSoloLossTrapCategory(winCategoryStats, lossCategoryStats),
      lossInsight: buildSoloLossInsight(winCategoryStats, lossCategoryStats),
    },
    matchups: {
      best: rankSoloMatchups(qualifiedMatchups, 'best').slice(0, 3),
      worst: rankSoloMatchups(qualifiedMatchups, 'worst').slice(0, 3),
      mostPlayed: rankSoloMostPlayedMatchup(matchupRows),
    },
  }
}
```

- [ ] **Step 4: Add the new strategy fields to the solo stats bundle**

```ts
export type SoloStatsBundle = {
  rows: SoloGameResultRow[]
  summary: SoloStatsSummary
  playerDukeRows: SoloDukeUsageRow[]
  darkLordRows: SoloDukeUsageRow[]
  categoryStats: PlayerCategoryStats
  conditionRows: SoloConditionSummaryRow[]
  strategy: SoloStrategySections
}

export async function loadSoloStatsBundle(ownerUserId?: string | null): Promise<SoloStatsBundle> {
  const rows = await loadSoloResults(ownerUserId)

  return {
    rows,
    summary: buildSoloStatsSummary(rows),
    playerDukeRows: buildSoloDukeUsageRows(rows),
    darkLordRows: buildSoloDarkLordUsageRows(rows),
    categoryStats: buildSoloCategoryStats(rows),
    conditionRows: buildSoloConditionRows(rows),
    strategy: buildSoloStrategySections(rows),
  }
}
```

- [ ] **Step 5: Run the aggregate tests to verify they pass**

Run: `node --test lib/solo-stats.test.js`
Expected: PASS

### Task 3: Render Strategy Sections on `app/solo-stats.tsx`

**Files:**
- Modify: `C:\Users\izzyh\Desktop\valeria-score\app\solo-stats.tsx`
- Test: `C:\Users\izzyh\Desktop\valeria-score\lib\solo-stats-screen-layout.test.js`

- [ ] **Step 1: Add small strategy presentation helpers**

```tsx
function SoloInsightCard({
  title,
  subtitle,
  rows,
  footer,
}: {
  title: string
  subtitle: string
  rows: Array<{ label: string; value: string; helper: string }>
  footer?: string
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.kicker}>{subtitle}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
      {rows.map((row) => (
        <View key={row.label} style={styles.listRow}>
          <View style={styles.listCopy}>
            <Text style={styles.listTitle}>{row.label}</Text>
            <Text style={styles.listSubtitle}>{row.helper}</Text>
          </View>
          <View style={styles.listValueGroup}>
            <Text style={styles.listValue}>{row.value}</Text>
          </View>
        </View>
      ))}
      {footer ? <Text style={styles.insightFooter}>{footer}</Text> : null}
    </View>
  )
}
```

- [ ] **Step 2: Render `Win Patterns`, `Risk Patterns`, and `Matchups` in the approved order**

```tsx
<SoloConditionCard rows={bundle.conditionRows} />

<SoloInsightCard
  title="Win Patterns"
  subtitle="What is working in your solo runs"
  rows={buildWinPatternRows(bundle.strategy.winPatterns)}
  footer={bundle.strategy.winPatterns.winningInsight}
/>

<SoloInsightCard
  title="Risk Patterns"
  subtitle="Where solo games usually slip away"
  rows={buildRiskPatternRows(bundle.strategy.riskPatterns)}
  footer={bundle.strategy.riskPatterns.lossInsight}
/>

<SoloMatchupListCard matchups={bundle.strategy.matchups} />

<PlayerCategoryBreakdownCard
  stats={bundle.categoryStats}
  title="Where Your Solo Points Come From"
  kicker="Solo Point Distribution"
  emptyHint="No saved solo scores yet — this fills in after solo games are tracked."
/>
```

- [ ] **Step 3: Add empty-state copy for under-threshold strategy sections**

```tsx
const notEnoughData = 'Not enough solo data yet'

function formatQualifiedValue(value: string | null, helper: string) {
  return value ? { value, helper } : { value: notEnoughData, helper: 'Need 3 games before this ranking appears.' }
}
```

- [ ] **Step 4: Run the screen layout test to verify it passes**

Run: `node --test lib/solo-stats-screen-layout.test.js`
Expected: PASS

### Task 4: Verify the Full Change Set

**Files:**
- Modify: `C:\Users\izzyh\Desktop\valeria-score\lib\solo-stats.test.js`
- Modify: `C:\Users\izzyh\Desktop\valeria-score\lib\solo-stats.ts`
- Modify: `C:\Users\izzyh\Desktop\valeria-score\app\solo-stats.tsx`
- Create: `C:\Users\izzyh\Desktop\valeria-score\lib\solo-stats-screen-layout.test.js`

- [ ] **Step 1: Run targeted tests**

Run: `node --test lib/solo-stats.test.js lib/solo-stats-screen-layout.test.js`
Expected: PASS

- [ ] **Step 2: Run full project tests**

Run: `cmd /c npm test`
Expected: PASS with 0 failures

- [ ] **Step 3: Run typecheck**

Run: `.\node_modules\.bin\tsc.cmd --noEmit`
Expected: exit 0

- [ ] **Step 4: Run lint**

Run: `cmd /c npm run lint`
Expected: 0 errors; existing warnings may remain
