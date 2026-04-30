-- Claim-a-guest flow.
--
-- Lets a freshly-signed-up authenticated user adopt an unclaimed guest profile by
-- knowing the guest's exact display name + public_player_id. On success:
--   * every session_scores row tied to the guest gets reassigned to auth.uid()
--   * the new user's profiles row inherits the guest's public_player_id and
--     display_name when those slots are empty/blank on the new profile
--   * the guest_profiles row is deleted (it's been "converted" into a real
--     player account)
--
-- The function is SECURITY DEFINER so it can update across rows the caller
-- might not normally see (other people's session scores), but the only entry
-- point requires auth.uid() and exact-match credentials, which is the
-- verification the user picked.

drop function if exists public.claim_guest_profile(text, text);

create function public.claim_guest_profile(
  p_display_name text,
  p_public_player_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_guest record;
  v_scores_moved integer := 0;
  v_normalized_display_name text;
  v_normalized_public_player_id text;
  v_existing_profile_player_id text;
  v_existing_profile_display_name text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_display_name is null or btrim(p_display_name) = '' then
    raise exception 'Guest display name is required';
  end if;

  if p_public_player_id is null or btrim(p_public_player_id) = '' then
    raise exception 'Guest player ID is required';
  end if;

  v_normalized_display_name := lower(btrim(p_display_name));
  v_normalized_public_player_id := lower(btrim(p_public_player_id));

  -- Look up the matching unclaimed guest. Both fields must match (case-insensitive,
  -- trimmed) — this is the verification the user opted in to.
  select *
  into v_guest
  from public.guest_profiles
  where lower(btrim(display_name)) = v_normalized_display_name
    and lower(btrim(public_player_id)) = v_normalized_public_player_id
    and linked_user_id is null
  limit 1;

  if v_guest.id is null then
    raise exception 'No unclaimed guest matches that display name and player ID';
  end if;

  -- Make sure the public_player_id wouldn't collide with an existing profile.
  -- Edge case: the new user already has a public_player_id set; we keep theirs.
  select profiles.public_player_id, profiles.display_name
  into v_existing_profile_player_id, v_existing_profile_display_name
  from public.profiles
  where profiles.id = v_user_id;

  -- Reassign all guest session_scores rows to the authenticated user.
  update public.session_scores
  set
    owner_user_id = v_user_id,
    guest_profile_id = null,
    guest_entry_id = null
  where guest_profile_id = v_guest.id;
  get diagnostics v_scores_moved = row_count;

  -- Copy guest identity onto the new user's profile row when slots are empty.
  -- public_player_id has a unique index on profiles, so we only copy it across
  -- if the new user doesn't already have one.
  update public.profiles
  set
    public_player_id = case
      when v_existing_profile_player_id is null or btrim(v_existing_profile_player_id) = ''
        then v_guest.public_player_id
      else v_existing_profile_player_id
    end,
    display_name = case
      when v_existing_profile_display_name is null or btrim(v_existing_profile_display_name) = ''
        then v_guest.display_name
      else v_existing_profile_display_name
    end,
    updated_at = now()
  where profiles.id = v_user_id;

  -- The guest has been converted into a real player account. Drop the guest row.
  delete from public.guest_profiles where id = v_guest.id;

  return jsonb_build_object(
    'guest_id', v_guest.id,
    'guest_display_name', v_guest.display_name,
    'guest_public_player_id', v_guest.public_player_id,
    'scores_transferred', v_scores_moved
  );
end;
$$;

revoke all on function public.claim_guest_profile(text, text) from public, anon;
grant execute on function public.claim_guest_profile(text, text) to authenticated;
