-- Phase 2 of "any player can add any guest or player profile to a game".
--
-- Builds on Phase 1 (split scored_by_user_id from owner_user_id) by:
--   1. search_addable_profiles(query, session_id):
--      - SECURITY DEFINER lookup that surfaces matching guests AND registered
--        player profiles (regular users can't read other profiles via RLS).
--      - Filters out anyone already participating in the given session.
--   2. add_player_to_session(session_id, target_user_id):
--      - SECURITY DEFINER. Verifies the caller is a session participant or
--        creator, the target user has a profile, the player isn't already in
--        the game, and the cap of 5 players hasn't been hit.
--      - Inserts a session_scores row with owner_user_id = target user
--        (stats follow the added player) and scored_by_user_id = caller
--        (the adder gets edit rights).
--   3. session_players_after_insert_merge trigger:
--      - When a registered user joins a session that already has an
--        added-on-their-behalf row, hand over the editor role: set
--        scored_by_user_id = the joining user. From that point on the
--        joiner edits their own row (auto-merge per the design spec).

-- ---------- 1. search_addable_profiles ----------

drop function if exists public.search_addable_profiles(text, uuid);

create function public.search_addable_profiles(
  p_query text,
  p_session_id uuid
)
returns table (
  kind text,
  ref_id uuid,
  display_name text,
  public_player_id text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_query text;
  v_player_id text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_query := btrim(coalesce(p_query, ''));
  if v_query = '' then
    return;
  end if;

  v_player_id := upper(v_query);

  return query
  -- Guests (already free-readable, but we filter the same way for parity).
  select
    'guest'::text as kind,
    gp.id as ref_id,
    gp.display_name,
    gp.public_player_id
  from public.guest_profiles gp
  where (
      gp.display_name ilike '%' || v_query || '%'
      or coalesce(gp.public_player_id, '') ilike '%' || v_player_id || '%'
    )
    -- Exclude guests already in the session.
    and not exists (
      select 1 from public.session_scores ss
      where ss.session_id = p_session_id
        and ss.guest_profile_id = gp.id
    )

  union all

  -- Registered player profiles (RLS would normally hide these — security
  -- definer scope lets us scan, but we cap to the same lookup criteria).
  select
    'player'::text as kind,
    p.id as ref_id,
    p.display_name,
    p.public_player_id
  from public.profiles p
  where (
      p.display_name ilike '%' || v_query || '%'
      or coalesce(p.public_player_id, '') ilike '%' || v_player_id || '%'
    )
    -- Don't suggest yourself — the score row UI already handles "me".
    and p.id <> v_user_id
    -- Exclude players already in the session (either joined or added).
    and not exists (
      select 1 from public.session_players sp
      where sp.session_id = p_session_id
        and sp.user_id = p.id
    )
    and not exists (
      select 1 from public.session_scores ss
      where ss.session_id = p_session_id
        and ss.owner_user_id = p.id
    )

  order by display_name asc
  limit 12;
end;
$$;

revoke all on function public.search_addable_profiles(text, uuid) from public, anon;
grant execute on function public.search_addable_profiles(text, uuid) to authenticated;

-- ---------- 2. add_player_to_session ----------

drop function if exists public.add_player_to_session(uuid, uuid);

create function public.add_player_to_session(
  p_session_id uuid,
  p_target_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid;
  v_caller_is_member boolean;
  v_caller_is_creator boolean;
  v_target_display_name text;
  v_target_player_id text;
  v_existing_score_id uuid;
  v_player_count integer;
  v_new_score_id uuid;
begin
  v_caller := auth.uid();
  if v_caller is null then
    raise exception 'Not authenticated';
  end if;

  if p_session_id is null then
    raise exception 'Missing session id';
  end if;

  if p_target_user_id is null then
    raise exception 'Missing target player';
  end if;

  if p_target_user_id = v_caller then
    raise exception 'You are already in this game — no need to add yourself.';
  end if;

  -- Caller must be in the session (or the creator).
  select exists (
    select 1 from public.session_players sp
    where sp.session_id = p_session_id and sp.user_id = v_caller
  ) into v_caller_is_member;

  select exists (
    select 1 from public.game_sessions gs
    where gs.id = p_session_id and gs.created_by = v_caller
  ) into v_caller_is_creator;

  if not (v_caller_is_member or v_caller_is_creator) then
    raise exception 'Only players in this session can add others.';
  end if;

  -- Target must have a profile.
  select p.display_name, p.public_player_id
  into v_target_display_name, v_target_player_id
  from public.profiles p
  where p.id = p_target_user_id;

  if v_target_display_name is null then
    raise exception 'That player profile no longer exists.';
  end if;

  -- Don't double-add. If the target already has a row in this session,
  -- bail out cleanly — auto-merge happens elsewhere when *they* join.
  select ss.id
  into v_existing_score_id
  from public.session_scores ss
  where ss.session_id = p_session_id
    and ss.owner_user_id = p_target_user_id
  limit 1;

  if v_existing_score_id is not null then
    raise exception 'That player is already in this game.';
  end if;

  -- Cap at 5 players (matches the existing guest-add cap).
  select count(distinct coalesce(ss.owner_user_id::text, ss.guest_profile_id::text))
  into v_player_count
  from public.session_scores ss
  where ss.session_id = p_session_id
    and (ss.owner_user_id is not null or ss.guest_profile_id is not null);

  if v_player_count >= 5 then
    raise exception 'Games can have at most 5 players.';
  end if;

  -- Insert the score row. owner_user_id is the *added* player so stats
  -- follow them; scored_by_user_id is the caller so they can edit it.
  insert into public.session_scores (
    session_id,
    owner_user_id,
    scored_by_user_id,
    player_name,
    inputs,
    score_total,
    game_locked,
    included_in_stats
  )
  values (
    p_session_id,
    p_target_user_id,
    v_caller,
    v_target_display_name,
    '{}'::jsonb,
    0,
    false,
    false
  )
  returning id into v_new_score_id;

  return jsonb_build_object(
    'score_id', v_new_score_id,
    'session_id', p_session_id,
    'target_user_id', p_target_user_id,
    'display_name', v_target_display_name,
    'public_player_id', v_target_player_id
  );
end;
$$;

revoke all on function public.add_player_to_session(uuid, uuid) from public, anon;
grant execute on function public.add_player_to_session(uuid, uuid) to authenticated;

-- ---------- 3. Self-join auto-merge trigger ----------

create or replace function public.session_players_handover_to_self()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- When user X joins a session that already has a session_scores row with
  -- owner_user_id = X (because someone else added them), update the editor
  -- to be the joining user. They can now own their own row.
  update public.session_scores
  set scored_by_user_id = new.user_id
  where session_id = new.session_id
    and owner_user_id = new.user_id
    and scored_by_user_id is distinct from new.user_id;

  return new;
end;
$$;

drop trigger if exists session_players_handover_to_self_after_insert on public.session_players;
create trigger session_players_handover_to_self_after_insert
  after insert on public.session_players
  for each row
  execute function public.session_players_handover_to_self();
