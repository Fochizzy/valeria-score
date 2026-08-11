-- The analytics rollups are rebuilt wholesale by private.rebuild_public_analytics(),
-- which TRUNCATEs and repopulates player_duke_stats, player_global_stats,
-- duke_global_stats and duke_input_stat_profiles. Every trigger that calls it
-- was FOR EACH ROW, so finishing a 5-player game ran five sequential full
-- rebuilds -- five TRUNCATEs taking an ACCESS EXCLUSIVE lock -- inside the
-- finish transaction. claim_guest_profile's score handover paid the same cost
-- once per transferred row.
--
-- private.refresh_public_analytics_from_change() reads neither NEW nor OLD, so
-- statement-level firing produces the identical end state for a fraction of
-- the work. The session_scores triggers carried a WHEN clause over NEW/OLD,
-- which statement-level triggers cannot express, so those move the same
-- predicate into the function body over transition tables. An UPDATE that
-- touches no qualifying row now skips the rebuild entirely, which the old
-- per-row WHEN also did.

create or replace function private.session_score_counts_for_analytics(
  p_game_locked boolean,
  p_included_in_stats boolean,
  p_duke_slug text
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_game_locked, false)
    and coalesce(p_included_in_stats, false)
    and p_duke_slug is not null
    and btrim(p_duke_slug) <> ''
    and p_duke_slug <> 'no-duke-selected';
$$;

create or replace function private.refresh_public_analytics_after_score_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from inserted_rows ir
    where private.session_score_counts_for_analytics(
      ir.game_locked,
      ir.included_in_stats,
      ir.duke_slug
    )
  ) then
    perform private.rebuild_public_analytics();
  end if;

  return null;
end;
$$;

create or replace function private.refresh_public_analytics_after_score_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from previous_rows pr
    where private.session_score_counts_for_analytics(
      pr.game_locked,
      pr.included_in_stats,
      pr.duke_slug
    )
  ) or exists (
    select 1
    from updated_rows ur
    where private.session_score_counts_for_analytics(
      ur.game_locked,
      ur.included_in_stats,
      ur.duke_slug
    )
  ) then
    perform private.rebuild_public_analytics();
  end if;

  return null;
end;
$$;

create or replace function private.refresh_public_analytics_after_score_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from deleted_rows dr
    where private.session_score_counts_for_analytics(
      dr.game_locked,
      dr.included_in_stats,
      dr.duke_slug
    )
  ) then
    perform private.rebuild_public_analytics();
  end if;

  return null;
end;
$$;

drop trigger if exists refresh_public_analytics_on_session_scores_insert on public.session_scores;
create trigger refresh_public_analytics_on_session_scores_insert
after insert on public.session_scores
referencing new table as inserted_rows
for each statement
execute function private.refresh_public_analytics_after_score_insert();

drop trigger if exists refresh_public_analytics_on_session_scores_update on public.session_scores;
create trigger refresh_public_analytics_on_session_scores_update
after update on public.session_scores
referencing old table as previous_rows new table as updated_rows
for each statement
execute function private.refresh_public_analytics_after_score_update();

drop trigger if exists refresh_public_analytics_on_session_scores_delete on public.session_scores;
create trigger refresh_public_analytics_on_session_scores_delete
after delete on public.session_scores
referencing old table as deleted_rows
for each statement
execute function private.refresh_public_analytics_after_score_delete();

-- These four never had a WHEN clause, so they only need the firing level
-- changed. private.refresh_public_analytics_from_change() stays as-is.
drop trigger if exists refresh_public_analytics_on_profiles_update on public.profiles;
create trigger refresh_public_analytics_on_profiles_update
after update of display_name, public_player_id on public.profiles
for each statement
execute function private.refresh_public_analytics_from_change();

drop trigger if exists refresh_public_analytics_on_profiles_delete on public.profiles;
create trigger refresh_public_analytics_on_profiles_delete
after delete on public.profiles
for each statement
execute function private.refresh_public_analytics_from_change();

drop trigger if exists refresh_public_analytics_on_guest_profiles_update on public.guest_profiles;
create trigger refresh_public_analytics_on_guest_profiles_update
after update of display_name, public_player_id on public.guest_profiles
for each statement
execute function private.refresh_public_analytics_from_change();

drop trigger if exists refresh_public_analytics_on_guest_profiles_delete on public.guest_profiles;
create trigger refresh_public_analytics_on_guest_profiles_delete
after delete on public.guest_profiles
for each statement
execute function private.refresh_public_analytics_from_change();
