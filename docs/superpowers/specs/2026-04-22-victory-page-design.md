# Victory Page Design

## Goal

Replace the current post-finish alert with a real end-of-game screen that feels rewarding.

When the host taps `Finish Game` from `Compare`, the app should:

- lock and rank the game as it already does
- navigate to a dedicated `Victory` page
- highlight the winner in a large winner card
- show the finalized leaderboard underneath
- offer `Share Results` and `New Session` actions
- play a lightweight fireworks celebration on first load

## Existing Context

- `Finish Game` currently lives in `app/compare.tsx`.
- That action now finishes the session through the shared session-admin RPC helper and then refreshes compare data.
- `Compare` already knows how to load ranked score rows including `placement` and `is_winner`.
- The current compare UI already has a `leader` concept, share behavior, and per-entry leaderboard cards.
- The app already uses routed screens for major flow transitions, so a dedicated `Victory` route fits the current structure better than a one-off alert.

## Scope

This change only covers the end-of-game transition and the new finished-state screen.

Included:

- adding a new `app/victory.tsx` route
- navigating to that route after a successful `Finish Game`
- showing a prominent winner card
- showing the final leaderboard
- reusing or sharing the existing results-share behavior
- adding a one-shot fireworks celebration on page entry
- adding a clear path to start a new session

Excluded:

- changing how the finish-game RPC computes placements or winners
- redesigning the full `Compare` screen
- auto-redirecting every already-finished compare visit into `Victory`
- adding trophies, achievements, or persistent celebration history
- creating a rematch flow that clones the finished table
- adding backend tables or new persisted victory data

## Product Decisions

### Route and Flow

After the finish-game RPC succeeds, `app/compare.tsx` should stop showing the completion alert and instead navigate to:

- `/victory?sessionId=<id>&joinCode=<code>`

The compare screen should still perform a post-finish refresh before navigating so the next screen receives finalized data conditions rather than assuming ranking state.

The `Victory` page should be a dedicated destination, not a modal and not an in-place compare variant. That gives the finish action a stronger payoff and keeps the finished state reusable.

This pass only redirects after the user successfully taps `Finish Game`. Manually opening a finished session in `Compare` can remain unchanged for now.

### Data Source

The `Victory` page should load standings from the same underlying session-score data already used by `Compare`.

Implementation should prefer sharing the compare-results loading logic rather than duplicating the query shape in two large screens. If a small shared loader/helper is needed, that is the preferred direction.

The page should derive the winner using this order:

1. first entry where `is_winner === true`
2. otherwise the entry with `placement === 1`
3. otherwise the first scored entry in final sorted order

This keeps the screen resilient in legacy or partially migrated ranking scenarios.

### Winner Card

The winner card is the main event.

It should show:

- winner name
- player ID when available
- duke name
- final score
- winner image thumbnail when a duke image exists

The card should visually feel more premium than the compare leader strip. It should read as a final result, not just a slightly bigger leaderboard row.

If the winner is a guest, the card should still present them exactly as a valid winner, with no downgraded language.

### Final Leaderboard

Below the winner card, the page should show the finalized standings for everyone who has a saved score.

Each row should show:

- placement
- player name
- guest marker when relevant
- player ID when available
- duke name
- final score

The leaderboard should be clearly final-state UI, not live-state UI. Remove compare-language such as `Waiting`, `Live update`, or `Tap to edit` from this page.

### Actions

The page should include two clear actions:

- `Share Results`
- `New Session`

`Share Results` should reuse the same ranking-oriented message style already present on `Compare`.

`New Session` should return the user to `create-session`. This is intentionally simpler than a rematch feature and fits the user-approved scope.

An optional lightweight back affordance is acceptable, but the primary call to action after celebration should be starting the next session.

### Fireworks

The `Victory` page should play a celebratory fireworks effect when it first opens.

Rules:

- fireworks should auto-play once on initial screen mount
- the effect should be lightweight and short, roughly `2-4` seconds
- it should not block scrolling, sharing, or button presses
- it should not loop forever
- it should not require adding a new dependency if the existing stack can support it

The fireworks should feel additive rather than chaotic: a layered overlay above the page background and behind or around the winner card is the target mood.

If reduced-motion support is easy to honor in the existing stack, the effect should degrade to a calmer glow or static celebratory state instead of repeated bursts.

## UI Design

### Page Structure

Top to bottom:

1. compact header with title such as `Victory`
2. short celebratory hero copy
3. winner card
4. final leaderboard card
5. action row or stacked buttons for `Share Results` and `New Session`

The page should visually belong to the current Valeria style system, but it should feel brighter and more triumphant than `Compare`.

### Winner Card Layout

The winner card should include:

- a small `Winner` or `Victory` kicker
- large winner name
- supporting line with player ID when present
- duke thumbnail or fallback
- final score in a highly legible value treatment
- a short celebratory line such as `Top score at this table`

If `is_winner` data is present, the card can show a crown or winner badge. If not, the card should still render cleanly based on the top resolved winner.

### Visual Direction

This screen should use the existing fantasy style without looking like another compare variant.

Preferred direction:

- richer accent treatment than the normal surface cards
- a celebratory glow around the winner card
- fireworks overlay with gold and accent tones
- a more polished end-state background treatment than the live compare card stack

The page should still work on smaller phones without clipping the winner card or action buttons.

## Error Handling

- If finalized standings cannot be loaded, show a clear retry state on the `Victory` page instead of navigating back automatically.
- If no winner can be resolved but scored entries exist, show a neutral `Top Result` card using the first ranked entry.
- If the route is opened without a valid session id, show a simple recovery state with a button back to `create-session`.
- Fireworks failure should never break the screen. If the celebration effect cannot render, the page should still show the winner card and final leaderboard normally.

## Testing

Add or update tests for:

1. winner resolution fallback order
2. navigation behavior after successful finish
3. victory route state for missing session id
4. final leaderboard filtering and formatting logic that can be tested outside React
5. fireworks state logic if it is implemented with a small pure helper

Manual verification should cover:

1. host finishes a game and lands on `Victory` instead of seeing the old alert
2. winner card shows the correct player, duke, and score
3. guests can appear as winners without broken labels
4. `Share Results` exports ranked standings in final order
5. `New Session` returns to `create-session`
6. fireworks play once and do not block taps

## Risks

- If compare and victory load rankings through separate ad hoc query code, they can drift. Shared loading logic is the safer design.
- Very loud fireworks could make the screen feel cheap. The effect should stay short and layered, not constant.
- If older environments are missing ranking columns, the page may need to fall back to top-score resolution more often; that is acceptable for this pass.

## Implementation Notes

- Prefer extracting shared compare-result loading into a helper if that keeps `compare.tsx` and `victory.tsx` smaller and more consistent.
- Keep the finish action host-only exactly as it is now.
- Do not add new backend writes for celebration state.
- Keep the victory screen focused on payoff and closure rather than reopening live editing controls.
