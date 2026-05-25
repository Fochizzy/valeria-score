# Solo Strategy Stats Design

Date: 2026-05-25
Repo: `C:\Users\izzyh\Desktop\valeria-score`

## Goal

Add strategy-facing solo analytics to the existing solo statistics page without mixing solo results into the multiplayer analytics model.

The new solo analytics should help the player answer three practical questions:

1. What is helping me win?
2. What is causing me to lose?
3. Which exact Duke matchups are strongest or weakest for me?

This design extends the existing solo-only data source and preserves the current rule that solo games remain siloed from multiplayer statistics.

## Existing Context

The current solo statistics page already shows:

- Solo snapshot summary tiles
- Victory type consistency
- Player Duke usage
- Dark Lord Duke usage
- Solo point distribution

The current solo data source already stores:

- Solo victory condition
- Winner and resolution type
- Player and Dark Lord Duke slugs
- Player and Dark Lord totals
- Score input payloads for both sides

Because those fields already exist, the new strategy layer can be derived from the current solo result history without introducing a required schema change.

## Approved UX Structure

The solo statistics page order will be:

1. `Solo Snapshot`
2. `Victory Types`
3. `Win Patterns`
4. `Risk Patterns`
5. `Matchups`
6. `Solo Point Distribution`

This keeps the page ordered from broad performance, to tendencies, to exact rivalry detail.

## Strategy Sections

### Win Patterns

Purpose: surface what is currently working for the player in solo mode.

Card contents:

- `Strongest Duke`
  - Best player Duke by win rate among player Dukes with at least 3 solo games.
- `Best Victory Condition`
  - Highest player win rate across the 3 solo victory conditions.
- `Contested Conversion`
  - Player wins divided by contested solo games only.
- `Winning Score Profile`
  - A short plain-English insight that highlights the top scoring categories that appear most strongly in player wins.
- `Average Winning Margin`
  - Used as supporting copy for the win profile or strongest Duke summary.

### Risk Patterns

Purpose: surface where solo games most often break down.

Card contents:

- `Hardest Victory Condition`
  - Lowest player win rate across the 3 solo victory conditions.
- `Toughest Dark Lord`
  - Dark Lord Duke with the worst player record against them, minimum 3 games.
- `Loss Type Split`
  - Auto-losses vs contested losses.
- `Loss Trap Category`
  - The scoring category with the biggest average drop from wins to losses.
- `Loss Insight`
  - A short sentence explaining where losses usually slide away, using plain-English category names.

### Matchups

Purpose: show exact player-vs-Dark-Lord pairings that are strongest or weakest.

Card contents:

- `Best Matchups`
  - A short top-3 list of qualifying player-Duke vs Dark-Lord pairings.
- `Worst Matchups`
  - A short bottom-3 list of qualifying player-Duke vs Dark-Lord pairings.
- `Most Played Rivalry`
  - The most frequent exact pairing regardless of outcome.

Each matchup row should display:

- `Player Duke vs Dark Lord Duke`
- `record`
- `win rate`
- `average margin`

## Qualification Rules

The approved threshold is:

- A Duke-based or matchup-based metric must have at least 3 games before it is labeled best or worst.

Specific rules:

- `Strongest Duke` requires at least 3 games for that player Duke.
- `Toughest Dark Lord` requires at least 3 games against that Dark Lord Duke.
- `Best Matchups` and `Worst Matchups` require at least 3 games for that exact player Duke vs Dark Lord Duke pairing.
- `Best Victory Condition` and `Hardest Victory Condition` do not require a 3-game threshold because there are only 3 possible solo endings and the page should still summarize them.

If a qualifying metric does not have enough data:

- Show `Not enough solo data yet` instead of forcing a best or worst label.

If only 1 or 2 matchup rows qualify:

- Show only the qualifying rows and keep the threshold unchanged.

## Auto-Win and Optional Duke Rules

Solo conditions `You slay all Monsters` and `A Monster attacks an empty column` allow save completion without Duke selection.

Those saves must still count in:

- `Solo Snapshot`
- `Victory Types`
- `Loss Type Split`
- Any global solo win/loss totals

Those saves must not distort Duke-specific or matchup-specific metrics when Duke data is absent.

That means Duke-less automatic saves are excluded from:

- `Strongest Duke`
- `Toughest Dark Lord`
- `Best Matchups`
- `Worst Matchups`
- Duke-based score profile aggregations

This matches the current solo save behavior and keeps optional Duke selection from creating blank leaderboard entries.

## Ranking and Tie-Break Rules

For best and worst matchup ranking:

1. Primary sort: win rate
2. Tie-break 1: average margin
3. Tie-break 2: total games
4. Tie-break 3: stable alphabetical fallback by matchup label

For strongest Duke and toughest Dark Lord:

1. Primary sort: win rate
2. Tie-break 1: average margin
3. Tie-break 2: total qualifying games

This avoids random movement in the UI when records are tied.

## Data Derivation Plan

The new strategy sections should be derived from the existing `solo_game_results` table and the current normalized solo stats helpers.

New derived aggregates will be needed for:

- Wins-only category emphasis
- Loss-only category emphasis
- Win vs loss category deltas
- Per-victory-condition records
- Per-player-Duke records
- Per-Dark-Lord-Duke records
- Exact matchup records keyed by `playerDukeSlug + darkLordDukeSlug`

No additional persistence is required for the first version.

## Component and File Boundaries

Recommended shape:

- Extend `lib/solo-stats.ts`
  - Add pure selectors/builders for:
    - win-pattern summary
    - risk-pattern summary
    - matchup leaderboard rows
- Extend `SoloStatsBundle`
  - Add structured fields for the three new sections
- Update `app/solo-stats.tsx`
  - Render the new cards in the approved page order
- Optionally add small presentational components if the page becomes too dense
  - `SoloInsightCard`
  - `SoloMatchupListCard`

Keep the heavy logic in `lib/solo-stats.ts` so the screen stays presentation-focused and the metrics remain easy to unit test.

## Empty-State and Copy Rules

Copy should stay short and mobile-friendly.

Examples:

- `Not enough solo data yet`
- `Need 3 games with this Duke before ranking it`
- `Your wins usually come from Domains and Monster Symbols`
- `Losses fall off most in Victory Points`

Avoid dense analytics wording or raw math-heavy copy in card subtitles.

## Error Handling

The new sections should inherit the existing solo statistics loading behavior:

- If solo stats fail to load, show the current retry state.
- If data is partial, render what can be derived and use empty-state copy for the rest.
- Never crash if Duke slugs are missing, blank, or no longer mapped to a card.

## Testing

Add unit tests for:

- 3-game qualification threshold behavior
- auto-win rows without Dukes counting in global totals but not Duke or matchup leaderboards
- strongest Duke ranking
- toughest Dark Lord ranking
- best and worst matchup sorting with tie-breaks
- loss trap category calculation
- contested conversion calculation

Add screen-level coverage if this repo already uses string-based tests for layout order or section titles.

## Out of Scope

The following are intentionally excluded from this design:

- Multiplayer analytics changes
- Any merge of solo data into player, Duke, or global multiplayer stats
- New database tables for cached solo aggregates
- Time-series solo performance charts
- Campaign progression systems beyond analytics display

## Recommendation Summary

Implement the strategy-facing solo analytics as three new stacked sections:

- `Win Patterns`
- `Risk Patterns`
- `Matchups`

Use a strict 3-game threshold for Duke and matchup labels, keep optional-Duke auto-win saves in solo-wide totals, and exclude duke-less saves from Duke-specific and matchup-specific leaderboards.
