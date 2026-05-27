-- Claim guest profiles by the same durable Player ID used throughout the app.
--
-- The create-user flow now asks only for the guest Player ID. That matches the
-- guest creation and add-to-game flows, where the Player ID is the durable
-- identity used to find and reuse the same guest profile later.

create or replace function public.claim_guest_profile(
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
  v_normalized_public_player_id text;
  v_existing_profile_player_id text;
  v_existing_profile_display_name text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_public_player_id is null or btrim(p_public_player_id) = '' then
    raise exception 'Guest player ID is required';
  end if;

  v_normalized_public_player_id := upper(
    left(
      regexp_replace(btrim(p_public_player_id), '[^A-Za-z0-9_-]', '', 'g'),
      20
    )
  );

  if v_normalized_public_player_id = '' then
    raise exception 'Guest player ID is required';
  end if;

  select *
  into v_guest
  from public.guest_profiles
  where upper(btrim(public_player_id)) = v_normalized_public_player_id
    and linked_user_id is null
  limit 1;

  if v_guest.id is null then
    raise exception 'No unclaimed guest matches that Player ID';
  end if;

  select profiles.public_player_id, profiles.display_name
  into v_existing_profile_player_id, v_existing_profile_display_name
  from public.profiles
  where profiles.id = v_user_id;

  update public.session_scores
  set
    owner_user_id = v_user_id,
    guest_profile_id = null,
    guest_entry_id = null
  where guest_profile_id = v_guest.id;
  get diagnostics v_scores_moved = row_count;

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

  delete from public.guest_profiles where id = v_guest.id;

  return jsonb_build_object(
    'guest_id', v_guest.id,
    'guest_display_name', v_guest.display_name,
    'guest_public_player_id', v_guest.public_player_id,
    'scores_transferred', v_scores_moved
  );
end;
$$;

revoke all on function public.claim_guest_profile(text) from public, anon;
grant execute on function public.claim_guest_profile(text) to authenticated;
