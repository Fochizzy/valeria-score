# Score Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the score flow so `app/score.tsx` and `lib/scores.ts` are easier to understand and test without changing current behavior.

**Architecture:** Expand `lib/score-screen-state.ts` into the home for pure score-screen decisions, then refactor `app/score.tsx` to consume those helpers while keeping alerts, router calls, and JSX local to the screen. In parallel, introduce a small pure persistence-helper module that centralizes score lookup and row mapping so `lib/scores.ts` can reuse shared guest/player logic instead of duplicating branches.

**Tech Stack:** Expo Router, React Native, TypeScript, Supabase JS client, Node built-in test runner

---

## File Map

- Modify: `app/score.tsx`
  Responsibility: remain the score-screen orchestrator for params, state, effects, alerts, router actions, and rendering, while consuming extracted helper decisions instead of owning inline guard logic.

- Modify: `lib/score-screen-state.ts`
  Responsibility: hold pure score-screen helpers for context items, load/save state, button labels, compare routes, and confirmation decisions.

- Modify: `lib/score-screen-state.test.js`
  Responsibility: lock the extracted score-screen behavior before the screen is refactored.

- Create: `lib/score-persistence-state.ts`
  Responsibility: hold pure score-persistence helpers for row mapping and guest/player lookup resolution.

- Create: `lib/score-persistence-state.test.js`
  Responsibility: cover the new persistence-helper behavior without reaching into Supabase network calls.

- Modify: `lib/scores.ts`
  Responsibility: keep the existing exported API but route its guest/player branches through the shared persistence helpers.

Use path-limited commits throughout because this workspace already contains unrelated staged and unstaged changes.

### Task 1: Extract score screen context and state helpers

**Files:**
- Modify: `lib/score-screen-state.ts`
- Modify: `lib/score-screen-state.test.js`

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScoreSessionContextItems,
  resolveScoreScreenState,
} from './score-screen-state.ts'

test('buildScoreSessionContextItems returns join code, entry type, state, and saved metadata', () => {
  const items = buildScoreSessionContextItems({
    joinCode: '',
    isGuestMode: true,
    isLocked: false,
    loadError: '',
    resolvingSession: false,
    loadingExisting: false,
    lastSavedAt: '',
  })

  assert.deepEqual(items, [
    {
      label: 'Join Code',
      value: '------',
      tone: 'accent',
      disabled: true,
    },
    {
      label: 'Entry',
      value: 'Guest entry',
      tone: 'default',
    },
    {
      label: 'State',
      value: 'Open',
      tone: 'default',
    },
    {
      label: 'Saved',
      value: 'Not saved yet',
      tone: 'default',
    },
  ])
})

test('resolveScoreScreenState keeps interaction blocked while loading, locked, or missing a session', () => {
  const loadingState = resolveScoreScreenState({
    effectiveSessionId: 'session-1',
    resolvingSession: true,
    loadingExisting: false,
    saving: false,
    loadError: '',
    isLocked: false,
  })

  const lockedState = resolveScoreScreenState({
    effectiveSessionId: 'session-1',
    resolvingSession: false,
    loadingExisting: false,
    saving: false,
    loadError: '',
    isLocked: true,
  })

  const missingSessionState = resolveScoreScreenState({
    effectiveSessionId: '',
    resolvingSession: false,
    loadingExisting: false,
    saving: false,
    loadError: '',
    isLocked: false,
  })

  assert.equal(loadingState.isWorking, true)
  assert.equal(loadingState.isInteractionBlocked, true)
  assert.equal(lockedState.isInteractionBlocked, true)
  assert.equal(missingSessionState.isInteractionBlocked, true)
})

test('resolveScoreScreenState surfaces the retry-needed state when loadError is present', () => {
  const state = resolveScoreScreenState({
    effectiveSessionId: 'session-1',
    resolvingSession: false,
    loadingExisting: false,
    saving: false,
    loadError: 'Failed to load the saved score.',
    isLocked: false,
  })

  assert.equal(state.isWorking, false)
  assert.equal(state.isInteractionBlocked, true)
  assert.equal(state.entryStateLabel, 'Needs retry')
  assert.equal(state.entryStateTone, 'warning')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node .\lib\score-screen-state.test.js`
Expected: FAIL with missing-export errors for `buildScoreSessionContextItems` and `resolveScoreScreenState`.

- [ ] **Step 3: Write minimal implementation**

```ts
import { sessionUiCopy } from './p3-feedback'

type ScoreContextTone = 'accent' | 'default' | 'warning' | 'success'

type BuildScoreSessionContextItemsInput = {
  joinCode: string | null | undefined
  isGuestMode: boolean
  isLocked: boolean
  loadError: string
  resolvingSession: boolean
  loadingExisting: boolean
  lastSavedAt: string
}

type ResolveScoreScreenStateInput = {
  effectiveSessionId: string
  resolvingSession: boolean
  loadingExisting: boolean
  saving: boolean
  loadError: string
  isLocked: boolean
}

export function resolveScoreSessionId(
  routeSessionId: string | null | undefined,
  storedSessionId: string | null | undefined
) {
  const nextRouteSessionId = routeSessionId?.trim() ?? ''
  const nextStoredSessionId = storedSessionId?.trim() ?? ''

  return nextRouteSessionId || nextStoredSessionId || ''
}

export function resolveScoreScreenState({
  effectiveSessionId,
  resolvingSession,
  loadingExisting,
  saving,
  loadError,
  isLocked,
}: ResolveScoreScreenStateInput) {
  const isWorking = resolvingSession || loadingExisting || saving
  const isInteractionBlocked =
    isLocked || isWorking || Boolean(loadError) || !effectiveSessionId

  return {
    isWorking,
    isInteractionBlocked,
    entryStateLabel: isLocked
      ? sessionUiCopy.lockedState
      : loadError
      ? 'Needs retry'
      : resolvingSession || loadingExisting
      ? 'Loading'
      : 'Open',
    entryStateTone: isLocked
      ? ('success' as const)
      : loadError
      ? ('warning' as const)
      : ('default' as const),
  }
}

export function buildScoreSessionContextItems({
  joinCode,
  isGuestMode,
  isLocked,
  loadError,
  resolvingSession,
  loadingExisting,
  lastSavedAt,
}: BuildScoreSessionContextItemsInput) {
  const state = resolveScoreScreenState({
    effectiveSessionId: 'session-context-only',
    resolvingSession,
    loadingExisting,
    saving: false,
    loadError,
    isLocked,
  })
  const safeJoinCode = String(joinCode ?? '').trim() || '------'

  return [
    {
      label: sessionUiCopy.joinCodeLabel,
      value: safeJoinCode,
      tone: 'accent' as ScoreContextTone,
      disabled: safeJoinCode === '------',
    },
    {
      label: 'Entry',
      value: isGuestMode ? 'Guest entry' : 'Player entry',
      tone: 'default' as ScoreContextTone,
    },
    {
      label: 'State',
      value: state.entryStateLabel,
      tone: state.entryStateTone,
    },
    {
      label: sessionUiCopy.savedLabel,
      value: lastSavedAt
        ? new Date(lastSavedAt).toLocaleDateString()
        : 'Not saved yet',
      tone: lastSavedAt ? ('accent' as ScoreContextTone) : ('default' as ScoreContextTone),
    },
  ]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node .\lib\score-screen-state.test.js`
Expected: PASS with the new context/state helpers covered alongside the existing dirty-state tests.

- [ ] **Step 5: Commit**

```bash
git add lib/score-screen-state.ts lib/score-screen-state.test.js
git commit --only -m "refactor: extract score screen state helpers" -- lib/score-screen-state.ts lib/score-screen-state.test.js
```

### Task 2: Extract score save-button, compare-route, and confirmation helpers

**Files:**
- Modify: `lib/score-screen-state.ts`
- Modify: `lib/score-screen-state.test.js`

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScoreCompareRoute,
  resolveScoreSaveButtonState,
  shouldConfirmDukeChange,
  shouldConfirmScoreReset,
} from './score-screen-state.ts'

test('resolveScoreSaveButtonState preserves the current score button copy', () => {
  assert.deepEqual(
    resolveScoreSaveButtonState({
      effectiveSessionId: 'session-1',
      selectedDukeSlug: '',
      saving: false,
      resolvingSession: false,
      loadingExisting: false,
      loadError: '',
      isGuestMode: false,
    }),
    {
      disabled: true,
      label: 'Select Duke',
    }
  )

  assert.deepEqual(
    resolveScoreSaveButtonState({
      effectiveSessionId: 'session-1',
      selectedDukeSlug: 'cornelius_the_dreamer',
      saving: false,
      resolvingSession: false,
      loadingExisting: false,
      loadError: '',
      isGuestMode: true,
    }),
    {
      disabled: false,
      label: 'Save Guest Score',
    }
  )
})

test('buildScoreCompareRoute keeps the compare params stable', () => {
  assert.deepEqual(buildScoreCompareRoute('session-1', 'ABCD12'), {
    pathname: '/compare',
    params: {
      sessionId: 'session-1',
      joinCode: 'ABCD12',
    },
  })
})

test('confirmation helpers match the current reset and change-duke rules', () => {
  assert.equal(
    shouldConfirmScoreReset({
      isLocked: false,
      isInteractionBlocked: false,
      hasAnyInputs: true,
    }),
    true
  )

  assert.equal(
    shouldConfirmScoreReset({
      isLocked: false,
      isInteractionBlocked: false,
      hasAnyInputs: false,
    }),
    false
  )

  assert.equal(
    shouldConfirmDukeChange({
      isInteractionBlocked: false,
      hasSelectedDuke: true,
      isDirty: true,
      hasAnyInputs: true,
    }),
    true
  )

  assert.equal(
    shouldConfirmDukeChange({
      isInteractionBlocked: false,
      hasSelectedDuke: true,
      isDirty: false,
      hasAnyInputs: false,
    }),
    false
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node .\lib\score-screen-state.test.js`
Expected: FAIL with missing-export or assertion errors until the new helper layer exists.

- [ ] **Step 3: Write minimal implementation**

```ts
type ResolveScoreSaveButtonStateInput = {
  effectiveSessionId: string
  selectedDukeSlug: string
  saving: boolean
  resolvingSession: boolean
  loadingExisting: boolean
  loadError: string
  isGuestMode: boolean
}

type ShouldConfirmScoreResetInput = {
  isLocked: boolean
  isInteractionBlocked: boolean
  hasAnyInputs: boolean
}

type ShouldConfirmDukeChangeInput = {
  isInteractionBlocked: boolean
  hasSelectedDuke: boolean
  isDirty: boolean
  hasAnyInputs: boolean
}

export function resolveScoreSaveButtonState({
  effectiveSessionId,
  selectedDukeSlug,
  saving,
  resolvingSession,
  loadingExisting,
  loadError,
  isGuestMode,
}: ResolveScoreSaveButtonStateInput) {
  const disabled =
    !effectiveSessionId ||
    !selectedDukeSlug ||
    saving ||
    resolvingSession ||
    loadingExisting ||
    Boolean(loadError)

  const label = !effectiveSessionId
    ? 'Missing Session'
    : !selectedDukeSlug
    ? 'Select Duke'
    : saving
    ? 'Saving...'
    : resolvingSession || loadingExisting
    ? 'Loading...'
    : isGuestMode
    ? 'Save Guest Score'
    : 'Save My Score'

  return { disabled, label }
}

export function buildScoreCompareRoute(sessionId: string, joinCode: string) {
  return {
    pathname: '/compare' as const,
    params: {
      sessionId,
      joinCode,
    },
  }
}

export function shouldConfirmScoreReset({
  isLocked,
  isInteractionBlocked,
  hasAnyInputs,
}: ShouldConfirmScoreResetInput) {
  if (isLocked || isInteractionBlocked) return false
  return hasAnyInputs
}

export function shouldConfirmDukeChange({
  isInteractionBlocked,
  hasSelectedDuke,
  isDirty,
  hasAnyInputs,
}: ShouldConfirmDukeChangeInput) {
  if (isInteractionBlocked) return false
  if (!hasSelectedDuke) return false
  return isDirty || hasAnyInputs
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node .\lib\score-screen-state.test.js`
Expected: PASS with save-button, compare-route, and confirmation behavior now covered.

- [ ] **Step 5: Commit**

```bash
git add lib/score-screen-state.ts lib/score-screen-state.test.js
git commit --only -m "refactor: add score screen action helpers" -- lib/score-screen-state.ts lib/score-screen-state.test.js
```

### Task 3: Refactor the score screen to consume the extracted helper layer

**Files:**
- Modify: `app/score.tsx`
- Modify: `lib/score-screen-state.ts`
- Modify: `lib/score-screen-state.test.js`

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import { buildScoreSessionContextItems } from './score-screen-state.ts'

test('buildScoreSessionContextItems keeps the locked state visible without changing the saved-date fallback', () => {
  const items = buildScoreSessionContextItems({
    joinCode: 'ABCD12',
    isGuestMode: false,
    isLocked: true,
    loadError: '',
    resolvingSession: false,
    loadingExisting: false,
    lastSavedAt: '',
  })

  assert.equal(items[2].value, 'Locked')
  assert.equal(items[2].tone, 'success')
  assert.equal(items[3].value, 'Not saved yet')
})
```

- [ ] **Step 2: Run the focused test to verify the current helper surface is incomplete**

Run: `node .\lib\score-screen-state.test.js`
Expected: FAIL if the locked/session-context behavior has not been captured exactly yet; update the helper before wiring it through the screen.

- [ ] **Step 3: Refactor `app/score.tsx` to consume helpers**

```ts
import {
  buildScoreCompareRoute,
  buildScoreSessionContextItems,
  hasUnsavedScoreChanges,
  resolveScoreSaveButtonState,
  resolveScoreScreenState,
  resolveScoreSessionId,
  shouldConfirmDukeChange,
  shouldConfirmScoreReset,
} from '../lib/score-screen-state'

const screenState = useMemo(
  () =>
    resolveScoreScreenState({
      effectiveSessionId,
      resolvingSession,
      loadingExisting,
      saving,
      loadError,
      isLocked,
    }),
  [effectiveSessionId, isLocked, loadError, loadingExisting, resolvingSession, saving]
)

const saveButtonState = useMemo(
  () =>
    resolveScoreSaveButtonState({
      effectiveSessionId,
      selectedDukeSlug: selectedDuke?.slug ?? '',
      saving,
      resolvingSession,
      loadingExisting,
      loadError,
      isGuestMode,
    }),
  [effectiveSessionId, isGuestMode, loadError, loadingExisting, resolvingSession, saving, selectedDuke]
)

const contextItems = useMemo(
  () =>
    buildScoreSessionContextItems({
      joinCode,
      isGuestMode,
      isLocked,
      loadError,
      resolvingSession,
      loadingExisting,
      lastSavedAt,
    }).map((item, index) =>
      index === 0 ? { ...item, onPress: copyJoinCode } : item
    ),
  [copyJoinCode, isGuestMode, isLocked, joinCode, lastSavedAt, loadError, loadingExisting, resolvingSession]
)

function openCompare(replace = false) {
  if (!effectiveSessionId) {
    Alert.alert('Missing session', 'Start or join a session before continuing.')
    return
  }

  const target = buildScoreCompareRoute(effectiveSessionId, joinCode)
  if (replace) {
    router.replace(target)
    return
  }

  router.push(target)
}

function confirmReset() {
  if (isLocked) {
    Alert.alert('Game finished', 'This score is locked because the game has already been finished.')
    return
  }

  if (screenState.isInteractionBlocked) return

  if (!shouldConfirmScoreReset({
    isLocked,
    isInteractionBlocked: screenState.isInteractionBlocked,
    hasAnyInputs: hasAnyInput(inputs),
  })) {
    setInputs(createEmptyInputs())
    return
  }

  Alert.alert('Clear all inputs?', 'This will reset every scoring value on the screen.', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Clear',
      style: 'destructive',
      onPress: () => {
        setSaveFeedback(null)
        setInputs(createEmptyInputs())
      },
    },
  ])
}
```

Also update the render conditions to read from `screenState` and `saveButtonState` instead of recomputing the same booleans inline.

- [ ] **Step 4: Run focused verification**

Run: `node .\lib\score-screen-state.test.js`
Expected: PASS

Run: `node .\node_modules\eslint\bin\eslint.js app/score.tsx lib/score-screen-state.ts lib/score-screen-state.test.js`
Expected: PASS with no new lint issues in the touched score-screen files.

Run: `node .\node_modules\typescript\bin\tsc --noEmit`
Expected: PASS with no type regressions from the score screen refactor.

- [ ] **Step 5: Commit**

```bash
git add app/score.tsx lib/score-screen-state.ts lib/score-screen-state.test.js
git commit --only -m "refactor: simplify score screen orchestration" -- app/score.tsx lib/score-screen-state.ts lib/score-screen-state.test.js
```

### Task 4: Extract pure persistence helpers and refactor `lib/scores.ts`

**Files:**
- Create: `lib/score-persistence-state.ts`
- Create: `lib/score-persistence-state.test.js`
- Modify: `lib/scores.ts`

- [ ] **Step 1: Write the failing test**

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  mapExistingScoreRecord,
  resolveScoreLookupContext,
} from './score-persistence-state.ts'

test('resolveScoreLookupContext preserves guest-entry priority and player authentication errors', () => {
  assert.deepEqual(
    resolveScoreLookupContext({
      guestMode: true,
      guestEntryId: 'entry-1',
      guestProfileId: 'guest-1',
      ownerUserId: null,
    }),
    {
      lookup: {
        kind: 'guest',
        eqFilters: [{ field: 'guest_entry_id', value: 'entry-1' }],
        nullFilters: [],
      },
      missingIdentityMessage: 'Missing guest identifier',
    }
  )

  assert.deepEqual(
    resolveScoreLookupContext({
      guestMode: false,
      guestEntryId: null,
      guestProfileId: null,
      ownerUserId: null,
    }),
    {
      lookup: null,
      missingIdentityMessage: 'User not authenticated',
    }
  )
})

test('mapExistingScoreRecord normalizes nullish database input into the public score record shape', () => {
  const record = mapExistingScoreRecord({
    id: 7,
    session_id: 'session-1',
    duke_slug: 'cornelius_the_dreamer',
    score_total: 31,
    inputs: { vp: 7, gold: 0 },
    updated_at: '2026-04-22T18:00:00.000Z',
    game_locked: 1,
    included_in_stats: 0,
    guest_profile_id: null,
    guest_entry_id: null,
    player_name: null,
    owner_user_id: 'user-1',
  })

  assert.equal(record.id, '7')
  assert.equal(record.session_id, 'session-1')
  assert.equal(record.score_total, 31)
  assert.equal(record.game_locked, true)
  assert.equal(record.included_in_stats, false)
  assert.equal(record.inputs.vp, 7)
  assert.equal(record.owner_user_id, 'user-1')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node .\lib\score-persistence-state.test.js`
Expected: FAIL because `lib/score-persistence-state.ts` does not exist yet.

- [ ] **Step 3: Implement the helper module and refactor `lib/scores.ts`**

```ts
import { normalizeScoreInputs, type ScoreInputs } from './scoring'
import {
  buildScoreRowLookup,
  type ScoreRowIdentityOptions,
  type ScoreRowLookup,
} from './score-row-identity'

export type ExistingScoreRecord = {
  id: string
  session_id: string
  duke_slug: string | null
  score_total: number | null
  inputs: ScoreInputs
  updated_at: string | null
  game_locked: boolean
  included_in_stats: boolean
  guest_profile_id: string | null
  guest_entry_id: string | null
  player_name: string | null
  owner_user_id: string | null
}

type ScoreLookupContextInput = ScoreRowIdentityOptions

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeInputsFromDb(value: unknown): ScoreInputs {
  if (!isObject(value)) {
    return normalizeScoreInputs({})
  }

  return normalizeScoreInputs(value as Partial<ScoreInputs>)
}

export function resolveScoreLookupContext(input: ScoreLookupContextInput): {
  lookup: ScoreRowLookup | null
  missingIdentityMessage: string
} {
  return {
    lookup: buildScoreRowLookup(input),
    missingIdentityMessage: input.guestMode ? 'Missing guest identifier' : 'User not authenticated',
  }
}

export function mapExistingScoreRecord(row: any): ExistingScoreRecord {
  return {
    id: String(row.id),
    session_id: String(row.session_id),
    duke_slug: row.duke_slug ?? null,
    score_total: typeof row.score_total === 'number' ? row.score_total : null,
    inputs: normalizeInputsFromDb(row.inputs),
    updated_at: row.updated_at ?? null,
    game_locked: Boolean(row.game_locked),
    included_in_stats: Boolean(row.included_in_stats),
    guest_profile_id: row.guest_profile_id ?? null,
    guest_entry_id: row.guest_entry_id ?? null,
    player_name: row.player_name ?? null,
    owner_user_id: row.owner_user_id ?? null,
  }
}
```

```ts
import {
  mapExistingScoreRecord,
  resolveScoreLookupContext,
} from './score-persistence-state'

async function loadLatestScoreRecord(sessionId: string, lookup: ScoreRowLookup) {
  const data = await loadLatestScoreRow(sessionId, lookup)
  return data ? mapExistingScoreRecord(data) : null
}

async function resolveLoadLookup(options: LoadScoreOptions, ownerUserId?: string | null) {
  const { lookup } = resolveScoreLookupContext({
    guestMode: options.guestMode,
    guestEntryId: options.guestEntryId,
    guestProfileId: options.guestProfileId,
    ownerUserId,
  })

  return lookup
}

async function resolveSaveLookupOrThrow(options: SaveScoreOptions, ownerUserId?: string | null) {
  const context = resolveScoreLookupContext({
    guestMode: options.guestMode,
    guestEntryId: options.guestEntryId,
    guestProfileId: options.guestProfileId,
    ownerUserId,
  })

  if (!context.lookup) {
    throw new Error(context.missingIdentityMessage)
  }

  return context.lookup
}

async function upsertScoreRow(payload: Record<string, unknown>, sessionId: string, lookup: ScoreRowLookup) {
  const existingId = await findExistingScoreId(sessionId, lookup)

  if (existingId) {
    const { data, error } = await supabase
      .from('session_scores')
      .update(payload)
      .eq('id', existingId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  const { data, error } = await supabase
    .from('session_scores')
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}
```

Use the helper module so `loadMyExistingScore(...)`, `saveMyScore(...)`, and `setMyScoreLocked(...)` differ only where guest/player identity actually differs.

- [ ] **Step 4: Run verification commands**

Run: `node .\lib\score-persistence-state.test.js`
Expected: PASS

Run: `node .\lib\score-screen-state.test.js`
Expected: PASS

Run: `node .\lib\score-save-payload.test.js`
Expected: PASS

Run: `node .\lib\score-row-identity.test.js`
Expected: PASS, confirming the refactor still lines up with the existing score identity/payload helpers.

Run: `node .\node_modules\eslint\bin\eslint.js app/score.tsx lib/score-screen-state.ts lib/score-screen-state.test.js lib/score-persistence-state.ts lib/score-persistence-state.test.js lib/scores.ts`
Expected: PASS

Run: `node .\node_modules\typescript\bin\tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/score-persistence-state.ts lib/score-persistence-state.test.js lib/scores.ts
git commit --only -m "refactor: dedupe score persistence logic" -- lib/score-persistence-state.ts lib/score-persistence-state.test.js lib/scores.ts
```
