# Guest Autosave And Shared Profile Cards Design

Date: 2026-05-27
Repo: `C:\Users\izzyh\Desktop\valeria-score`

## Goal

Add Supabase-backed draft autosave for guest scoring while keeping guest results out of the adder's personal profile statistics.

The final behavior should satisfy four rules:

1. True guest seats must autosave their in-progress duke/scoring state to Supabase so the user who added the guest can leave and resume later.
2. Added-player seats must also autosave and resume from the perspective of the user who added that player, even though the final committed score still belongs to the real player account.
3. Guest roster/profile cards must be accessible to the original guest owner and to any player who has ever shared a session with that guest.
4. If a guest profile is later converted into a full account, the guest's score history and in-progress draft data must transfer to the real account and the `guest_profiles` row must be deleted.

## Approved Visibility Rules

The approved visibility model is:

- Guest results do **not** count toward the adder's personal profile summary or history.
- Guest results live under guest roster/profile cards only.
- Shared viewers can open a guest profile card, but they only see:
  - committed guest history/statistics
  - an `in progress` signal for active drafts
- Shared viewers do **not** see the live draft duke, draft inputs, or draft totals before the scorer taps `Save`.
- The user who added the guest keeps edit/resume access to that guest's draft scoring flow.

## Existing Context

### Session score model

The app's live multiplayer scoring now runs on `public.session_scores`, not the old `player_scores` table.

Current identity patterns:

- **Real self-scored row**
  - `owner_user_id = auth.uid()`
  - `guest_profile_id = null`
  - `guest_entry_id = null`
- **True guest row**
  - `owner_user_id = user who added the guest`
  - `guest_profile_id = reusable guest identity`
  - `guest_entry_id = per-session seat identity`
- **Added registered player row**
  - `owner_user_id = real target player`
  - `scored_by_user_id = user who added them`
  - `guest_profile_id = null`
  - `guest_entry_id = null`
  - `player_name = added player's display name`

### Guest add flow

The guest add flow already inserts a placeholder `session_scores` row immediately when the guest is added to the game:

- `lib/sessions.ts`
- `lib/guest-session-entry.ts`
- `app/guest-player.tsx`

That means draft autosave should update the existing seat row instead of inventing a separate placeholder concept.

### Current draft behavior

The score screen currently autosaves drafts only to local `AsyncStorage` in `app/score.tsx`.

That draft state is local-device recovery only:

- it does not sync to Supabase
- it cannot be resumed from another device
- it does not contribute any in-progress signal to guest cards

### Current profile/dashboard behavior

`public.get_profile_dashboard()` currently:

- builds the viewer's own profile summary/history from `session_scores.owner_user_id = auth.uid()`
- builds `sharedGuestProfiles` only from guest rows where `owner_user_id = auth.uid()`

So today:

- guest cards are effectively owner-only
- guest results never show up for other shared-session players
- the guest-card list is not yet a true shared access surface

### Current guest claim behavior

The repo already has the newer player-ID-based claim RPC in:

- `supabase/migrations/20260501101500_claim_guest_profile_by_player_id.sql`

That function:

- moves `session_scores` rows from `guest_profile_id` to `owner_user_id = auth.uid()`
- clears guest identifiers
- copies missing guest identity onto the real profile
- deletes the `guest_profiles` row

This is the correct backend direction. The older client helper in `lib/profile.ts` still references legacy `player_scores` behavior and needs to be aligned to the newer RPC contract.

## Design Options

### Option 1: Add draft columns directly to `session_scores`

Add draft-only guest/added-player fields to the existing `session_scores` row and treat committed fields as the only source of visible history/statistics.

Pros:

- Fits the existing placeholder-row model
- Lets claim transfer carry both committed and draft state by updating the same row
- Minimizes new join paths and new RLS policy surface
- Keeps compare, profile, and claim logic centered on one multiplayer score table

Cons:

- Requires careful separation between committed and draft fields
- Load/save helpers need to understand two parallel score states

### Option 2: Add a separate `session_score_drafts` table

Store draft guest state in a second table and keep `session_scores` committed-only.

Pros:

- Strong separation between draft and committed data
- Easier to guarantee that committed queries never accidentally read draft values

Cons:

- More schema and RLS complexity
- More claim-transfer work
- More joins for guest-card in-progress badges
- Harder to keep the draft row keyed correctly for guest seats vs added-player seats

### Option 3: Reuse committed score fields as the draft source

Write autosave edits directly into `duke_slug`, `inputs`, and `score_total`, then keep using the existing manual save button as a UI-only checkpoint.

Pros:

- Lowest implementation cost

Cons:

- Violates the approved privacy rule because other viewers could infer live duke/score details
- Makes compare/history logic think drafts are committed
- Breaks the distinction between `in progress` and `saved`

## Recommendation

Use **Option 1**: add draft columns directly to `session_scores`.

This matches the current seat-row model, preserves the claim-transfer path, and gives the cleanest way to show `in progress` without exposing live draft details.

## Approved Data Model

Add draft-only fields to `public.session_scores`:

- `draft_duke_slug text`
- `draft_inputs jsonb`
- `draft_score_total integer`
- `draft_updated_at timestamptz`

Recommended semantics:

- Draft fields are nullable.
- Draft fields belong to the current editor flow only.
- Committed fields remain:
  - `duke_slug`
  - `inputs`
  - `score_total`
  - `updated_at`
- A row is considered `drafting` when:
  - `draft_updated_at is not null`
  - and the row is not fully locked/finished in a way that should suppress editing

### Why draft fields live on `session_scores`

Because guest add already creates a seat row, the system already has the durable identity needed for draft autosave:

- true guest: `guest_entry_id`
- added player: `owner_user_id` + `scored_by_user_id`

No extra draft table is needed.

## Ownership And Access Model

There are now three separate concerns that must stay distinct:

### 1. Final stat ownership

What profile gets credit for committed history?

- True guest rows:
  - stay under the guest profile card
  - do not contribute to the adder's personal profile summary/history
- Added registered player rows:
  - continue to belong to the real player's profile because `owner_user_id = added player`
  - do not appear in guest-card lists because they are not backed by `guest_profiles`

### 2. Draft edit ownership

Who can resume editing the in-progress draft?

- True guest rows:
  - only the user who added the guest
- Added registered player rows:
  - the user who added the player, via `scored_by_user_id`

### 3. Guest card read access

Who can open the guest roster/profile card?

- The guest profile owner
- Any authenticated user who has ever shared a session with that guest

Shared access is read-only at the guest-card level.

Delete/manage actions remain owner-only.

## Guest Card Sharing Rule

The guest-card list should no longer mean only `guests I own`.

Instead, the profile guest-card surface should show:

- guest profiles owned by the viewer
- guest profiles for which the viewer has shared-session access

The surface may still use the existing `sharedGuestProfiles` name internally, but the data contract now means:

- `sharedGuestProfiles = guest cards the viewer may open`

Recommended copy update:

- Replace owner-only wording like `Shared guests you created across sessions`
- Use wording closer to `Guest profiles from your shared games`

## Draft Autosave Behavior

### True guest seats

When the score screen is opened in guest mode:

- continue local `AsyncStorage` draft persistence for offline/recovery behavior
- also debounce a Supabase draft save into the existing `session_scores` seat row
- write only draft fields during autosave
- do not update committed fields during autosave

Manual `Save` should:

- promote the current draft values into committed fields
- preserve the existing saved-score flow
- clear draft fields after the commit succeeds

### Added registered player seats

When the score screen is opened on behalf of an added registered player:

- autosave to draft fields on that player's existing `session_scores` row
- continue to key the row by `owner_user_id = added player`
- preserve `scored_by_user_id = adder` so the adder can resume/edit later

Manual `Save` should:

- commit into the real row
- clear the draft fields afterward
- keep final ownership on the real player profile

### Resume rule

When loading a score screen:

- if a draft exists and is newer/more relevant than the committed score state, resume the draft
- if no draft exists, use the committed score state
- if neither exists, use the empty default state

This applies to:

- true guest resume from the adder side
- added-player resume from the adder side
- self-owned rows after claim transfer

## Guest Card In-Progress Visibility

Guest cards should show a lightweight in-progress indicator only.

Approved behavior:

- show that a guest has one or more in-progress game entries
- optionally show a safe timestamp like `Updated 5 min ago`
- do not show:
  - draft duke
  - draft inputs
  - draft score total
  - draft rank/standing

Recommended card-level data:

- `inProgressCount`
- `lastDraftUpdatedAt`

Those values should be derived from rows where:

- `guest_profile_id = that guest`
- `draft_updated_at is not null`

and should not require the frontend to fetch raw draft payloads for shared viewers.

## Dashboard And Profile Query Changes

`public.get_profile_dashboard()` should be extended so it can:

1. Build committed guest stats from committed guest rows only.
2. Include shared-session guest cards, not just owner-created guest cards.
3. Include in-progress summary fields for guest cards without exposing draft details.

Recommended query shape:

- Keep personal `history_rows` owner-only and non-guest.
- Expand guest-card discovery from only `owner_user_id = viewer` to:
  - guests owned by viewer
  - guests referenced by any `session_scores` guest seat in a session the viewer participated in or hosted
- Compute guest-card stats from committed guest rows only.
- Compute guest-card draft badges from draft-only fields.

The viewer's main summary/history must remain unchanged:

- guest committed rows do not enter the viewer's own `summary`
- guest committed rows do not enter the viewer's own `history`

## Compare And History Rules

Compare/history must continue to treat only committed guest saves as real saved scores.

That means:

- draft-only guest edits do not become compare-visible saved details
- draft-only guest edits do not affect rank/leader logic
- guest cards may show `in progress`, but compare rows still depend on the committed row state the compare model already expects

This preserves the approved rule:

- autosave supports resume and guest-card signaling
- `Save` remains the reveal point for actual duke/score details

## Claim Transfer Rules

The player-ID-based `claim_guest_profile(...)` RPC remains the source of truth.

Required behavior after this design:

- transferring a guest to a real account must carry both committed and draft state because both live on `session_scores`
- the update that currently:
  - assigns `owner_user_id = auth.uid()`
  - clears `guest_profile_id`
  - clears `guest_entry_id`
  should leave draft columns intact
- once reassigned, those rows belong to the new real profile
- the `guest_profiles` row is deleted

Result:

- the old guest card disappears
- committed history now lives under the real user
- any unfinished draft can resume through the real-user row model

## Client Alignment Work

The stale legacy helper in `lib/profile.ts` should be aligned to the new claim path.

Specifically:

- stop migrating `player_scores`
- call the newer `claim_guest_profile(text)` RPC
- trust `session_scores` as the canonical transfer surface

This avoids split-brain behavior between the current database contract and old client assumptions.

## File And Boundary Plan

### Backend

- Create a migration that adds the draft columns to `session_scores`
- Update `get_profile_dashboard()`
- Update or replace claim behavior only as needed to preserve draft fields

### Shared Type/Helper Layer

- Extend `lib/scores.ts`
  - load committed + draft state
  - autosave draft helper
  - commit helper clears draft fields
- Extend `lib/score-save-payload.ts`
  - separate draft payload construction from committed payload construction
- Extend profile/dashboard normalization in `lib/profile-dashboard-data.ts`
  - include in-progress metadata on guest cards

### Screen Layer

- `app/score.tsx`
  - debounce Supabase draft autosave
  - resume from Supabase draft state
  - keep `Save` as the commit boundary
- `app/profile.tsx`
  - render guest-card in-progress badges
  - support guest-card access for shared viewers
- `app/manage-data.tsx`
  - remain owner-only for destructive guest management
  - may keep the current owner-only guest list copy

## Testing

Add or update tests for:

- guest draft autosave payload building
- added-player draft autosave payload building
- load/resume preferring draft state when present
- commit clearing draft fields
- guest-card in-progress summary without draft detail leakage
- profile dashboard excluding guest rows from the viewer's personal history/summary
- shared-session guest-card access for non-owners
- claim transfer preserving draft state while deleting the guest row

Recommended focused areas:

- `lib/scores.ts`
- `lib/score-save-payload.ts`
- `lib/profile-dashboard-data.ts`
- SQL migration assertion tests for the new dashboard/claim contract

## Out Of Scope

The following are intentionally excluded:

- changing personal profile summaries to include guest results
- exposing live guest draft duke/score details to shared viewers
- turning guest-card delete/cleanup into a shared permission
- redesigning the compare save model for all seat types
- reviving legacy `player_scores` transfer logic

## Recommendation Summary

Implement guest and added-player Supabase draft autosave by extending the existing `session_scores` row with draft-only fields.

Use those draft fields to support:

- resume-from-adder scoring for true guests
- resume-from-adder scoring for added registered players
- guest-card `in progress` badges for owners and shared-session viewers

Keep committed guest results out of the adder's personal profile statistics, and let guest-to-real-account conversion continue through the modern `claim_guest_profile(...)` RPC, with the guest row deleted after transfer.
