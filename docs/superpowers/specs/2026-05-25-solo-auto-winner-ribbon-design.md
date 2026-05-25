# Solo Auto Winner Ribbon Design

Date: 2026-05-25
Repo: `C:\Users\izzyh\Desktop\valeria-score`

## Goal

Make the solo scoring screen show the existing `Winner` ribbon immediately for the two automatic solo endings:

1. `You slay all Monsters` should immediately ribbon the `Player` card.
2. `A Monster attacks an empty column` should immediately ribbon the `Dark Lord` card.

This change should not broaden ribbon behavior for contested solo games.

## Existing Context

The solo scoring flow is currently split across:

- `app/solo-victory-condition.tsx`
- `app/solo-score.tsx`
- `lib/solo-mode.ts`

The current screen already computes the winner immediately through `resolveSoloOutcome(...)`.

Relevant existing behavior:

- `slay_all_monsters` resolves to `{ winner: 'player', resolution: 'player_auto', requiresScoring: false }`
- `monster_attacks_empty_column` resolves to `{ winner: 'dark_lord', resolution: 'dark_lord_auto', requiresScoring: false }`
- `five_stacks_exhausted` resolves to contested scoring, with the winner determined from totals

The current UI already distinguishes two winner states on the solo cards:

- `previewWinner`
  - adds the visual glow/border
- `savedWinner`
  - controls whether the `Winner` ribbon actually renders

That means the screen already has the correct winner knowledge before save, but it intentionally delays the ribbon until `End Game and Save`.

## Approved Scope

The approved behavior is option 1 only:

- show the `Winner` ribbon immediately for automatic solo outcomes
- keep contested solo outcomes unchanged

Specifically:

- selecting `You slay all Monsters` should immediately place the ribbon on the `Player` box
- selecting `A Monster attacks an empty column` should immediately place the ribbon on the `Dark Lord` box
- selecting `Five card stacks are exhausted` should continue to show only the preview glow before save, not the ribbon

## UX Rules

### Automatic endings

For these two victory conditions:

- `slay_all_monsters`
- `monster_attacks_empty_column`

The winner ribbon should appear as soon as the player returns from the victory-condition picker and the score screen recomputes `currentOutcome`.

No save action is required to show the ribbon for those two outcomes.

### Contested ending

For:

- `five_stacks_exhausted`

The current behavior stays in place:

- the leading side may still receive preview styling
- the actual `Winner` ribbon remains save-gated

This preserves the distinction between:

- auto-decided solo endings
- contested endings that still depend on saved score confirmation

## Implementation Plan

Keep the data model unchanged and treat this as a presentation-state change only.

Recommended shape:

1. In `app/solo-score.tsx`, derive a boolean that means:
   - the current outcome is automatic
   - the current side matches the current computed winner
2. Pass that derived value into `SoloSideCard` separately from `savedWinner`
3. In `SoloSideCard`, render the existing ribbon when either:
   - the side is the saved winner
   - the side is the preview winner for an automatic outcome

The ribbon copy should continue to come from `buildSoloWinnerBanner(...)` so text stays consistent with the existing saved flow.

## State Rules

Do not change:

- `SoloDraft`
- `savedWinner`
- `savedGameId`
- `savedAt`
- `resolveSoloOutcome(...)`
- `validateSoloGameSetup(...)`

This feature is only about when the ribbon is displayed, not about changing persistence or winner resolution.

## File Boundaries

Expected touched files:

- `app/solo-score.tsx`
  - derive the new display flag and pass it into each solo side card
- `lib/solo-mode.test.js`
  - keep existing automatic winner coverage as the logic base
- a new focused UI/source regression or screen-level regression
  - lock that auto outcomes show the ribbon immediately while contested mode does not

Avoid pushing this into `lib/solo-mode.ts` because the winner logic is already correct there.

## Testing

Add focused coverage for:

1. `slay_all_monsters`
   - `Player` ribbon shows immediately before save
2. `monster_attacks_empty_column`
   - `Dark Lord` ribbon shows immediately before save
3. `five_stacks_exhausted`
   - ribbon still waits for save

Keep the existing `resolveSoloOutcome(...)` tests as the rule baseline and add a UI-facing regression near the solo score screen so the save-gating split remains explicit.

## Error Handling

This change should not add any new alert or failure paths.

If the victory condition is missing:

- no ribbon should render

If the screen is on the contested path:

- preview styling can remain
- ribbon remains hidden until save

## Out of Scope

The following are intentionally excluded:

- showing immediate winner ribbons for contested solo scoring
- changing save requirements
- changing winner text copy
- changing the victory-condition picker content
- altering solo result persistence

## Recommendation Summary

Implement a narrow UI-only winner-ribbon change on the solo score screen:

- auto-win player ending -> immediate `Player` ribbon
- auto-win Dark Lord ending -> immediate `Dark Lord` ribbon
- contested ending -> keep current save-gated ribbon behavior
