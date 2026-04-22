# Player Stats Enhancements Design

## Goal

Extend the existing `Player Stats` screen so it shows higher-value player performance signals without turning it into a separate analytics dashboard.

This pass should ship end-to-end on the current screen and add:

- Player win rate
- Player podium rate
- Best duke
- Favorite duke
- Normalized finish by table size

## Existing Context

- The `Player Stats` UI lives in `app/player-stats.tsx`.
- The screen currently reads from `player_global_stats`, `player_global_stats_30d`, `player_duke_stats`, and `player_duke_stats_30d` through `lib/player-stats-data.ts`.
- Player leaderboard rows already show wins, games played, and average score.
- The selected-player panel already loads the player's per-duke rows for the active time window and optional duke filter.
- Analytics are rebuilt from locked `session_scores` in `supabase/migrations/20260422130500_secure_analytics_rollups.sql`.
- Each saved score row already persists `inputs`, `score_total`, `duke_slug`, ownership metadata, and lock state.

## Scope

This change only covers the `Player Stats` experience.

Included:

- Extending the player analytics rollups with richer rate-based metrics
- Extending the resolver layer in `lib/player-stats-data.ts`
- Adding compact leaderboard UI for the new metrics
- Adding richer selected-player summary content on `app/player-stats.tsx`
- Deriving `best duke` and `favorite duke` from the selected player's per-duke rows in the current active filter context
- Preserving the existing `All Time` and `30d` time-window behavior

Excluded:

- Changes to `Profile`
- Changes to `Duke Stats`
- Score-composition analytics from the saved `inputs` JSON
- A new standalone analytics screen
- Replacing the current leaderboard sort order

## Product Decisions

### Time Window and Filter Semantics

All new metrics should honor the current `Player Stats` controls:

- `All Time` uses the all-time rollup tables
- `30d` uses the 30-day rollup tables
- The duke filter continues to narrow the loaded leaderboard source and selected-player rows

The screen should not mix scopes. If the user is looking at `30d`, all summary metrics and duke callouts should reflect `30d` only.

### Best Duke and Favorite Duke Rules

`Favorite duke` means the duke with the highest `games_played` count for the selected player in the active view. Ties break by:

1. Higher win rate
2. Better normalized finish
3. Higher average score
4. Alphabetical duke slug

`Best duke` means the strongest duke for the selected player in the active view, but only among dukes with at least `3` games played in that same view. It ranks by:

1. Higher win rate
2. Better normalized finish
3. Higher average score
4. Higher games played
5. Alphabetical duke slug

If no duke meets the minimum sample size, the UI should show a lightweight `Not enough data yet` state instead of selecting a one-game outlier.

### Normalized Finish Definition

Average finish is useful but unfair across different table sizes. This pass adds `avg_finish_percentile`, a normalized score where:

- `100` means first place
- `0` means last place
- values between reflect relative placement within the table size

For each locked score row:

- if `player_count <= 1`, the normalized finish is `100`
- otherwise use:

`(1 - ((placement - 1) / (player_count - 1))) * 100`

The player rollups should store the average of that normalized value across included games.

## Data Design

### Rollup Tables

Add these columns to both `player_global_stats` and `player_global_stats_30d`:

- `podiums integer not null default 0`
- `win_rate numeric(10, 2) not null default 0`
- `podium_rate numeric(10, 2) not null default 0`
- `avg_finish_percentile numeric(10, 2) not null default 0`

Add these columns to both `player_duke_stats` and `player_duke_stats_30d`:

- `podiums integer not null default 0`
- `win_rate numeric(10, 2) not null default 0`
- `podium_rate numeric(10, 2) not null default 0`
- `avg_finish_percentile numeric(10, 2) not null default 0`

No new columns are needed for `best_duke` or `favorite_duke`. Those should stay client-derived from the already-loaded selected-player duke rows so the rollup tables remain broadly reusable.

### Rollup Rebuild Logic

Update the analytics rebuild SQL so the shared `analytics_rows` shape includes a per-row normalized finish value derived from `placement` and `player_count`.

For player global rollups:

- `podiums` is the count of rows where `placement <= 3`
- `win_rate` is `wins / games_played * 100`
- `podium_rate` is `podiums / games_played * 100`
- `avg_finish_percentile` is the average normalized finish value

For player duke rollups:

- compute the same four metrics, grouped by `player_key` and `duke_slug`

The existing trigger-based rebuild flow remains the source of truth. This pass extends the rollup payload rather than changing the rebuild strategy.

## Resolver and Helper Design

### `lib/player-stats-data.ts`

Extend `RawPlayerLeaderboardRow`, `PlayerLeaderboardRow`, `RawPlayerDukeRow`, and `PlayerDukeRow` with:

- `podiums`
- `win_rate`
- `podium_rate`
- `avg_finish_percentile`

All new numeric fields should be normalized through the existing number parsing path and default to `0` so older or partially migrated environments fail soft instead of crashing the screen.

### New Player Stats Helper

Add a small pure helper module for selected-player duke insights. It should:

- derive `favorite duke`
- derive `best duke`
- avoid one-game outliers via the minimum-games rule
- stay independent from React so it can be tested directly

This helper should accept resolved `PlayerDukeRow[]` and return presentation-ready insight data for the selected-player panel.

## UI Design

### Leaderboard Rows

Keep the leaderboard row structure familiar and compact.

Current row metrics:

- Wins
- Games
- Average score

New row metrics:

- Win rate
- Games
- Average score

The row subtitle should include podium context and normalized finish in a concise sentence, for example:

- `12 wins - 18 podiums - Norm finish 71.4`

This keeps the leaderboard scannable while making player quality clearer than raw win counts alone.

### Selected Player Summary

Replace the single selected-player summary pill with a four-stat summary strip:

- Games
- Win Rate
- Podium Rate
- Norm Finish

These should be the primary summary numbers for the selected player and should update with the active time window and duke filter.

### Selected Player Insight Cards

Add two small cards above the duke list:

- `Favorite Duke`
- `Best Duke`

Each card should show:

- duke name
- a short supporting line such as games played, win rate, or normalized finish

If no best duke qualifies under the minimum-games rule, show a neutral message such as `Not enough data yet`.

### Duke Breakdown Rows

Keep the current duke breakdown list, but make each row more informative. Each row should show:

- duke name
- games played
- wins
- win rate
- normalized finish
- average score

The screen should not add a second nested analytics section below this list. The goal is better signal, not a busier layout.

## Sorting and Ranking

Do not change the leaderboard sort order in this pass.

The existing ordering remains:

1. Wins descending
2. Average score descending
3. Average finish ascending

This avoids surprising users while still letting the new rate-based metrics improve interpretation.

The selected player's per-duke rows should sort by:

1. Wins descending
2. Win rate descending
3. Normalized finish descending
4. Average score descending
5. Duke slug ascending

## Error Handling

- Missing new columns in partially migrated environments should resolve to `0` in the TypeScript normalization layer wherever possible.
- If a selected player has no qualifying duke for the `best duke` rule, show a neutral empty state rather than misleading output.
- If the selected player has no duke rows after the current filter is applied, keep the existing empty-state behavior.
- Existing `loadError`, retry, and pull-to-refresh behavior on `Player Stats` should remain unchanged.

## Testing

Add or update tests for:

1. SQL migration coverage for the new player analytics columns and rebuild expressions
2. `lib/player-stats-data.ts` normalization of the new numeric fields
3. The new pure helper that resolves `favorite duke` and `best duke`
4. Any screen-facing formatting or selection logic that can be tested outside React rendering

Manual verification should cover:

1. `All Time` leaderboard shows win-rate-oriented player rows
2. `30d` leaderboard shows the same metrics with windowed values
3. Selecting a player shows the four summary stats and both duke insight cards
4. Applying a duke filter still updates leaderboard and selected-player data coherently
5. A player with too little duke history shows the `best duke` fallback state

## Risks

- The current leaderboard ordering may still overweight total wins relative to rates; this is acceptable for this pass because we are intentionally not changing ranking behavior yet.
- Duke filters can narrow data enough that `best duke` disappears often; that is preferable to rewarding tiny samples.
- Adding too many new labels to each row could make the screen feel noisy, so the implementation should favor short labels and compact support text.

## Implementation Notes

- Prefer extending the existing `Player Stats` data flow rather than creating parallel queries or RPCs.
- Keep `best duke` and `favorite duke` client-derived from selected-player duke rows for this pass.
- Leave score-composition analytics for a later phase when the app is ready to use the stored `inputs` JSON for deeper strategy reporting.
