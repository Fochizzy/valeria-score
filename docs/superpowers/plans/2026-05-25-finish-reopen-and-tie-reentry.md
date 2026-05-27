# Finish Reopen And Tie Re-Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the host reopen finished games, preserve entered scores while requiring a fresh resave from every seat, and allow repeated entry into tie-resolution until a valid tiebreak is saved.

**Architecture:** Add a backend session-revision contract so reopen, resave readiness, and tie-aware finish all derive from one source of truth. Then thread that revision/confirmation state through the shared compare data model and finish actions before adding the host reopen control and tie modal UI.

**Tech Stack:** Supabase SQL migrations, Expo Router, React Native, TypeScript modules, node:test

---

### Task 1: Add the backend revision and reopen/tiebreak RPC contract

**Files:**
- Create: `supabase/migrations/20260525xxxxxx_finish_reopen_tie_reentry.sql`
- Create: `lib/finish-reopen-tie-reentry-migration.test.js`

- [ ] **Step 1: Write failing migration assertions**

Add tests that expect:
- `game_sessions.score_revision`
- `session_scores.confirmed_revision`
- `public.finish_game_with_tiebreak(p_session_id uuid, p_tiebreak_score_ids uuid[])`
- `public.reopen_finished_game(p_session_id uuid)`
- `finish_game(...)` readiness checks against the current revision

- [ ] **Step 2: Run the migration test and verify it fails**

Run: `node --test --test-reporter=spec lib/finish-reopen-tie-reentry-migration.test.js`
Expected: FAIL because the new migration file and SQL clauses do not exist yet

- [ ] **Step 3: Add the migration**

Implement the migration to:
- add `game_sessions.score_revision integer not null default 1`
- add `session_scores.confirmed_revision integer not null default 0`
- backfill locked rows so historical finished games remain confirmed
- update `finish_game(...)` so only rows confirmed for the current revision count toward readiness
- add `finish_game_with_tiebreak(...)`
- add `reopen_finished_game(...)`

- [ ] **Step 4: Re-run the migration test**

Run: `node --test --test-reporter=spec lib/finish-reopen-tie-reentry-migration.test.js`
Expected: PASS

### Task 2: Thread revision-aware readiness through shared score helpers

**Files:**
- Modify: `lib/score-save-payload.ts`
- Modify: `lib/score-save-payload.test.js`
- Modify: `lib/scores.ts`
- Modify: `lib/compare-entries.ts`
- Modify: `lib/compare-entries.test.js`
- Modify: `lib/compare-dashboard-data.ts`
- Modify: `lib/compare-dashboard-state.ts`
- Modify: `lib/compare-screen-state.ts`
- Modify: `lib/compare-screen-state.test.js`

- [ ] **Step 1: Write failing unit tests for revision-aware readiness**

Cover:
- saved rows only count as ready when `confirmed_revision === score_revision`
- reopened-but-unconfirmed rows keep `hasScore = true` but block finish
- save payloads stamp `confirmed_revision`

- [ ] **Step 2: Run the targeted tests and verify they fail**

Run: `node --test --test-reporter=spec lib/score-save-payload.test.js lib/compare-entries.test.js lib/compare-screen-state.test.js`
Expected: FAIL on missing revision fields and old readiness rules

- [ ] **Step 3: Implement minimal shared-model changes**

Update the shared code so:
- compare score rows carry `confirmed_revision`
- compare dashboard data carries the session `score_revision`
- compare progress computes readiness from revision confirmation, not just `duke_slug`
- score saves write the current session revision into `confirmed_revision`

- [ ] **Step 4: Re-run the targeted tests**

Run: `node --test --test-reporter=spec lib/score-save-payload.test.js lib/compare-entries.test.js lib/compare-screen-state.test.js`
Expected: PASS

### Task 3: Add tie-aware finish helpers and compare tie/reopen behavior

**Files:**
- Create: `lib/finish-tie-resolution.ts`
- Create: `lib/finish-tie-resolution.test.js`
- Modify: `lib/session-admin-flow.ts`
- Modify: `lib/session-admin-flow.test.js`
- Modify: `app/compare.tsx`

- [ ] **Step 1: Write failing tie-helper and RPC-wrapper tests**

Cover:
- detecting the current top tied scorers
- building the ordered score-id payload
- `finishGameWithTiebreakViaRpc(...)`
- `reopenFinishedGameViaRpc(...)`

- [ ] **Step 2: Run the tie-helper tests and verify they fail**

Run: `node --test --test-reporter=spec lib/finish-tie-resolution.test.js lib/session-admin-flow.test.js`
Expected: FAIL with missing module or missing export errors

- [ ] **Step 3: Implement the helpers and compare finish flow**

Add:
- pure top-tie detection helpers
- new RPC wrappers
- compare modal state for tie resolution
- repeated `Finish Game` entry into the unresolved tie modal
- tie-aware submit path using `finish_game_with_tiebreak(...)`

- [ ] **Step 4: Re-run the helper tests**

Run: `node --test --test-reporter=spec lib/finish-tie-resolution.test.js lib/session-admin-flow.test.js`
Expected: PASS

### Task 4: Add host reopen from history and route back into active play

**Files:**
- Modify: `app/manage-data.tsx`
- Modify: `lib/manage.ts`
- Modify: `lib/session-participation-state.test.js`
- Modify: `lib/create-session.ts` if active-session refresh needs a small shared helper adjustment
- Modify: `lib/sessions.ts` only if a tiny helper is needed to set active session state during reopen

- [ ] **Step 1: Write failing host-reopen surface tests**

Cover:
- reopened sessions classify as in-progress once rows are unlocked
- host reopen menu action is exposed through the session action flow

- [ ] **Step 2: Run the history/classification tests and verify they fail**

Run: `node --test --test-reporter=spec lib/session-participation-state.test.js`
Expected: FAIL once the new reopened-session case is added

- [ ] **Step 3: Implement the host reopen action**

Update manage/history behavior so:
- only hosts see `Re-Open Game`
- confirm calls `reopenFinishedGameViaRpc(...)`
- active session id/join code are restored
- the host routes into `/compare`

- [ ] **Step 4: Re-run the history/classification tests**

Run: `node --test --test-reporter=spec lib/session-participation-state.test.js`
Expected: PASS

### Task 5: Verify the full feature slice

**Files:**
- Modify only if verification exposes gaps

- [ ] **Step 1: Run the focused regression suite**

Run: `node --test --test-reporter=spec lib/finish-reopen-tie-reentry-migration.test.js lib/score-save-payload.test.js lib/compare-entries.test.js lib/compare-screen-state.test.js lib/finish-tie-resolution.test.js lib/session-admin-flow.test.js lib/session-participation-state.test.js`
Expected: PASS

- [ ] **Step 2: Run TypeScript verification**

Run: `npx.cmd tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Smoke-check the affected screens in code**

Confirm:
- `app/compare.tsx` uses revision-aware finish gating and tie modal submission
- `app/manage-data.tsx` exposes host reopen and restores active session navigation
- preserved scores are not cleared in the save/load flow

