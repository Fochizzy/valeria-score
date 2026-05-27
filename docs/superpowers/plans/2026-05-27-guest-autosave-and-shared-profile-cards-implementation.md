# Guest Autosave And Shared Profile Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved Option 1 design so true guest seats and added-player seats autosave scoring drafts into `public.session_scores`, guest profile cards show only safe in-progress visibility, and guest-to-real-account claim transfer continues through the modern `claim_guest_profile(text)` RPC without leaking live duke/score details before manual `Save`.

**Architecture:** Split the work into five boundaries. First, add draft columns and a shared-access guest dashboard contract in a new Supabase migration. Second, separate committed-save payloads from draft-autosave payloads in `lib/score-save-payload.ts`, and teach `lib/score-screen-state.ts` to keep committed baselines separate from draft baselines. Third, update `lib/scores.ts` and `app/score.tsx` so the score screen can load the freshest local-or-remote draft, debounce draft writes, and clear draft columns only on manual commit. Fourth, extend `lib/profile-dashboard-data.ts` and `app/profile.tsx` to show guest-card in-progress badges without exposing draft details. Fifth, replace the stale client-side `player_scores` claim helper with the canonical `claim_guest_profile(text)` RPC path in `lib/profile.ts`.

**Tech Stack:** Expo Router, React Native, TypeScript, Supabase Postgres/RPC, AsyncStorage, Node test runner

---

### Task 1: Add Failing Contract Tests First

**Files:**
- Modify: `C:\Users\izzyh\Desktop\valeria-score\lib\score-save-payload.test.js`
- Modify: `C:\Users\izzyh\Desktop\valeria-score\lib\score-screen-state.test.js`
- Modify: `C:\Users\izzyh\Desktop\valeria-score\lib\profile-dashboard-data.test.js`
- Create: `C:\Users\izzyh\Desktop\valeria-score\lib\guest-autosave-dashboard-migration.test.js`
- Create: `C:\Users\izzyh\Desktop\valeria-score\lib\profile-claim-rpc.test.js`

- [ ] **Step 1: Add red tests for separate draft vs committed payloads**

```js
import {
  buildScoreCommitPayload,
  buildScoreDraftPayload,
} from './score-save-payload.ts'

test('buildScoreDraftPayload writes only draft fields for guest autosave', () => {
  const payload = buildScoreDraftPayload({
    sessionId: 'session-1',
    dukeSlug: 'cornelius_the_dreamer',
    inputs: { gold: 3, magic: 1, fight: 0, vp: 4, hammer: 0, helmet: 0, key: 0, holy: 0, citizenCount: 0, monstersCount: 0, monsterPoints: 0, bossCount: 0, lieutenantCount: 0, beastCount: 0, minionCount: 0, domainCount: 0, domainPoints: 0 },
    totalScore: 29,
    updatedAt: '2026-05-27T18:00:00.000Z',
  })

  assert.deepEqual(payload, {
    draft_duke_slug: 'cornelius_the_dreamer',
    draft_inputs: payload.draft_inputs,
    draft_score_total: 29,
    draft_updated_at: '2026-05-27T18:00:00.000Z',
  })
  assert.equal(payload.duke_slug, undefined)
  assert.equal(payload.score_total, undefined)
})

test('buildScoreCommitPayload clears draft columns when the user taps Save', () => {
  const payload = buildScoreCommitPayload({
    sessionId: 'session-1',
    dukeSlug: 'aguilar_the_gilded_knight',
    inputs: { gold: 1, magic: 0, fight: 2, vp: 3, hammer: 0, helmet: 0, key: 0, holy: 0, citizenCount: 0, monstersCount: 0, monsterPoints: 0, bossCount: 0, lieutenantCount: 0, beastCount: 0, minionCount: 0, domainCount: 0, domainPoints: 0 },
    totalScore: 18,
    ownerUserId: 'user-1',
    scoredByUserId: 'adder-1',
    addedPlayerName: 'Bob',
    confirmedRevision: 4,
  })

  assert.equal(payload.duke_slug, 'aguilar_the_gilded_knight')
  assert.equal(payload.score_total, 18)
  assert.equal(payload.player_name, 'Bob')
  assert.equal(payload.draft_duke_slug, null)
  assert.equal(payload.draft_inputs, null)
  assert.equal(payload.draft_score_total, null)
  assert.equal(payload.draft_updated_at, null)
})
```

- [ ] **Step 2: Add red tests for draft-preferred resume state**

```js
test('resolveLoadedScoreState prefers the newer remote draft over the committed score', () => {
  const committedInputs = { ...createEmptyInputs(), gold: 1 }
  const remoteDraftInputs = { ...createEmptyInputs(), gold: 4 }

  const result = resolveLoadedScoreState({
    initialSlug: 'aguilar_the_gilded_knight',
    existingScore: {
      selectedSlug: 'aguilar_the_gilded_knight',
      inputs: committedInputs,
      updatedAt: '2026-05-27T17:00:00.000Z',
      isLocked: false,
      confirmedForCurrentRevision: true,
    },
    remoteDraft: {
      selectedSlug: 'cornelius_the_dreamer',
      inputs: remoteDraftInputs,
      updatedAt: '2026-05-27T18:00:00.000Z',
    },
    localDraft: null,
    sessionFinished: false,
  })

  assert.equal(result.selectedSlug, 'cornelius_the_dreamer')
  assert.deepEqual(result.inputs, remoteDraftInputs)
  assert.equal(result.committedBaselineSlug, 'aguilar_the_gilded_knight')
  assert.deepEqual(result.committedBaselineInputs, committedInputs)
  assert.equal(result.draftBaselineSlug, 'cornelius_the_dreamer')
  assert.deepEqual(result.draftBaselineInputs, remoteDraftInputs)
  assert.equal(result.lastCommittedAt, '2026-05-27T17:00:00.000Z')
  assert.equal(result.lastDraftSavedAt, '2026-05-27T18:00:00.000Z')
})

test('resolveLoadedScoreState prefers the newer local draft when it beats the remote timestamp', () => {
  const result = resolveLoadedScoreState({
    initialSlug: null,
    existingScore: null,
    remoteDraft: {
      selectedSlug: 'aguilar_the_gilded_knight',
      inputs: { ...createEmptyInputs(), gold: 2 },
      updatedAt: '2026-05-27T18:00:00.000Z',
    },
    localDraft: {
      selectedSlug: 'cornelius_the_dreamer',
      inputs: { ...createEmptyInputs(), gold: 5 },
      updatedAt: '2026-05-27T18:01:00.000Z',
    },
    sessionFinished: false,
  })

  assert.equal(result.selectedSlug, 'cornelius_the_dreamer')
  assert.equal(result.lastDraftSavedAt, '2026-05-27T18:01:00.000Z')
})
```

- [ ] **Step 3: Add red tests for guest-card draft badges without draft leakage**

```js
test('resolveProfileDashboard normalizes guest in-progress metadata without exposing live draft details', () => {
  const dashboard = resolveProfileDashboard({
    displayName: 'Izzy',
    sharedGuestProfiles: [
      {
        id: 'guest-1',
        display_name: 'Mara',
        contact_email: null,
        public_player_id: 'mara02',
        wins: '3',
        losses: '1',
        topDuke: 'Cornelius The Dreamer',
        totalGames: '4',
        inProgressCount: '2',
        lastDraftUpdatedAt: '2026-05-27T18:05:00.000Z',
      },
    ],
  })

  assert.deepEqual(dashboard.sharedGuestProfiles[0], {
    id: 'guest-1',
    display_name: 'Mara',
    contact_email: null,
    public_player_id: 'MARA02',
    stats: {
      wins: 3,
      losses: 1,
      topDuke: 'Cornelius The Dreamer',
      totalGames: 4,
      inProgressCount: 2,
      lastDraftUpdatedAt: '2026-05-27T18:05:00.000Z',
    },
  })
  assert.equal('draftDuke' in dashboard.sharedGuestProfiles[0].stats, false)
  assert.equal('draftScoreTotal' in dashboard.sharedGuestProfiles[0].stats, false)
})
```

- [ ] **Step 4: Add red SQL/source contract tests**

```js
test('guest autosave migration adds draft columns and guest-card badge fields', () => {
  const migration = readMigration()

  assert.match(migration, /add column if not exists draft_duke_slug text/i)
  assert.match(migration, /add column if not exists draft_inputs jsonb/i)
  assert.match(migration, /add column if not exists draft_score_total integer/i)
  assert.match(migration, /add column if not exists draft_updated_at timestamptz/i)
  assert.match(migration, /'inProgressCount'/i)
  assert.match(migration, /'lastDraftUpdatedAt'/i)
})

test('profile claim helper uses claim_guest_profile rpc instead of player_scores writes', () => {
  const source = readProfileSource()

  assert.match(source, /rpc\(\s*'claim_guest_profile'/)
  assert.doesNotMatch(source, /from\('player_scores'\)/)
  assert.doesNotMatch(source, /\.update\(\{\s*user_id:/s)
})
```

- [ ] **Step 5: Run the targeted contract tests and confirm they fail**

Run: `node --test lib/score-save-payload.test.js lib/score-screen-state.test.js lib/profile-dashboard-data.test.js lib/guest-autosave-dashboard-migration.test.js lib/profile-claim-rpc.test.js`

Expected: FAIL with missing draft payload exports, missing draft metadata fields, missing migration file, and stale `player_scores` assertions in `lib/profile.ts`.

---

### Task 2: Separate Draft And Commit Helpers

**Files:**
- Modify: `C:\Users\izzyh\Desktop\valeria-score\lib\score-save-payload.ts`
- Modify: `C:\Users\izzyh\Desktop\valeria-score\lib\score-screen-state.ts`
- Test: `C:\Users\izzyh\Desktop\valeria-score\lib\score-save-payload.test.js`
- Test: `C:\Users\izzyh\Desktop\valeria-score\lib\score-screen-state.test.js`

- [ ] **Step 1: Split payload construction into explicit draft and commit builders**

```ts
export function buildScoreDraftPayload(input: BuildScoreSavePayloadInput) {
  return {
    draft_duke_slug: input.dukeSlug,
    draft_inputs: input.inputs,
    draft_score_total: input.totalScore,
    draft_updated_at: input.updatedAt ?? new Date().toISOString(),
  }
}

export function buildScoreCommitPayload(input: BuildScoreSavePayloadInput) {
  const payload: Record<string, unknown> = {
    session_id: input.sessionId,
    duke_slug: input.dukeSlug,
    inputs: input.inputs,
    score_total: input.totalScore,
    game_locked: Boolean(input.lockScore),
    included_in_stats: Boolean(input.includedInStats),
    updated_at: input.updatedAt ?? new Date().toISOString(),
    draft_duke_slug: null,
    draft_inputs: null,
    draft_score_total: null,
    draft_updated_at: null,
  }

  // keep the existing guest / added-player identity stamping here
  return payload
}
```

- [ ] **Step 2: Extend score draft state with timestamps and add a freshest-draft chooser**

```ts
type ScoreDraftState = {
  selectedSlug: string | null
  inputs: ScoreInputs
  updatedAt: string
}

export function pickPreferredScoreDraft(
  remoteDraft: ScoreDraftState | null,
  localDraft: ScoreDraftState | null
) {
  if (!remoteDraft) return localDraft
  if (!localDraft) return remoteDraft

  return new Date(localDraft.updatedAt).getTime() > new Date(remoteDraft.updatedAt).getTime()
    ? localDraft
    : remoteDraft
}
```

- [ ] **Step 3: Teach `resolveLoadedScoreState` to keep separate committed and draft baselines**

```ts
export function resolveLoadedScoreState({
  initialSlug,
  existingScore,
  remoteDraft,
  localDraft,
  sessionFinished,
}: ResolveLoadedScoreStateInput) {
  const preferredDraft = pickPreferredScoreDraft(remoteDraft, localDraft)
  const committedBaselineInputs = existingScore?.inputs ?? createEmptyInputs()
  const committedBaselineSlug = normalizeSlug(existingScore?.selectedSlug)

  if (sessionFinished) {
    const empty = createEmptyInputs()
    return {
      selectedSlug: null,
      inputs: empty,
      committedBaselineSlug: null,
      committedBaselineInputs: empty,
      draftBaselineSlug: null,
      draftBaselineInputs: empty,
      lastCommittedAt: '',
      lastDraftSavedAt: '',
      isLocked: true,
    }
  }

  if (preferredDraft) {
    return {
      selectedSlug: normalizeSlug(preferredDraft.selectedSlug),
      inputs: preferredDraft.inputs,
      committedBaselineSlug,
      committedBaselineInputs,
      draftBaselineSlug: normalizeSlug(preferredDraft.selectedSlug),
      draftBaselineInputs: preferredDraft.inputs,
      lastCommittedAt: existingScore?.updatedAt ?? '',
      lastDraftSavedAt: preferredDraft.updatedAt,
      isLocked: Boolean(existingScore?.isLocked),
    }
  }

  // fall back to committed state or empty initial state
}
```

- [ ] **Step 4: Update stored local draft parsing to round-trip `updatedAt`**

```ts
export function parseStoredScoreDraft(value: string | null | undefined): ScoreDraftState | null {
  // parse JSON, keep selectedSlug and normalized inputs,
  // and default updatedAt to '' only when the draft is unusable
}
```

- [ ] **Step 5: Run the helper tests**

Run: `node --test lib/score-save-payload.test.js lib/score-screen-state.test.js`

Expected: PASS

---

### Task 3: Add Draft-Aware Score Persistence In `lib/scores.ts`

**Files:**
- Modify: `C:\Users\izzyh\Desktop\valeria-score\lib\scores.ts`
- Test: `C:\Users\izzyh\Desktop\valeria-score\lib\score-screen-state.test.js`
- Test: `C:\Users\izzyh\Desktop\valeria-score\lib\score-save-payload.test.js`

- [ ] **Step 1: Extend `ExistingScoreRecord` to carry both committed and draft fields**

```ts
export type ExistingScoreRecord = {
  id: string
  session_id: string
  duke_slug: string | null
  score_total: number | null
  inputs: ScoreInputs
  updated_at: string | null
  draft_duke_slug: string | null
  draft_score_total: number | null
  draft_inputs: ScoreInputs
  draft_updated_at: string | null
  game_locked: boolean
  included_in_stats: boolean
  confirmed_revision: number | null
  guest_profile_id: string | null
  guest_entry_id: string | null
  player_name: string | null
  owner_user_id: string | null
}
```

- [ ] **Step 2: Map DB rows into the new draft-aware record shape**

```ts
return {
  id: String(data.id),
  session_id: String(data.session_id),
  duke_slug: data.duke_slug ?? null,
  score_total: typeof data.score_total === 'number' ? data.score_total : null,
  inputs: normalizeInputsFromDb(data.inputs),
  updated_at: data.updated_at ?? null,
  draft_duke_slug: data.draft_duke_slug ?? null,
  draft_score_total:
    typeof data.draft_score_total === 'number' ? data.draft_score_total : null,
  draft_inputs: normalizeInputsFromDb(data.draft_inputs),
  draft_updated_at: data.draft_updated_at ?? null,
  // existing identity fields stay unchanged
}
```

- [ ] **Step 3: Add explicit `saveMyScoreDraft` and `saveMyScoreCommit` helpers**

```ts
export async function saveMyScoreDraft(
  sessionId: string,
  dukeSlug: string,
  inputs: ScoreInputs,
  totalScore: number,
  options: SaveScoreOptions = {}
) {
  const payload = buildScoreDraftPayload({
    sessionId,
    dukeSlug,
    inputs: normalizeScoreInputs(inputs),
    totalScore,
  })

  const existingId = await findExistingScoreId(sessionId, lookup)
  if (!existingId) {
    throw new Error('Missing seat row for draft autosave.')
  }

  const { data, error } = await supabase
    .from('session_scores')
    .update(payload)
    .eq('id', existingId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function saveMyScoreCommit(...) {
  const payload = buildScoreCommitPayload({ ... })
  // keep the existing upsert behavior for self rows,
  // but update the already-created guest / added-player seat rows in place
}
```

- [ ] **Step 4: Preserve the existing identity lookup rules**

```ts
// true guest: guestEntryId / guestProfileId lookup
// added registered player: owner_user_id = addedUserId
// self row: owner_user_id = auth.uid()
//
// Do not change row identity; only change which columns draft autosave writes.
```

- [ ] **Step 5: Run the targeted helper tests again**

Run: `node --test lib/score-save-payload.test.js lib/score-screen-state.test.js`

Expected: PASS with draft-aware record handling still green

---

### Task 4: Create The Supabase Migration For Draft Columns And Shared Guest Cards

**Files:**
- Create: `C:\Users\izzyh\Desktop\valeria-score\supabase\migrations\20260527183000_guest_score_drafts_and_shared_guest_cards.sql`
- Create: `C:\Users\izzyh\Desktop\valeria-score\lib\guest-autosave-dashboard-migration.test.js`

- [ ] **Step 1: Add the new draft columns to `public.session_scores`**

```sql
alter table public.session_scores
  add column if not exists draft_duke_slug text,
  add column if not exists draft_inputs jsonb,
  add column if not exists draft_score_total integer,
  add column if not exists draft_updated_at timestamptz;
```

- [ ] **Step 2: Replace `get_profile_dashboard()` with shared guest-card access and safe draft badges**

```sql
create or replace function public.get_profile_dashboard()
returns jsonb
language sql
stable
set search_path = ''
as $$
  with viewer_ctx as (
    select auth.uid() as user_id
  ),
  viewer_sessions as (
    select distinct sp.session_id
    from viewer_ctx vc
    join public.session_players sp
      on sp.user_id = vc.user_id
    union
    select distinct gs.id
    from viewer_ctx vc
    join public.game_sessions gs
      on gs.created_by = vc.user_id
    union
    select distinct ss.session_id
    from viewer_ctx vc
    join public.session_scores ss
      on ss.owner_user_id = vc.user_id
      or ss.scored_by_user_id = vc.user_id
  ),
  accessible_guest_ids as (
    select gp.id as guest_profile_id
    from viewer_ctx vc
    join public.guest_profiles gp
      on gp.owner_user_id = vc.user_id
    union
    select distinct ss.guest_profile_id
    from public.session_scores ss
    join viewer_sessions vs
      on vs.session_id = ss.session_id
    where ss.guest_profile_id is not null
  ),
  guest_draft_badges as (
    select
      ss.guest_profile_id,
      count(*)::int as in_progress_count,
      max(ss.draft_updated_at) as last_draft_updated_at
    from public.session_scores ss
    join accessible_guest_ids ag
      on ag.guest_profile_id = ss.guest_profile_id
    where ss.draft_updated_at is not null
    group by ss.guest_profile_id
  )
  select jsonb_build_object(
    -- keep personal summary/history owner-only and non-guest
    'sharedGuestProfiles',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', gc.id,
          'display_name', gc.display_name,
          'contact_email', gc.contact_email,
          'public_player_id', gc.public_player_id,
          'wins', coalesce(gs.wins, 0),
          'losses', coalesce(gs.losses, 0),
          'topDuke', coalesce(gs.top_duke, '-'),
          'totalGames', coalesce(gs.total_games, 0),
          'inProgressCount', coalesce(gdb.in_progress_count, 0),
          'lastDraftUpdatedAt', gdb.last_draft_updated_at
        )
      )
      from guest_cards gc
      left join guest_stats gs on gs.guest_profile_id = gc.id
      left join guest_draft_badges gdb on gdb.guest_profile_id = gc.id
    ), '[]'::jsonb)
  );
$$;
```

- [ ] **Step 3: Keep claim transfer draft-safe without reintroducing legacy score moves**

```sql
-- No extra score-copy loop is needed here.
-- The existing claim_guest_profile(text) update already keeps every
-- other session_scores column intact, so draft columns survive the
-- owner_user_id reassignment automatically.
```

- [ ] **Step 4: Add migration assertions for the new contract**

```js
assert.match(migration, /viewer_sessions/i)
assert.match(migration, /accessible_guest_ids/i)
assert.match(migration, /draft_updated_at is not null/i)
assert.match(migration, /'inProgressCount', coalesce/i)
assert.doesNotMatch(migration, /'draftDuke'/i)
assert.doesNotMatch(migration, /'draftScoreTotal'/i)
```

- [ ] **Step 5: Run the migration contract test**

Run: `node --test lib/guest-autosave-dashboard-migration.test.js`

Expected: PASS

---

### Task 5: Wire `app/score.tsx` To Remote Draft Autosave And Manual Commit

**Files:**
- Modify: `C:\Users\izzyh\Desktop\valeria-score\app\score.tsx`
- Modify: `C:\Users\izzyh\Desktop\valeria-score\lib\score-screen-state.ts`
- Modify: `C:\Users\izzyh\Desktop\valeria-score\lib\scores.ts`
- Test: `C:\Users\izzyh\Desktop\valeria-score\lib\score-screen-state.test.js`

- [ ] **Step 1: Track committed baseline separately from the latest draft baseline**

```tsx
const [committedBaselineSlug, setCommittedBaselineSlug] = useState<string | null>(null)
const [committedBaselineInputs, setCommittedBaselineInputs] = useState(createEmptyInputs())
const [draftBaselineSlug, setDraftBaselineSlug] = useState<string | null>(null)
const [draftBaselineInputs, setDraftBaselineInputs] = useState(createEmptyInputs())
const [lastCommittedAt, setLastCommittedAt] = useState('')
const [lastDraftSavedAt, setLastDraftSavedAt] = useState('')

const hasPendingCommit = useMemo(
  () =>
    hasUnsavedScoreChanges({
      selectedSlug,
      baselineSlug: committedBaselineSlug,
      inputs,
      baselineInputs: committedBaselineInputs,
    }),
  [committedBaselineInputs, committedBaselineSlug, inputs, selectedSlug]
)

const shouldAutoSaveProgress = useMemo(
  () =>
    hasUnsavedScoreChanges({
      selectedSlug,
      baselineSlug: draftBaselineSlug,
      inputs,
      baselineInputs: draftBaselineInputs,
    }) &&
    shouldAutoSaveScoreProgress({ ... }),
  [draftBaselineInputs, draftBaselineSlug, inputs, selectedSlug, ...]
)
```

- [ ] **Step 2: Load the freshest remote-or-local draft without losing the committed baseline**

```tsx
const remoteDraft =
  existing?.draft_duke_slug && existing.draft_updated_at
    ? {
        selectedSlug: existing.draft_duke_slug,
        inputs: normalizeScoreInputs(existing.draft_inputs),
        updatedAt: existing.draft_updated_at,
      }
    : null

const resolvedState = resolveLoadedScoreState({
  initialSlug,
  existingScore: normalizedExisting,
  remoteDraft,
  localDraft: parseStoredScoreDraft(storedDraft),
  sessionFinished: isSessionFinished(...),
})

setCommittedBaselineSlug(resolvedState.committedBaselineSlug)
setCommittedBaselineInputs(resolvedState.committedBaselineInputs)
setDraftBaselineSlug(resolvedState.draftBaselineSlug)
setDraftBaselineInputs(resolvedState.draftBaselineInputs)
setLastCommittedAt(resolvedState.lastCommittedAt)
setLastDraftSavedAt(resolvedState.lastDraftSavedAt)
```

- [ ] **Step 3: Keep local AsyncStorage drafts as fallback, but include timestamps**

```tsx
await AsyncStorage.setItem(
  draftStorageKey,
  JSON.stringify({
    selectedSlug,
    inputs,
    updatedAt: new Date().toISOString(),
  })
)
```

- [ ] **Step 4: Change autosave to write draft columns only**

```tsx
const savedRow = await saveMyScoreDraft(
  snapshot.sessionId,
  safeSelectedSlug,
  snapshot.inputs,
  snapshot.totalScore,
  {
    guestMode: isGuestMode,
    guestName: guestName || null,
    guestProfileId: guestProfileId || null,
    guestEntryId: guestEntryId || null,
    ownerUserId,
    scoredByUserId,
    addedPlayerName: isAddedPlayerMode ? addedPlayerName || null : null,
  }
)

setDraftBaselineSlug(safeSelectedSlug)
setDraftBaselineInputs(snapshot.inputs)
setLastDraftSavedAt(savedRow?.draft_updated_at ?? new Date().toISOString())
```

- [ ] **Step 5: Keep manual `Save` as the reveal boundary**

```tsx
const savedRow = await saveMyScoreCommit(
  effectiveSessionId,
  selectedDuke.slug,
  normalizedCurrentInputs,
  totalScore,
  {
    guestMode: isGuestMode,
    guestName: guestName || null,
    guestProfileId: guestProfileId || null,
    guestEntryId: guestEntryId || null,
    ownerUserId,
    scoredByUserId,
    addedPlayerName: isAddedPlayerMode ? addedPlayerName || null : null,
    lockScore: false,
    includedInStats: false,
  }
)

setCommittedBaselineSlug(selectedDuke.slug)
setCommittedBaselineInputs(normalizedCurrentInputs)
setDraftBaselineSlug(selectedDuke.slug)
setDraftBaselineInputs(normalizedCurrentInputs)
setLastCommittedAt(savedRow?.updated_at ?? new Date().toISOString())
setLastDraftSavedAt('')
await clearScoreDraft()
```

- [ ] **Step 6: Run the score-state tests**

Run: `node --test lib/score-screen-state.test.js`

Expected: PASS

---

### Task 6: Update Dashboard Normalization, Profile UI, Manage-Data Copy, And Claim Client

**Files:**
- Modify: `C:\Users\izzyh\Desktop\valeria-score\lib\profile-dashboard-data.ts`
- Modify: `C:\Users\izzyh\Desktop\valeria-score\lib\profile-dashboard-data.test.js`
- Modify: `C:\Users\izzyh\Desktop\valeria-score\app\profile.tsx`
- Modify: `C:\Users\izzyh\Desktop\valeria-score\app\manage-data.tsx`
- Modify: `C:\Users\izzyh\Desktop\valeria-score\lib\profile.ts`
- Create: `C:\Users\izzyh\Desktop\valeria-score\lib\profile-claim-rpc.test.js`

- [ ] **Step 1: Normalize the new guest-card badge fields**

```ts
type RawProfileGuestRow = {
  id: string
  display_name: string | null
  contact_email: string | null
  public_player_id: string | null
  wins?: NumericValue
  losses?: NumericValue
  topDuke?: string | null
  totalGames?: NumericValue
  inProgressCount?: NumericValue
  lastDraftUpdatedAt?: string | null
} | null

stats: {
  wins: toNumber(row.wins),
  losses: toNumber(row.losses),
  topDuke: normalizeText(row.topDuke) || '-',
  totalGames: toNumber(row.totalGames),
  inProgressCount: toNumber(row.inProgressCount),
  lastDraftUpdatedAt: row.lastDraftUpdatedAt ?? null,
}
```

- [ ] **Step 2: Update the profile screen copy and render a safe in-progress badge**

```tsx
<Text style={styles.sectionTitle}>Guest Profiles</Text>
<Text style={styles.sectionHint}>Guest profiles from your shared games appear here.</Text>

{guest.stats.inProgressCount > 0 ? (
  <View style={styles.guestDraftBadge}>
    <Text style={styles.guestDraftBadgeText}>
      {guest.stats.inProgressCount} in progress
    </Text>
    {guest.stats.lastDraftUpdatedAt ? (
      <Text style={styles.guestDraftTimestamp}>
        Updated {formatDate(guest.stats.lastDraftUpdatedAt)}
      </Text>
    ) : null}
  </View>
) : null}
```

- [ ] **Step 3: Keep manage-data owner-only and fix the copy so it does not imply shared delete rights**

```tsx
<Text style={styles.sectionSubtitle}>
  Guest profiles you created. Shared viewers can open these on Profile, but only you can delete them here.
</Text>
```

- [ ] **Step 4: Replace stale `player_scores` claim logic with the canonical RPC**

```ts
export async function claimGuestProfileForCurrentUser(rawValue: string) {
  const value = normalizePlayerId(rawValue)
  if (!value || value.length < 3) {
    throw new Error('Player ID must be at least 3 characters.')
  }

  const { data, error } = await supabase.rpc('claim_guest_profile', {
    p_public_player_id: value,
  })

  if (error) throw error
  return data ?? null
}
```

- [ ] **Step 5: Run the profile/dashboard/claim tests**

Run: `node --test lib/profile-dashboard-data.test.js lib/profile-claim-rpc.test.js lib/create-user-claim-ui.test.js lib/claim-guest-flow.test.js`

Expected: PASS

---

### Task 7: Verify The Full Change Set

**Files:**
- Modify: `C:\Users\izzyh\Desktop\valeria-score\lib\score-save-payload.ts`
- Modify: `C:\Users\izzyh\Desktop\valeria-score\lib\score-screen-state.ts`
- Modify: `C:\Users\izzyh\Desktop\valeria-score\lib\scores.ts`
- Modify: `C:\Users\izzyh\Desktop\valeria-score\lib\profile-dashboard-data.ts`
- Modify: `C:\Users\izzyh\Desktop\valeria-score\lib\profile.ts`
- Modify: `C:\Users\izzyh\Desktop\valeria-score\app\score.tsx`
- Modify: `C:\Users\izzyh\Desktop\valeria-score\app\profile.tsx`
- Modify: `C:\Users\izzyh\Desktop\valeria-score\app\manage-data.tsx`
- Create: `C:\Users\izzyh\Desktop\valeria-score\supabase\migrations\20260527183000_guest_score_drafts_and_shared_guest_cards.sql`
- Create: `C:\Users\izzyh\Desktop\valeria-score\lib\guest-autosave-dashboard-migration.test.js`
- Create: `C:\Users\izzyh\Desktop\valeria-score\lib\profile-claim-rpc.test.js`

- [ ] **Step 1: Run the focused test suite**

Run: `node --test lib/score-save-payload.test.js lib/score-screen-state.test.js lib/profile-dashboard-data.test.js lib/guest-autosave-dashboard-migration.test.js lib/profile-claim-rpc.test.js lib/create-user-claim-ui.test.js lib/claim-guest-flow.test.js`

Expected: PASS

- [ ] **Step 2: Run the full repo tests**

Run: `npm.cmd test`

Expected: PASS with 0 failures

- [ ] **Step 3: Run typecheck**

Run: `npx.cmd tsc --noEmit`

Expected: exit 0

- [ ] **Step 4: Run lint**

Run: `npm.cmd run lint`

Expected: 0 errors and 0 warnings

- [ ] **Step 5: Manual behavior check after the code lands**

Run:

```text
1. Start a multiplayer session and add a true guest.
2. Enter a duke and a few score inputs on that guest score screen.
3. Leave the screen, reopen it, and confirm the draft resumes without showing up in compare as a committed score.
4. Open Profile from another user who shared that session and confirm the guest card shows only an in-progress badge, not the draft duke/score.
5. Add a registered player on someone else’s behalf, repeat the draft/resume flow, then tap Save and confirm the committed row belongs to the real player.
6. Claim a guest profile by Player ID and confirm the guest card disappears while the transferred row resumes under the real profile.
```

Expected: All six checks behave exactly as described in the approved design.

---

### Self-Review Checklist

- [ ] Draft autosave writes only `draft_*` columns and never mutates committed score fields before manual `Save`.
- [ ] Guest profile cards expose only `inProgressCount` and `lastDraftUpdatedAt`, never draft duke, draft inputs, or draft totals.
- [ ] Guest committed rows stay out of the viewer’s personal summary/history.
- [ ] Added-player rows remain owned by the real player while `scored_by_user_id` keeps adder-side resume access.
- [ ] Guest claim transfer stays on `session_scores` and no client code writes to legacy `player_scores`.
