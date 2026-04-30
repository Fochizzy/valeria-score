# Victory Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the post-finish compare alert with a dedicated Victory screen that shows a winner card, final leaderboard, share action, new-session action, and a short fireworks celebration.

**Architecture:** Keep the new end-state mostly additive by introducing small helper modules for victory/result logic, a focused fireworks component, and a dedicated `app/victory.tsx` route. Reuse the existing compare data shape and share message format so `compare.tsx` only needs a small finish-flow change plus shared result helpers.

**Tech Stack:** Expo Router, React Native, node:test, TypeScript modules, Supabase client helpers, React Native `Animated`

---

### Task 1: Add pure result helpers with red-green tests

**Files:**
- Create: `lib/victory-results.ts`
- Create: `lib/victory-results.test.js`
- Create: `lib/victory-route.ts`
- Create: `lib/victory-route.test.js`

- [ ] **Step 1: Write the failing winner/share tests**

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildResultsShareMessage,
  resolveVictoryWinner,
} from './victory-results.ts'

const entries = [
  {
    id: 'score-1',
    scoreId: 'score-1',
    label: 'Izzy',
    playerId: 'FOCHIZZY',
    totalScore: 44,
    locked: true,
    isGuest: false,
    userId: 'user-1',
    dukeSlug: 'cornelius_the_dreamer',
    dukeName: 'Cornelius the Dreamer',
    placement: 1,
    isWinner: true,
    hasScore: true,
    guestProfileId: null,
    guestEntryId: null,
  },
]

test('resolveVictoryWinner prefers explicit winners before placement fallback', () => {
  assert.equal(resolveVictoryWinner(entries)?.label, 'Izzy')
})

test('buildResultsShareMessage emits ranked final standings', () => {
  const message = buildResultsShareMessage(entries)
  assert.match(message, /^Valeria Results/)
  assert.match(message, /1\.\s+👑\s+Izzy \(FOCHIZZY\) - 44 - Cornelius the Dreamer/)
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node lib/victory-results.test.js`
Expected: FAIL with module-not-found or missing-export errors for the new victory helpers

- [ ] **Step 3: Implement the minimal result helpers**

```ts
import type { CompareEntry } from './compare-entries.ts'

export function resolveVictoryWinner(entries: CompareEntry[]) {
  const scored = entries.filter((entry) => entry.hasScore)
  return (
    scored.find((entry) => entry.isWinner) ??
    scored.find((entry) => entry.placement === 1) ??
    scored[0] ??
    null
  )
}

export function buildResultsShareMessage(entries: CompareEntry[]) {
  const lines = entries
    .filter((entry) => entry.hasScore)
    .map((entry, index) => {
      const crown = entry.isWinner || index === 0 ? '👑 ' : ''
      const idText = entry.playerId ? ` (${entry.playerId})` : ''
      const rankText = entry.placement ? `${entry.placement}. ` : `${index + 1}. `
      return `${rankText}${crown}${entry.label}${idText} - ${entry.totalScore} - ${entry.dukeName}`
    })

  return ['Valeria Results', '', ...lines].join('\n')
}
```

- [ ] **Step 4: Add the route helper and its failing-then-passing test**

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import { buildVictoryRoute } from './victory-route.ts'

test('buildVictoryRoute keeps session and join code in navigation params', () => {
  assert.deepEqual(buildVictoryRoute('session-1', 'ABCD12'), {
    pathname: '/victory',
    params: { sessionId: 'session-1', joinCode: 'ABCD12' },
  })
})
```

```ts
export function buildVictoryRoute(sessionId: string, joinCode = '') {
  return {
    pathname: '/victory' as const,
    params: {
      sessionId,
      joinCode,
    },
  }
}
```

- [ ] **Step 5: Run the helper tests to verify they pass**

Run:

```bash
node lib/victory-results.test.js
node lib/victory-route.test.js
```

Expected: PASS for all new helper tests

### Task 2: Add a lightweight fireworks unit and Victory route

**Files:**
- Create: `components/VictoryFireworks.tsx`
- Create: `lib/victory-fireworks.ts`
- Create: `lib/victory-fireworks.test.js`
- Create: `app/victory.tsx`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Write the failing fireworks helper test**

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import { createVictoryFireworkBursts } from './victory-fireworks.ts'

test('createVictoryFireworkBursts returns short non-blocking burst config', () => {
  const bursts = createVictoryFireworkBursts()

  assert.equal(Array.isArray(bursts), true)
  assert.equal(bursts.length > 0, true)
  assert.equal(bursts.every((burst) => burst.durationMs <= 4000), true)
})
```

- [ ] **Step 2: Run the fireworks test to verify it fails**

Run: `node lib/victory-fireworks.test.js`
Expected: FAIL with module-not-found or missing-export errors

- [ ] **Step 3: Implement the burst helper and the visual component**

```ts
export function createVictoryFireworkBursts() {
  return [
    { key: 'left', top: '18%', left: '14%', color: '#F4C85C', durationMs: 2200 },
    { key: 'right', top: '14%', left: '72%', color: '#E4DAFF', durationMs: 2400 },
    { key: 'center', top: '8%', left: '44%', color: '#70D7A5', durationMs: 2600 },
  ]
}
```

```tsx
export default function VictoryFireworks() {
  return <View pointerEvents="none">{/* animated burst layers */}</View>
}
```

- [ ] **Step 4: Add the Victory screen and route registration**

```tsx
<Stack.Screen name="victory" />
```

```tsx
export default function VictoryScreen() {
  return (
    <ImageBackground>
      <VictoryFireworks />
      <ScrollView>{/* winner card, leaderboard, actions */}</ScrollView>
    </ImageBackground>
  )
}
```

- [ ] **Step 5: Run the fireworks helper test to verify it passes**

Run: `node lib/victory-fireworks.test.js`
Expected: PASS

### Task 3: Wire compare finish flow into Victory and verify

**Files:**
- Modify: `app/compare.tsx`
- Modify: `app/victory.tsx`
- Modify: `lib/victory-results.ts`
- Test: `lib/victory-results.test.js`

- [ ] **Step 1: Extend the result helper test with winner fallback coverage**

```js
test('resolveVictoryWinner falls back to placement and then sorted score order', () => {
  const placementWinner = resolveVictoryWinner([
    { ...entries[0], isWinner: false, placement: 1 },
  ])

  assert.equal(placementWinner?.placement, 1)
})
```

- [ ] **Step 2: Run the result helper test to verify the new assertion fails if fallback logic is wrong**

Run: `node lib/victory-results.test.js`
Expected: FAIL only if the fallback logic is missing or incorrect

- [ ] **Step 3: Update compare and victory to use the shared helpers**

```tsx
await finalizeGameStats(effectiveSessionId)
await fetchScores(false)
router.replace(buildVictoryRoute(effectiveSessionId, effectiveJoinCode))
```

```tsx
const winner = resolveVictoryWinner(scores)
const shareResults = async () => {
  await Share.share({
    title: 'Valeria Results',
    message: buildResultsShareMessage(scores),
  })
}
```

- [ ] **Step 4: Run targeted verification**

Run:

```bash
node lib/victory-results.test.js
node lib/victory-route.test.js
node lib/victory-fireworks.test.js
node lib/compare-entries.test.js
node lib/compare-score-route.test.js
node node_modules/typescript/bin/tsc --noEmit
```

Expected: all node tests PASS and `tsc --noEmit` exits with code `0`

- [ ] **Step 5: Review requirements against the spec**

Checklist:

- winner card exists on `app/victory.tsx`
- final leaderboard excludes pending rows
- `Share Results` is available on Victory
- `New Session` returns to `/create-session`
- compare finish alert is replaced by Victory navigation
- fireworks auto-play once and do not block taps
