# Finish Game Tie Resolution Design

## Summary

When the host finishes a game and multiple players are tied for the highest saved score, the app should pause the normal finish flow and require the host to resolve the tie before the session is locked. The host will see only the tied top scorers, assign unique placements across that tied group, save the tie-break, and then the app will lock the game and route every player to the Victory screen.

Sessions without a top-score tie should keep the current fast finish path.

## Goals

- Preserve the existing host-only finish authority.
- Keep the no-tie finish flow unchanged and fast.
- Let the host resolve only true top-score ties.
- Persist one sole winner with explicit placements.
- Reuse the stored `placement` and `is_winner` fields so Compare, Victory, and analytics stay aligned.
- Continue routing all connected players to Victory after finish.

## Non-Goals

- Resolving ties that do not affect first place.
- Adding multi-round tie-break rules or score subcategories.
- Changing score entry or score math.
- Letting non-host players participate in the tie-break flow.

## Product Behavior

### Normal finish

If the highest saved score belongs to a single player, the host taps `Finish Game`, confirms the action, the app calls the existing finish RPC, the session locks, and all players route to Victory exactly as they do now.

### Tie-aware finish

If two or more saved entries are tied for the highest score:

1. The host taps `Finish Game`.
2. The app detects the tied top scorers before calling the normal finish RPC.
3. A tie-resolution modal opens instead of the usual destructive confirm.
4. The modal lists only the tied top scorers.
5. The host assigns unique placements `1..N` across that tied group.
6. `Save And Finish` remains disabled until every tied scorer has exactly one slot.
7. On save, the app submits the ordered tied score ids to a tie-aware finish RPC.
8. The backend validates the tie-break, writes final placements and winner state, locks the game, and returns control to the existing Victory routing flow.

### Ranking rules

- The host-selected tied players become the sole ranked top block.
- The selected `1st` place becomes the only row with `placement = 1` and `is_winner = true`.
- If three players are tied at the top, the host must assign `1st`, `2nd`, and `3rd`.
- The next lower, non-tied score becomes the next placement after the tie block.
  - Example: if three players are tied for the lead and the host assigns them `1`, `2`, `3`, the next player becomes `4th`.
- Players outside the tied top block retain normal descending score order after the host-ranked tie block.

## UX Design

### Compare screen

`app/compare.tsx` remains the host control point for finishing the game.

The screen continues to compute readiness from the current saved participants and expected player count. Once the session is finish-ready:

- no top tie: current `Finish Game` confirmation stays unchanged
- top tie: tapping `Finish Game` opens a custom tie-resolution modal

### Tie-resolution modal

The modal should use the app's existing custom modal styling language rather than a native alert, but it should be a purpose-built component instead of reusing the generic action-list modal.

Recommended content:

- Kicker: `Finish Game`
- Title: `Break The Tie`
- Body copy: explain that the listed players are tied for the top score and the host must assign final placements before the game can be locked

Each tied scorer row should show:

- display name
- guest badge if applicable
- player ID when available
- duke name
- total score
- placement selector or ranking control

Actions:

- `Cancel`: closes the modal and does nothing
- `Save And Finish`: disabled until the ranking is complete and unique

### Ranking control behavior

The ranking UI should enforce unique assignments across the tied group.

- For a 2-way tie, valid assignments are `1st` and `2nd`.
- For a 3-way tie, valid assignments are `1st`, `2nd`, and `3rd`.
- A slot already assigned to one player cannot remain simultaneously assigned to another.
- The host must explicitly complete the full ordering; there is no implicit fallback order.

## Data And Backend Design

### Existing fields to preserve

The app already stores and consumes:

- `session_scores.placement`
- `session_scores.is_winner`
- `session_scores.game_locked`
- `session_scores.recap_player_name`
- `session_scores.recap_player_id`

This feature should keep using those fields as the single source of truth for Compare, Victory, and analytics.

### RPC strategy

Keep the current `finish_game(p_session_id uuid)` RPC for sessions without a top tie.

Add a new RPC:

`finish_game_with_tiebreak(p_session_id uuid, p_tiebreak_score_ids uuid[])`

The array order represents the host-selected placements within the tied top group.

Example:

- `['score-c', 'score-a', 'score-b']`
- means `score-c` is `1st`, `score-a` is `2nd`, `score-b` is `3rd`

### RPC validation

The tie-aware RPC must reject invalid or stale submissions. It should validate:

- the caller is authenticated
- the caller is the session creator
- the session still exists
- the session is still finish-ready
- each submitted score id belongs to the same session
- the submitted ids are unique
- the submitted ids match the exact current tied top-scorer set
- the tied set has at least two members
- every tied top scorer is included exactly once

If any validation fails, the RPC should raise a clear error so the compare screen can show the host a useful retry message.

### Placement algorithm

The tie-aware finish RPC should:

1. Load all finish-eligible saved scores for the session.
2. Determine the highest score total.
3. Identify the full set of rows tied at that highest score.
4. Confirm that the submitted array matches that exact set.
5. Assign placements `1..N` to the submitted tied score ids in array order.
6. Assign the remaining lower-score rows placements starting at `N + 1`, ordered by current fallback rules.
7. Mark only the first submitted row as `is_winner = true`.
8. Mark all other rows as `is_winner = false`.
9. Set `game_locked = true`, `included_in_stats = true`, and recap identity fields just like the normal finish flow.

The ranking fallback for lower-score rows should stay consistent with the current SQL ordering so this feature only overrides the tied top block, not unrelated rows.

## Frontend Structure

### New pure helper layer

Add a small pure helper module for tie-break logic. Suggested responsibilities:

- detect whether a top tie exists in the current compare entries
- return the tied top-scorer subset
- validate a complete unique placement assignment on the client
- build the ordered score-id payload for the RPC

Keeping this logic pure will make the finish behavior easy to test without importing React Native screens.

### Compare screen responsibilities

`app/compare.tsx` should:

- keep current finish readiness rules
- branch between normal finish and tie-aware finish
- own tie-resolution modal visibility and state
- refresh standings if the modal is open and session data changes
- close or invalidate the modal if the tied set changes before save

### Session admin wrapper

`lib/session-admin-flow.ts` should expose a dedicated wrapper for the new RPC instead of folding the tie-break payload into the existing `finishGameViaRpc(...)` helper.

Suggested split:

- `finishGameViaRpc(sessionId, deps)`
- `finishGameWithTiebreakViaRpc(sessionId, orderedScoreIds, deps)`

This keeps the normal path simple and makes the special path explicit.

## Error Handling

### Client-side

The compare screen should prevent or handle:

- trying to finish without a session id
- non-host users attempting to finish
- incomplete tie assignments
- duplicate placement assignments
- trying to save while already finishing

### Live update drift

If standings change while the modal is open:

- if the tied top set changes, the modal should close or reset
- the host should see a message explaining that the standings changed and the tie-break must be reviewed again

This avoids submitting a stale ordering for a session that no longer matches the UI the host saw.

### Backend errors

If the RPC rejects the request:

- stay on Compare
- keep the session unlocked
- show the returned error
- allow the host to retry after refresh

## Victory And Analytics Impact

Victory should not need a new rendering model. Once the backend stores final `placement` and a single `is_winner`, the existing Victory screen can keep:

- winner card driven by `is_winner` first and `placement` second
- leaderboard rows driven by `placement`

Analytics should also continue using stored `placement` and `is_winner`. Because this feature writes an explicit single winner and explicit placements before locking, existing downstream analytics should remain consistent without an analytics schema rewrite.

## Testing Plan

### Pure helper tests

Add focused tests for:

- detecting a top tie
- returning only tied top scorers
- building the ordered score-id payload
- validating complete unique ranking assignments

### Compare state and screen tests

Add tests covering:

- no modal for a clear winner
- modal opens for a top tie
- `Save And Finish` disabled until all slots are uniquely assigned
- modal invalidates when standings change underneath it

### RPC wrapper tests

Extend session admin wrapper tests to verify:

- normal finish still calls `finish_game`
- tie-aware finish calls `finish_game_with_tiebreak`
- the payload uses the expected ordered score ids

### Migration tests

Add migration tests that confirm the new SQL:

- validates the caller as session creator
- rejects non-matching or duplicate ids
- rejects incomplete tied sets
- writes exactly one winner
- writes explicit placements in host-selected order
- shifts lower-score placements after the tie block

### Victory regression tests

Add or extend tests proving that after tie resolution:

- the winner resolver returns the explicit winner
- share output uses the stored placements
- final ordering follows the host-selected ranks

## Rollout Notes

- No-top-tie sessions remain on the current finish path.
- Top-tie sessions require the new modal and RPC.
- Older already-locked sessions continue to render through the same `placement` and `is_winner` fields.
- The new migration must be deployed before the tie-aware finish path can work end to end against the live backend.
