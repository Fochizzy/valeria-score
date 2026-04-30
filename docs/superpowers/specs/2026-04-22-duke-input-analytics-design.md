# Duke Input Analytics Design

## Goal

Extend `Duke Stats` with strategy-oriented analytics derived from the raw `session_scores.inputs` payload that is already saved with each locked score.

This pass should help a player answer two questions for every duke:

- How does this duke usually score?
- What do winning games with this duke look like?

The experience should stay lightweight in the list view while offering a richer comparison for the selected duke on the same screen.

## Existing Context

- The `Duke Stats` screen lives in `app/duke-stats.tsx`.
- The screen currently loads `duke_global_stats` through `lib/duke-stats-data.ts`.
- Existing duke analytics focus on aggregate performance such as win rate, placement percentages, best score, most wins, and best average.
- Each saved score row already persists `duke_slug`, `score_total`, `inputs`, ownership metadata, lock state, and inclusion-in-stats state.
- Duke scoring rules currently live in app code under `data/cards.ts`; the database does not appear to have its own duke multiplier source yet.

## Scope

This change only covers `Duke Stats` and the analytics sources it depends on.

Included:

- deriving duke analytics from raw score-input data
- adding a lightweight input-based teaser to each duke card
- adding a selected-duke detail panel on the same screen
- comparing all-games behavior with winner-only behavior for the selected duke
- creating a SQL-side source of duke scoring rules so input analytics can be computed inside the analytics rebuild flow

Excluded:

- changes to `Player Stats`
- changes to `Profile`
- a new standalone analytics route
- time-window filters such as `30d`
- per-player input analytics
- changing the existing duke ranking order for the main list

## Product Decisions

### Screen Shape

The `Duke Stats` screen should remain a single route with a hybrid experience:

- the list of duke cards remains the main browse surface
- each card gets a compact teaser from the new input-derived analytics
- tapping a duke updates an in-place selected-duke detail panel above the list

This avoids adding a second screen while still leaving room for richer analytics than a card grid can comfortably hold.

### Primary Comparison

The selected-duke detail panel should show both:

- `Usual Scoring`: all tracked games for the selected duke
- `Winning Profile`: tracked winning games for the selected duke only

The panel should also include a short `What Changes In Wins` section that summarizes the largest positive deltas in plain language.

### Global Only for This Pass

This pass should stay global. It uses the same all-time locked-score dataset that powers the current `duke_global_stats` view.

No `30d` toggle or time-window filtering should be added in this iteration. Keeping the first pass global reduces UI complexity and keeps the new SQL sources focused.

### Minimum Sample Rules

Winner-only comparisons are useful only with enough data. The screen should:

- always show `Usual Scoring` when duke input analytics exist
- only show the full `Winning Profile` and `What Changes In Wins` sections when the selected duke has at least `3` tracked wins
- otherwise show a neutral `Not enough winning data yet` state for the winner comparison area

This protects the screen from overfitting to one-off wins.

## Data Design

### SQL-Side Duke Rules Source

Because duke multipliers currently live in TypeScript, the migration should add a private rules source in the database so analytics rebuilds can calculate scored output from the saved `inputs` JSON.

Recommended shape:

- `private.duke_score_rules`

Recommended columns:

- `duke_slug text not null`
- `stat_key text not null`
- `multiplier numeric(10, 2) not null`
- `scoring_mode text not null`

`scoring_mode` should distinguish at least:

- `multiply`
- `divide_floor`
- `none`

This table should be populated from the app's current duke definitions inside the migration so SQL analytics and app scoring stay aligned.

### Expanded Duke Card Teasers

Extend `public.duke_global_stats` with a small, card-safe teaser payload rather than storing every input metric directly on the main row.

Recommended teaser fields:

- `top_input_stat_key text`
- `top_input_label text`
- `top_input_points_share numeric(10, 2)`
- `winner_edge_stat_key text`
- `winner_edge_label text`
- `winner_edge_delta numeric(10, 2)`

These values give each duke card two scannable lines:

- what usually drives its scoring
- what most differentiates its winning games

### Selected-Duke Detail Source

Add a second analytics source for the selected-duke panel.

Recommended shape:

- `public.duke_input_stat_profiles`

Recommended columns:

- `duke_slug text not null`
- `stat_key text not null`
- `profile_scope text not null`
- `games_sample integer not null default 0`
- `avg_input numeric(10, 2) not null default 0`
- `avg_points_generated numeric(10, 2) not null default 0`
- `points_share numeric(10, 2) not null default 0`
- `global_points_share numeric(10, 2) not null default 0`
- `share_delta_vs_global numeric(10, 2) not null default 0`

`profile_scope` should support:

- `all_games`
- `winning_games`

This source should be normalized to one row per `duke_slug` + `stat_key` + `profile_scope` so the client can render comparisons without carrying a giant denormalized row shape.

### Metric Semantics by Stat Type

Different input buckets should render different metrics depending on how they behave.

For point-oriented stats:

- `vp`
- `monsterPoints`
- `domainPoints`

Show:

- average points
- share of total points

For division-resource stats:

- `gold`
- `magic`
- `fight`

Show:

- average entered amount
- average points generated
- share of total points

For count-oriented engine stats:

- `bossCount`
- `lieutenantCount`
- `beastCount`
- `minionCount`
- `citizenCount`
- `domainCount`
- `hammer`
- `helmet`
- `key`
- `holy`

Show:

- average count per game
- points contribution when the duke actually scores that stat

## Rebuild Logic

### Input Expansion

The analytics refresh should expand `session_scores.inputs` for locked, included score rows and join each expanded stat against `private.duke_score_rules`.

For each score row and stat key, compute:

- raw input amount
- points generated by that input under the duke's rule
- score-row total points for share calculations
- winner/non-winner grouping

### Aggregations

For each duke:

1. build an all-games profile across all supported stat keys
2. build a winner-only profile across the same stat keys
3. compare each duke profile against the global baseline for that same stat key
4. derive card-safe teaser fields from the strongest all-games source and the largest winning overindex signal

The global baseline should be computed from the same locked, included score rows across all dukes so `share_delta_vs_global` stays comparable.

### Refresh Strategy

Do not invent a second analytics refresh mechanism.

Instead, extend the existing trigger-driven rebuild flow that currently refreshes `duke_global_stats`, `player_global_stats`, and related tables. The new rules table should be static reference data, while the teaser/profile tables should be rebuilt alongside the existing analytics tables.

## Client Design

### Main Duke List

Keep the current search and ranked card list in `app/duke-stats.tsx`.

Each duke card should keep the existing core performance boxes and add a compact teaser area with:

- `Scores Through`: the strongest normal scoring source for the duke
- `Winning Edge`: the biggest positive winner-overindex signal

These should remain one-line summaries so the list stays browseable.

### Selected-Duke Detail Panel

Add a selected-duke panel above the list and below the existing hero/headlines area.

Behavior:

- default to the top filtered duke when no manual selection exists
- preserve the current selection when possible as search changes
- reset to the first filtered duke if the selected duke disappears from the filtered set

Content:

- duke header with image and core summary
- `Usual Scoring`
- `Winning Profile`
- `What Changes In Wins`

### Detail Panel Presentation

`Usual Scoring` and `Winning Profile` should each show the most meaningful input buckets first, ordered by points share descending.

For each row, render:

- stat label
- average input or count
- average points generated when relevant
- points share

`What Changes In Wins` should be a short natural-language summary derived from the strongest positive deltas, for example:

- `Winning Cornelius games lean more on domains than his global baseline`
- `Winning Mico games overindex on boss scoring`

Cap this section at `2` or `3` insights so it stays sharp.

## Error Handling

- If the base `duke_global_stats` fetch succeeds but the detail profile fetch fails, keep the list usable and show a retryable error only inside the selected-duke panel.
- If the new teaser columns are missing in a partially migrated environment, keep rendering the existing duke stats and suppress the teaser copy.
- If the detail source is missing or empty, hide the input-based modules and keep the old screen behavior.
- If a duke has fewer than `3` wins, keep the winner comparison area neutral instead of fabricating deltas from tiny samples.

## Testing

Add or update tests for:

1. the migration's SQL-side duke rules seed data
2. score-input expansion and points-generated calculations
3. teaser derivation for `Scores Through` and `Winning Edge`
4. detail profile normalization and sorting logic in TypeScript
5. selection behavior when the filtered duke list changes
6. fallback behavior for missing teaser/detail analytics

Manual verification should cover:

1. the current duke list still loads and ranks as before
2. each duke card shows compact input teasers when analytics exist
3. tapping a duke updates the detail panel in place
4. the detail panel compares `Usual Scoring` against `Winning Profile`
5. low-sample dukes show the neutral winner fallback state
6. partial failure in the detail fetch does not break the card list

## Risks

- SQL and app scoring can drift if the private rules seed is not kept in sync with `data/cards.ts`.
- Winner-overindex messaging can become noisy if too many tiny deltas are rendered, so the insight section must stay tightly capped.
- Adding too much copy to each duke card could make the list feel heavy, so teaser text should stay concise and secondary to the existing performance metrics.

## Implementation Notes

- Prefer a small new TypeScript data module for selected-duke input analytics rather than growing `lib/duke-stats-data.ts` into a mixed-responsibility file.
- Keep the card teaser payload intentionally tiny; richer comparison belongs in the selected-duke panel.
- Use the existing analytics rebuild triggers and RLS patterns as the template for any new public analytics tables.
- Treat this as the foundation for later input-based analytics elsewhere in the app, but do not broaden this pass beyond `Duke Stats`.
