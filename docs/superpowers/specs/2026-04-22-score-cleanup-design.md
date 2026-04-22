# Score Cleanup Design

## Goal

Refactor the score flow so the code is easier to understand, test, and extend without changing the current user-facing behavior.

This pass should make two areas materially cleaner:

- `app/score.tsx`
- `lib/scores.ts`

The cleanup should preserve the current route flow, guest handling, save semantics, alerts, copy, and lock behavior.

## Existing Context

- The live score screen is `app/score.tsx`.
- The screen currently owns route parsing, session resolution, existing-score loading, save orchestration, guard/confirmation logic, account-menu actions, derived UI state, and the full render tree.
- Pure score-screen helpers already exist in `lib/score-screen-state.ts`, but they currently cover only session-id resolution and dirty-state detection.
- Score persistence currently lives in `lib/scores.ts`.
- `lib/scores.ts` already separates payload creation into `lib/score-save-payload.ts` and row targeting into `lib/score-row-identity.ts`, but the exported load/save functions still duplicate the guest and signed-in branches heavily.
- Recent score-screen hardening already prioritized reliability over cosmetic changes, including dirty-state guarding, retryable load errors, and safer navigation.

## Scope

This change only covers behavior-preserving refactor work for the score flow.

Included:

- extracting more pure score-screen decision logic out of `app/score.tsx`
- shrinking `app/score.tsx` so it reads primarily as orchestration plus rendering
- reducing duplication inside `lib/scores.ts`
- adding or expanding tests for newly extracted pure helpers
- keeping the current public behavior stable

Excluded:

- visual redesigns or UX rewrites
- changing route structure
- changing save payload shape
- changing guest identity semantics
- changing Supabase table/query behavior
- breaking the public API of `loadMyExistingScore(...)`, `saveMyScore(...)`, or `setMyScoreLocked(...)`
- broad componentization of the score JSX unless a small split becomes necessary to support the cleanup cleanly

## Product Decisions

### Behavior Stability

This pass is explicitly a refactor, not a feature update.

The following behaviors should stay the same:

- route parameter handling for player and guest score entry
- fallback to stored session id when the route is missing one
- load and retry behavior for saved scores
- dirty-state navigation confirmation
- duke-change confirmation
- reset confirmation
- save-button enablement and copy
- compare navigation
- account-menu actions
- lock-state handling after a finished game
- guest score ownership and persistence rules

### File Responsibility Shape

The target file responsibilities should be:

- `app/score.tsx`: React state, effects, alerts, router actions, and JSX
- `lib/score-screen-state.ts`: pure score-screen decisions and view-model helpers
- `lib/scores.ts`: score persistence orchestration with shared internal helpers instead of duplicated branches

This keeps side effects in the screen and persistence module, while pure conditional logic moves into testable helpers.

## Screen Refactor Design

### Keep `app/score.tsx` as the Screen Orchestrator

`app/score.tsx` should continue to own:

- `useLocalSearchParams(...)`
- local React state and refs
- `useEffect(...)` lifecycle wiring
- `Alert.alert(...)`
- router navigation
- direct calls to `supabase.auth.signOut()`
- final render output

It should stop owning as much inline decision-making as it does today.

### Expand `lib/score-screen-state.ts`

Add pure helpers for score-screen decisions that currently live inline in the screen. Recommended helpers:

- `buildScoreSessionContextItems(...)`
- `resolveScoreScreenState(...)`
- `resolveScoreSaveButtonState(...)`
- `shouldConfirmScoreReset(...)`
- `shouldConfirmDukeChange(...)`
- `buildScoreCompareRoute(...)`

These helpers should return data, not perform side effects.

For example:

- context-strip helpers should return labels, values, tones, and disabled state
- save-button helpers should return the label and disabled reason inputs
- reset/duke-change helpers should tell the screen whether confirmation is needed
- compare-route helpers should build route objects from stable inputs

`app/score.tsx` should remain responsible for deciding when to show alerts and what to do when the user confirms them.

### Preserve Current Alert Copy

The screen should keep the same alert text and flow unless an extraction makes the source of truth clearer by moving the same copy into one helper.

The cleanup should not silently change warning tone, success wording, or navigation behavior.

## Persistence Refactor Design

### Keep `lib/scores.ts` Public API Stable

The following exported functions should keep their signatures and behavior:

- `loadMyExistingScore(sessionId, options?)`
- `saveMyScore(sessionId, dukeSlug, inputs, totalScore, options?)`
- `setMyScoreLocked(sessionId, lockScore, options?)`

The cleanup should be internal.

### Replace Guest-vs-Player Duplication With Shared Helpers

Today, guest and signed-in player flows repeat the same broad steps:

1. resolve a row lookup
2. load or find the row
3. build a payload
4. update or insert
5. map the returned row or normalized record

Those shared steps should become internal helpers such as:

- `resolveScoreLookup(...)`
- `loadScoreRowByLookup(...)`
- `findScoreIdByLookup(...)`
- `mapExistingScoreRecord(...)`
- `upsertScoreRow(...)`

The branch between guest and player mode should happen as early as possible at the identity boundary, then reuse the same data-loading and write path.

### Preserve Identity Rules

The refactor must preserve the current identity contract:

- guest rows are targeted by guest lookup fields
- player rows are targeted by `owner_user_id`
- guest saves still require an authenticated owner user id
- player saves still require an authenticated user
- lock updates still operate against the resolved score row id

This is a cleanup of structure, not a change to row targeting.

## Testing

### Unit Coverage

Expand `lib/score-screen-state.test.js` to cover the new extracted helpers.

Recommended coverage:

1. session context strip values for guest vs player mode
2. score-screen state summaries for loading, retry-needed, open, and locked states
3. save-button labeling and disable rules
4. reset-confirmation decision rules
5. duke-change confirmation rules
6. compare-route building from session id and join code

For `lib/scores.ts`, prefer extracting pure or narrowly scoped helpers that can be tested without trying to integration-test the whole Supabase client through the screen.

Recommended coverage:

1. lookup resolution for guest vs player paths
2. row mapping into `ExistingScoreRecord`
3. update-vs-insert branch selection where practical
4. preservation of guest and player identity fields

### Verification Commands

At minimum, verify with:

1. `node .\lib\score-screen-state.test.js`
2. any new score-persistence-focused test file(s)
3. `node .\node_modules\eslint\bin\eslint.js app/score.tsx lib/score-screen-state.ts lib/scores.ts ...`
4. `node .\node_modules\typescript\bin\tsc --noEmit`

If the refactor touches adjacent helpers, run the relevant nearby score tests as well.

## Risks

- extracting too aggressively into React-specific hooks would shorten the screen while making logic harder to unit test; this pass should prefer pure helpers instead
- moving copy or guard logic into helpers can accidentally change edge-case behavior if the tests do not capture current conditions first
- reducing duplication inside `lib/scores.ts` can blur guest and player identity rules if the helper boundaries are chosen poorly
- shrinking the file visually without truly clarifying responsibilities would create the appearance of cleanup without improving maintainability

## Implementation Notes

- prefer pure helper extraction before any JSX reorganization
- preserve current copy unless a test-backed extraction requires centralizing it
- keep `app/score.tsx` readable as a screen, not as a giant state machine
- keep `lib/scores.ts` readable as persistence orchestration, not as two nearly identical branches
- if a helper becomes difficult to test, that is a sign the extraction boundary is wrong and should be simplified
