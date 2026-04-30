# Monster Symbols Category Design

## Goal

Promote `Monster Symbols` into a shared stat category so the score screen, player stats, duke stats, and shared insight copy all treat boss, lieutenant, claw, and minions as their own bucket instead of mixing them into `Points on Cards`.

## Existing Context

- The score screen groups visible stat rows with `groupScoreScreenStats(...)` in `lib/score-stat-layout.ts` and renders those groups in `app/score.tsx`.
- The shared stat metadata in `data/statMeta.ts` still classifies `bossCount`, `lieutenantCount`, `beastCount`, and `minionCount` as `points`.
- Analytics category totals and labels come from `lib/score-category-breakdown.ts`.
- Shared profile/category insight text comes from `lib/category-insights.ts`.
- Duke breakdown insight text uses the same category labels through `lib/duke-breakdown-insights.ts`.
- Player and duke stats category cards both render from `components/PlayerCategoryBreakdownCard.tsx`.

## Product Decision

`Monster Symbols` becomes a first-class shared category.

Included stats:

- `bossCount`
- `lieutenantCount`
- `beastCount`
- `minionCount`

Category behavior:

- `monsterPoints` stays under `Points on Cards`
- `domainPoints` stays under `Points on Cards`
- `vp` stays in the score screen `Resources` section but remains its own analytics category in `lib/score-category-breakdown.ts`

## Display Behavior

### Score Screen

Render order becomes:

1. `Resources`
2. `Symbols`
3. `Monster Symbols`
4. `Counts`
5. `Points on Cards`

The four monster-symbol rows move out of `Points on Cards` and into `Monster Symbols`.

### Shared Analytics Surfaces

Player stats, duke stats, and profile/category insights should all reflect the same new category label and totals.

That includes:

- category share cards
- top-category calculations
- category ordering in shared summaries
- duke breakdown "Where Points Come From" copy

## Naming Decision

Keep the existing row labels `Beast` and `Minion`.

Only the shared category grouping changes to `Monster Symbols`.

No data keys or stored payload fields should change.

## Architecture

Use one shared category model rather than per-screen exceptions.

- `data/statMeta.ts` becomes the display source of truth for `Monster Symbols`
- `lib/score-stat-layout.ts` handles score-screen section grouping and order
- `lib/score-category-breakdown.ts` handles shared analytics category totals, ordering, and labels
- dependent insight and card components should continue consuming those shared exports rather than duplicating category rules

## Testing

Add or update focused tests for:

- score-screen regrouping in `lib/score-stat-layout.test.js`
- shared category totals/labels in `lib/score-category-breakdown.test.js`
- shared insight copy in `lib/category-insights.test.js`
- duke breakdown insight category naming in `lib/duke-breakdown-insights.test.js`

## Risks

- changing only the score-screen grouping would leave analytics and insight text inconsistent
- changing only analytics categories would leave the score screen inconsistent
- renaming stored stat keys would be unnecessary risk and is explicitly out of scope

## Scope Guardrails

This change should not alter:

- score calculation math
- stored score payload shape
- Supabase queries or schemas
- duke card multipliers
- session or compare behavior
