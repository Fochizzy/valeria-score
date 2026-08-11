-- Some older or partially completed onboarding flows can leave a guest profile
-- pre-linked to the same auth user before the durable conversion happens.
-- Treat those rows as claimable so the registration flow still upgrades the
-- guest into a real player profile and removes the guest row afterward.
--
-- Widening the lookup that way pulls in two hazards that the old, narrower
-- predicate could not reach, so guard both here:
--
--   * guest_profiles lost its unique index on public_player_id in
--     20260422143000, so a normalized id can match more than one row. With the
--     `linked_user_id = v_user_id` branch the candidate set now spans rows the
--     caller does not own, and an unordered `limit 1` could re-point a third
--     party's scores and then delete their guest profile. Refuse to guess.
--   * A self-linked guest is exactly the case where the caller may already
--     hold a seat in the same session. Re-owning the guest row there would
--     leave one user with two score rows in one game — two placements, double
--     counted stats, duplicated compare rows — and no unique constraint on
--     session_scores(session_id, owner_user_id) exists to stop it.
--
-- The conversion also hands over scored_by_user_id. Guest rows are inserted by
-- the host, and both the update and delete RLS policies on session_scores key
-- off scored_by_user_id (the delete policy has no session-creator fallback),
-- so leaving it on the host locks the new owner out of rows that now count
-- toward their own stats.

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
  v_match_count integer := 0;
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

  select count(*)::int
  into v_match_count
  from public.guest_profiles
  where upper(btrim(public_player_id)) = v_normalized_public_player_id
    and (
      linked_user_id is null
      or linked_user_id = v_user_id
    );

  if v_match_count > 1 then
    raise exception 'That Player ID matches more than one guest. Ask the host to remove the duplicate before claiming it.';
  end if;

  select *
  into v_guest
  from public.guest_profiles
  where upper(btrim(public_player_id)) = v_normalized_public_player_id
    and (
      linked_user_id is null
      or linked_user_id = v_user_id
    )
  order by (linked_user_id = v_user_id) desc nulls last, id
  limit 1;

  if v_guest.id is null then
    raise exception 'No unclaimed guest matches that Player ID';
  end if;

  if exists (
    select 1
    from public.session_scores guest_row
    join public.session_scores own_row
      on own_row.session_id = guest_row.session_id
     and own_row.owner_user_id = v_user_id
     and own_row.id <> guest_row.id
    where guest_row.guest_profile_id = v_guest.id
  ) then
    raise exception 'That guest already shares a game with your account. Ask the host to remove the duplicate seat before claiming it.';
  end if;

  select profiles.public_player_id, profiles.display_name
  into v_existing_profile_player_id, v_existing_profile_display_name
  from public.profiles
  where profiles.id = v_user_id;

  update public.session_scores
  set
    owner_user_id = v_user_id,
    scored_by_user_id = v_user_id,
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
