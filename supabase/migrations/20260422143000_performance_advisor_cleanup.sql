-- Clean up duplicate RLS policies and indexes surfaced by the Supabase
-- performance advisor, while preserving the app's current access patterns.

begin;

-- Remove duplicated updated_at triggers.
drop trigger if exists handle_updated_at on public.profiles;
drop trigger if exists set_player_scores_updated_at on public.player_scores;

-- Remove dead and duplicate indexes on guest_profiles.
drop index if exists public.guest_profiles_contact_email_idx;
drop index if exists public.guest_profiles_display_name_idx;
drop index if exists public.guest_profiles_linked_user_id_idx;
drop index if exists public.guest_profiles_owner_user_id_idx;
drop index if exists public.guest_profiles_public_player_id_idx;
drop index if exists public.guest_profiles_public_player_id_key;

-- Drop guest_profiles policies before removing the legacy creator column.
drop policy if exists "Users manage their guests" on public.guest_profiles;
drop policy if exists guest_profiles_insert_authenticated on public.guest_profiles;
drop policy if exists guest_profiles_select_authenticated on public.guest_profiles;
drop policy if exists guest_profiles_update_creator on public.guest_profiles;
drop policy if exists guest_profiles_update_owner on public.guest_profiles;
drop policy if exists guest_profiles_delete_owner on public.guest_profiles;

-- Remove the unused legacy creator column that only existed to back an
-- unindexed foreign key and a no-op policy.
alter table public.guest_profiles
  drop column if exists created_by_user_id;

-- Remove dead and duplicate indexes on player_scores.
drop index if exists public.player_scores_duke_slug_idx;
drop index if exists public.player_scores_is_guest_idx;
drop index if exists public.player_scores_session_idx;
drop index if exists public.player_scores_session_user_idx;
drop index if exists public.player_scores_session_user_unique;
drop index if exists public.player_scores_user_idx;

-- Rebuild game_sessions policies with one permissive policy per action.
drop policy if exists "Owner can delete game" on public.game_sessions;
drop policy if exists "Users can delete their own game_sessions" on public.game_sessions;
drop policy if exists "Users can insert their own game_sessions" on public.game_sessions;
drop policy if exists "Users can view their own game_sessions" on public.game_sessions;
drop policy if exists "Users can update their own game_sessions" on public.game_sessions;
drop policy if exists game_sessions_delete_creator on public.game_sessions;
drop policy if exists game_sessions_insert_authenticated on public.game_sessions;
drop policy if exists game_sessions_select_authenticated on public.game_sessions;
drop policy if exists game_sessions_update_creator on public.game_sessions;

create policy game_sessions_insert_authenticated
on public.game_sessions
for insert
to authenticated
with check ((select auth.uid()) = created_by);

create policy game_sessions_select_authenticated
on public.game_sessions
for select
to authenticated
using (true);

create policy game_sessions_update_creator
on public.game_sessions
for update
to authenticated
using ((select auth.uid()) = created_by)
with check ((select auth.uid()) = created_by);

create policy game_sessions_delete_creator
on public.game_sessions
for delete
to authenticated
using ((select auth.uid()) = created_by);

-- Rebuild session_players policies with one permissive policy per action.
drop policy if exists "Player can leave game" on public.session_players;
drop policy if exists "Users can delete their own session_players rows" on public.session_players;
drop policy if exists "Users can insert their own session_players rows" on public.session_players;
drop policy if exists "Users can view their own session_players rows" on public.session_players;
drop policy if exists "Users can update their own session_players rows" on public.session_players;
drop policy if exists session_players_delete_self on public.session_players;
drop policy if exists session_players_insert_self on public.session_players;
drop policy if exists session_players_select_authenticated on public.session_players;
drop policy if exists session_players_update_self on public.session_players;

create policy session_players_insert_self
on public.session_players
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy session_players_select_authenticated
on public.session_players
for select
to authenticated
using (true);

create policy session_players_update_self
on public.session_players
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy session_players_delete_self
on public.session_players
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Rebuild profiles policies and keep the shared-session read behavior in one
-- select policy.
drop policy if exists "Users can delete themselves" on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_shared_session_member on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
drop policy if exists profiles_delete_own on public.profiles;

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy profiles_select_shared_session_member
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.session_players me
    join public.session_players peer
      on peer.session_id = me.session_id
    where me.user_id = (select auth.uid())
      and peer.user_id = profiles.id
  )
  or exists (
    select 1
    from public.game_sessions gs
    where gs.created_by = (select auth.uid())
      and exists (
        select 1
        from public.session_players peer
        where peer.session_id = gs.id
          and peer.user_id = profiles.id
      )
  )
);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy profiles_delete_own
on public.profiles
for delete
to authenticated
using ((select auth.uid()) = id);

-- Replace guest_profiles overlap with explicit policies per action.
create policy guest_profiles_select_authenticated
on public.guest_profiles
for select
to authenticated
using (true);

create policy guest_profiles_insert_authenticated
on public.guest_profiles
for insert
to authenticated
with check ((select auth.uid()) = owner_user_id);

create policy guest_profiles_update_owner
on public.guest_profiles
for update
to authenticated
using ((select auth.uid()) = owner_user_id)
with check ((select auth.uid()) = owner_user_id);

create policy guest_profiles_delete_owner
on public.guest_profiles
for delete
to authenticated
using ((select auth.uid()) = owner_user_id);

-- Consolidate player_scores policies while preserving the current broad read
-- access for authenticated users.
drop policy if exists "Users can delete their own player_scores rows" on public.player_scores;
drop policy if exists "Users can insert their own player_scores rows" on public.player_scores;
drop policy if exists "Users can view scores in their sessions" on public.player_scores;
drop policy if exists "Users can update their own player_scores rows" on public.player_scores;
drop policy if exists "guest owners can insert guest player scores" on public.player_scores;
drop policy if exists "guest owners can update guest player scores" on public.player_scores;
drop policy if exists "users can insert their own scores" on public.player_scores;
drop policy if exists "users can read session scores" on public.player_scores;
drop policy if exists "users can update their own scores" on public.player_scores;
drop policy if exists player_scores_delete_self on public.player_scores;
drop policy if exists player_scores_insert_self on public.player_scores;
drop policy if exists player_scores_select_authenticated on public.player_scores;
drop policy if exists player_scores_update_self on public.player_scores;
drop policy if exists player_scores_insert_authenticated on public.player_scores;
drop policy if exists player_scores_update_authenticated on public.player_scores;

create policy player_scores_select_authenticated
on public.player_scores
for select
to authenticated
using (true);

create policy player_scores_insert_authenticated
on public.player_scores
for insert
to authenticated
with check (
  (
    is_guest = false
    and user_id = (select auth.uid())
  )
  or (
    is_guest = true
    and owner_user_id = (select auth.uid())
    and user_id is null
  )
);

create policy player_scores_update_authenticated
on public.player_scores
for update
to authenticated
using (
  (
    is_guest = false
    and user_id = (select auth.uid())
  )
  or (
    is_guest = true
    and owner_user_id = (select auth.uid())
  )
)
with check (
  (
    is_guest = false
    and user_id = (select auth.uid())
  )
  or (
    is_guest = true
    and owner_user_id = (select auth.uid())
  )
);

create policy player_scores_delete_self
on public.player_scores
for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Consolidate session_scores policies so shared-session reads and creator
-- finish permissions remain intact without duplicate permissive policies.
drop policy if exists session_scores_delete_own on public.session_scores;
drop policy if exists session_scores_insert_own on public.session_scores;
drop policy if exists session_scores_select_own on public.session_scores;
drop policy if exists session_scores_select_session_members on public.session_scores;
drop policy if exists session_scores_update_own on public.session_scores;
drop policy if exists session_scores_update_session_creator on public.session_scores;

create policy session_scores_insert_own
on public.session_scores
for insert
to authenticated
with check ((select auth.uid()) = owner_user_id);

create policy session_scores_select_session_members
on public.session_scores
for select
to authenticated
using (
  owner_user_id = (select auth.uid())
  or exists (
    select 1
    from public.session_players participant
    where participant.session_id = session_scores.session_id
      and participant.user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.game_sessions gs
    where gs.id = session_scores.session_id
      and gs.created_by = (select auth.uid())
  )
);

create policy session_scores_update_session_creator
on public.session_scores
for update
to authenticated
using (
  owner_user_id = (select auth.uid())
  or exists (
    select 1
    from public.game_sessions gs
    where gs.id = session_scores.session_id
      and gs.created_by = (select auth.uid())
  )
)
with check (
  owner_user_id = (select auth.uid())
  or exists (
    select 1
    from public.game_sessions gs
    where gs.id = session_scores.session_id
      and gs.created_by = (select auth.uid())
  )
);

create policy session_scores_delete_own
on public.session_scores
for delete
to authenticated
using ((select auth.uid()) = owner_user_id);

commit;
