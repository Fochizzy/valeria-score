-- Require the target player's password when adding a registered player
-- profile to a session via the Add Guest flow.
--
-- Phase 2 shipped add_player_to_session(session_id, target_user_id) which
-- inserted a row attributed to any registered player as long as the caller
-- knew their display name + player ID. That's a weak verification — anyone
-- could grab another player's stats history by adding them to a session.
--
-- This migration replaces the unverified RPC with a password-gated one.
-- The plain-text password is bcrypt-verified server-side against
-- auth.users.encrypted_password using pgcrypto's crypt(). Bcrypt does the
-- timing-safe comparison itself when you re-encrypt with the stored hash
-- as salt.
--
-- Old function is dropped so callers can't bypass the password gate.

drop function if exists public.add_player_to_session(uuid, uuid);

drop function if exists public.add_player_to_session_verified(uuid, uuid, text);

create function public.add_player_to_session_verified(
  p_session_id uuid,
  p_target_user_id uuid,
  p_target_password text
)
returns jsonb
language plpgsql
security definer
-- extensions schema is added so we can call extensions.crypt() while
-- search_path is otherwise locked down to public.
set search_path = public, extensions
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
  v_target_encrypted_password text;
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
    raise exception 'You are already in this game - no need to add yourself.';
  end if;

  if p_target_password is null or btrim(p_target_password) = '' then
    raise exception 'Password is required to add this player.';
  end if;

  -- Verify the password against the target's bcrypt hash. We do this
  -- before any session-membership check so an attacker can't probe which
  -- sessions a target user is in.
  select au.encrypted_password
  into v_target_encrypted_password
  from auth.users au
  where au.id = p_target_user_id;

  if v_target_encrypted_password is null then
    raise exception 'That player profile no longer exists.';
  end if;

  if v_target_encrypted_password <> extensions.crypt(p_target_password, v_target_encrypted_password) then
    raise exception 'Incorrect password for that player.';
  end if;

  -- Caller must be in the session (or its creator).
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

  -- Don't double-add.
  select ss.id
  into v_existing_score_id
  from public.session_scores ss
  where ss.session_id = p_session_id
    and ss.owner_user_id = p_target_user_id
  limit 1;

  if v_existing_score_id is not null then
    raise exception 'That player is already in this game.';
  end if;

  -- Cap at 5 players.
  select count(distinct coalesce(ss.owner_user_id::text, ss.guest_profile_id::text))
  into v_player_count
  from public.session_scores ss
  where ss.session_id = p_session_id
    and (ss.owner_user_id is not null or ss.guest_profile_id is not null);

  if v_player_count >= 5 then
    raise exception 'Games can have at most 5 players.';
  end if;

  -- Insert. owner_user_id = the linked player so stats follow them;
  -- scored_by_user_id = the caller so the adder retains edit rights.
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

revoke all on function public.add_player_to_session_verified(uuid, uuid, text) from public, anon;
grant execute on function public.add_player_to_session_verified(uuid, uuid, text) to authenticated;
