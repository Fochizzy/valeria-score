# Finish Reopen And Tie Re-Entry Design

## Summary

The host should be able to keep returning to tie resolution from `Finish Game` until they actually submit a valid winner order, and the host should also be able to reopen a finished game from history so the same session becomes live again for every participant.

Reopening must preserve each player's currently entered duke, inputs, and total score, but it must clear the finished-state contract. After reopen, every seat must resave against the new session revision before the host can finish again. Once every participant has resaved, `Finish Game` works normally again, including tie-aware finish when the top score is tied.

This design intentionally keeps one session record alive through finish, reopen, resave, and refinish rather than cloning history into a second game.

## Goals

- Let the host reopen the tie-resolution flow by pressing `Finish Game` again until a tie-break is actually saved.
- Let the host reopen a completed game from history without creating a new session.
- Preserve already entered score values when a game is reopened.
- Require all players and guest seats to resave after reopen before the host can finish again.
- Move reopened sessions back into the shared in-progress experience for all participants.
- Keep `placement`, `is_winner`, `game_locked`, and analytics-consumption fields as the backend source of truth for final state.

## Non-Goals

- Changing score math or duke-specific scoring rules.
- Replacing the existing compare, recap, or victory visual language.
- Letting non-host players reopen a game or resolve the final top-score tie.
- Supporting multiple finished snapshots for the same session.
- Adding a second history object or archiving prior finished revisions.

## Current Baseline

- [app/compare.tsx](/C:/Users/izzyh/Desktop/valeria-score/app/compare.tsx) currently sends the host from `Finish Game` directly into the existing `finish_game` RPC path.
- [app/manage-data.tsx](/C:/Users/izzyh/Desktop/valeria-score/app/manage-data.tsx) classifies completed sessions entirely from `session_scores.game_locked` counts.
- [lib/session-participation-state.ts](/C:/Users/izzyh/Desktop/valeria-score/lib/session-participation-state.ts) marks a session as completed when every score row is locked, and in-progress otherwise.
- [app/victory.tsx](/C:/Users/izzyh/Desktop/valeria-score/app/victory.tsx) clears the local active-session state after routing into Victory, so reopened games must become discoverable again through shared session data instead of relying on local victory state.
- The earlier tie-resolution direction is documented in [2026-04-30-finish-game-tie-resolution-design.md](/C:/Users/izzyh/Desktop/valeria-score/docs/superpowers/specs/2026-04-30-finish-game-tie-resolution-design.md). This new spec keeps that tie model and extends it to support reopen and re-confirm flows.

## Product Behavior

### Normal finish with no top tie

If there is one clear leader and every required participant has saved for the current session revision:

1. The host taps `Finish Game`.
2. The existing destructive confirm appears.
3. On confirm, the app calls the standard `finish_game(p_session_id uuid)` RPC.
4. The backend locks the rows, writes placements and winner state, and the app routes everyone to Victory as it does today.

### Finish when the top score is tied

If two or more entries are tied for the highest score:

1. The host taps `Finish Game`.
2. The app detects a top tie before any finish RPC runs.
3. A tie-resolution modal opens instead of the normal destructive confirm.
4. The host can cancel out of the modal without changing session state.
5. If the host taps `Finish Game` again later, the modal opens again for the same unresolved tie.
6. The game remains unfinished until the host submits a complete unique ordering of the tied top scorers.
7. Submitting that order calls `finish_game_with_tiebreak(p_session_id uuid, p_tiebreak_score_ids uuid[])`.
8. The backend validates the tie-break, writes final placements, locks the session, and Victory routing continues normally.

### Reopen from completed history

From the completed-game menu in [app/manage-data.tsx](/C:/Users/izzyh/Desktop/valeria-score/app/manage-data.tsx):

1. The host long-presses a completed session and chooses `Re-Open Game`.
2. The app shows a host-only destructive confirm explaining that the game will move back to active play and everyone must resave before it can be finalized again.
3. On confirm, the app calls `reopen_finished_game(p_session_id uuid)`.
4. The backend unlocks the existing score rows, clears final-only state, and bumps the session revision.
5. The preserved scores and duke choices remain visible when players reopen their score screens.
6. The session drops out of completed history and becomes in-progress again for every participant because it is no longer fully locked.
7. The host is routed back into Compare for that session after a successful reopen.

### Re-save requirement after reopen

Reopening is not enough to make a score row finish-ready again. A reopened row must be explicitly re-confirmed for the new session revision.

That means:

- Players keep their previous values as the starting point.
- Pressing save without changing anything is valid and counts as re-confirming that seat.
- Until every required seat has re-confirmed against the new revision, `Finish Game` stays blocked.
- Once all seats are reconfirmed, the host can finish again through the normal or tie-aware finish path.

## UX Design

### Compare screen

[app/compare.tsx](/C:/Users/izzyh/Desktop/valeria-score/app/compare.tsx) remains the host control point for finishing the game.

Required behavior:

- The finish button keeps its current host-only gate.
- Pressing `Finish Game` while a top tie exists opens the tie-resolution modal every time until the host completes and saves the tie-break.
- Readiness messaging should explain when the table is waiting on post-reopen re-saves rather than missing first-time scores.
- Reopened sessions should feel live again immediately, not visually frozen in finished state.

### Tie-resolution modal

The tie-resolution modal stays purpose-built rather than using a native alert or a generic action sheet.

Copy targets:

- Kicker: `Finish Game`
- Title: `Break The Tie`
- Body: explain that the listed players are tied for the top score and the host must choose the final order before the game can be locked

Each row should show:

- display name
- guest indicator when applicable
- player ID when available
- duke name
- saved total score
- ranking control for `1st..N`

Actions:

- `Cancel`
- `Save And Finish`, disabled until every tied scorer has a unique slot

### Completed-game menu

The completed-game host menu in [app/manage-data.tsx](/C:/Users/izzyh/Desktop/valeria-score/app/manage-data.tsx) should gain:

- `View Recap`
- `Re-Open Game`
- `Delete My Involvement`
- `Delete Game`
- `Cancel`

`Re-Open Game` is host-only and should not appear for non-host participants.

## Data Model Design

### Existing final-state fields to preserve

The feature continues to rely on:

- `session_scores.game_locked`
- `session_scores.placement`
- `session_scores.is_winner`
- `session_scores.included_in_stats`
- `session_scores.recap_player_name`
- `session_scores.recap_player_id`

These remain the source of truth for finished sessions, recap rendering, and analytics inclusion.

### New revision fields

Add a lightweight revision contract so reopened games can preserve score values without treating them as already reconfirmed.

Use this shape:

- `game_sessions.score_revision integer not null default 1`
- `session_scores.confirmed_revision integer not null default 0`

Rules:

- Creating a new score row confirms it for the current session revision.
- Normal score save updates `confirmed_revision` to the session's current `score_revision`.
- Reopening a game increments `game_sessions.score_revision`.
- Existing rows keep their saved values but do not count as ready until their `confirmed_revision` matches the new session revision.

This is the core contract that lets the app preserve values while still requiring deliberate resave behavior.

## Backend Design

### Keep the current finish RPC

Keep `finish_game(p_session_id uuid)` for the clear-winner path, but update its readiness checks so it only counts rows confirmed for the current session revision.

### Add a tie-aware finish RPC

Add:

`finish_game_with_tiebreak(p_session_id uuid, p_tiebreak_score_ids uuid[])`

The submitted array order represents the host-selected placements inside the top tied block.

Validation requirements:

- caller is authenticated
- caller is the session creator
- session exists
- session is finish-ready for the current revision
- submitted ids are unique
- submitted ids all belong to the same session
- submitted ids exactly match the current set of tied top scorers
- the tied set has at least two rows

Write behavior:

- assign placements `1..N` in submitted order for the tied top scorers
- continue ranking lower-score rows after the tie block using the current fallback ordering
- set exactly one row as `is_winner = true`
- set `game_locked = true`
- set `included_in_stats = true`
- refresh recap identity fields
- update timestamps

### Add a reopen RPC

Add:

`reopen_finished_game(p_session_id uuid)`

Validation requirements:

- caller is authenticated
- caller is the session creator
- session exists
- the session currently has locked score rows

Write behavior:

1. increment `game_sessions.score_revision`
2. update every relevant `session_scores` row in the session:
   - `game_locked = false`
   - `placement = null`
   - `is_winner = null`
   - `included_in_stats = false`
   - preserve `duke_slug`, `inputs`, `score_total`, player identity fields, and guest linkage
   - preserve existing recap identity snapshots unchanged
3. update timestamps so session ordering and refresh behavior stay fresh

The preserved score values are intentional. Only final-only fields and completion flags are cleared.

## Frontend Structure

### New tie helper module

Add a small pure module dedicated to finish tie behavior. Suggested responsibilities:

- detect whether a top tie exists
- return the tied top-scorer subset
- validate client-side ranking completeness and uniqueness
- build the ordered score-id payload for the tie-aware RPC

### Session admin flow helpers

[lib/session-admin-flow.ts](/C:/Users/izzyh/Desktop/valeria-score/lib/session-admin-flow.ts) should expose separate wrappers:

- `finishGameViaRpc(sessionId, deps)`
- `finishGameWithTiebreakViaRpc(sessionId, orderedScoreIds, deps)`
- `reopenFinishedGameViaRpc(sessionId, deps)`

Keeping these explicit is clearer than overloading one helper with several unrelated code paths.

### Compare readiness model

The compare dashboard and progress helpers should stop treating "saved once in the past" as sufficient readiness after reopen.

Use this readiness rule:

- a row counts as ready only when it has a saved score and `confirmed_revision` matches the session's current `score_revision`

This logic should live in the shared compare-state layer rather than inside component-only conditionals.

### History classification

No special new history bucket is required.

The current completed vs in-progress split can keep working if:

- reopened rows are unlocked
- reopened sessions refresh into in-progress lists
- completed history continues to mean "all rows for the session are locked"

## Realtime And Navigation Behavior

### Realtime refresh

Reopening should trigger the same session-activity refresh behavior that compare already relies on. Connected clients should naturally see:

- the session leave completed state
- the compare screen refresh
- the victory auto-route stop applying because the session is no longer fully locked

### Active session routing

Victory routing should remain driven by locked-row completion. Once a reopened game clears `game_locked`, the session no longer qualifies for auto-route to Victory.

### Host return path after reopen

After a successful reopen from [app/manage-data.tsx](/C:/Users/izzyh/Desktop/valeria-score/app/manage-data.tsx), route the host directly to Compare for that same session.

That gives the host one immediate control point to monitor which seats have resaved and to finalize again once the table is ready.

## Error Handling

### Client-side

Prevent or handle:

- non-host reopen attempts
- trying to finish while post-reopen confirmations are still incomplete
- incomplete or duplicate tie placement selections
- stale tie modal state when live standings change underneath it
- double-submit while finish or reopen is already pending

### Backend errors

If finish or reopen validation fails:

- keep the session in its previous safe state
- remain on the current screen
- show the returned message
- allow the host to refresh and retry

## Testing Plan

### Pure helper tests

Add tests for:

- detecting top ties
- returning only the top tied scorers
- validating unique placement assignments
- building ordered tie-break payloads

### Compare-state tests

Add tests proving:

- a reopened row with preserved values does not count as ready until it is resaved for the current revision
- a resaved row becomes ready even if the values are unchanged
- `Finish Game` remains blocked until all required seats are confirmed for the current revision

### RPC wrapper tests

Extend [lib/session-admin-flow.test.js](/C:/Users/izzyh/Desktop/valeria-score/lib/session-admin-flow.test.js) for:

- normal finish still calling `finish_game`
- tie-aware finish calling `finish_game_with_tiebreak`
- reopen calling `reopen_finished_game`

### Migration tests

Add migration-focused tests that confirm:

- reopen increments the session revision
- reopen clears final-only state while preserving score values
- finish readiness checks use the current revision
- tie-aware finish rejects stale, duplicate, or incomplete tied-score submissions
- tie-aware finish writes exactly one winner and explicit final placements

### Session classification tests

Extend [lib/session-participation-state.test.js](/C:/Users/izzyh/Desktop/valeria-score/lib/session-participation-state.test.js) so a reopened game moves back out of completed state and into in-progress state.

## Rollout Notes

- This feature depends on a new migration and cannot be shipped safely as frontend-only behavior.
- Sessions without a top tie should keep the existing fast finish path.
- Reopened sessions intentionally reuse the same session id and join code.
- Existing already-finished sessions continue rendering through the same placement and winner fields.
- The compare, victory, recap, and analytics surfaces should not need a new result model once the backend writes the correct final-state fields.
