alter table public.session_scores
  add column if not exists recap_player_name text;

alter table public.session_scores
  add column if not exists recap_player_id text;

with recap_identity as (
  select
    ss.id,
    case
      when ss.guest_profile_id is null
        and ss.guest_entry_id is null
        and ss.player_name is null
      then coalesce(
        nullif(btrim(p.display_name), ''),
        nullif(upper(btrim(p.public_player_id)), ''),
        'Player'
      )
      else coalesce(
        nullif(btrim(ss.player_name), ''),
        nullif(btrim(gp.display_name), ''),
        nullif(upper(btrim(gp.public_player_id)), ''),
        'Guest Player'
      )
    end as next_recap_player_name,
    case
      when ss.guest_profile_id is null
        and ss.guest_entry_id is null
        and ss.player_name is null
      then nullif(upper(btrim(p.public_player_id)), '')
      else nullif(upper(btrim(gp.public_player_id)), '')
    end as next_recap_player_id
  from public.session_scores ss
  left join public.profiles p
    on p.id = ss.owner_user_id
   and ss.guest_profile_id is null
   and ss.guest_entry_id is null
   and ss.player_name is null
  left join public.guest_profiles gp
    on gp.id = ss.guest_profile_id
  where coalesce(ss.game_locked, false)
)
update public.session_scores ss
set
  recap_player_name = recap_identity.next_recap_player_name,
  recap_player_id = recap_identity.next_recap_player_id
from recap_identity
where ss.id = recap_identity.id
  and (
    ss.recap_player_name is null
    or btrim(ss.recap_player_name) = ''
    or ss.recap_player_id is null
  );

create or replace function public.finish_game(p_session_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  session_creator uuid;
  expected_player_count integer;
  session_player_count integer;
  guest_entry_count integer;
  ready_score_count integer;
  required_score_count integer;
begin
  if auth.uid() is null then
    raise exception 'User not authenticated';
  end if;

  select
    gs.created_by,
    gs.expected_player_count
  into
    session_creator,
    expected_player_count
  from public.game_sessions gs
  where gs.id = p_session_id;

  if session_creator is null then
    raise exception 'Session not found';
  end if;

  if session_creator <> auth.uid() then
    raise exception 'Only the session creator can finish this game.';
  end if;

  select
    count(*)::int as participant_count
  into session_player_count
  from public.session_players sp
  where sp.session_id = p_session_id;

  select
    count(*)::int as participant_count
  into guest_entry_count
  from public.session_scores ss
  where ss.session_id = p_session_id
    and (
      ss.guest_profile_id is not null
      or ss.guest_entry_id is not null
      or ss.player_name is not null
    );

  select count(*)
  into ready_score_count
  from public.session_scores ss
  where ss.session_id = p_session_id
    and ss.duke_slug is not null;

  if ready_score_count = 0 then
    raise exception 'No scores found for this session';
  end if;

  expected_player_count := least(5, greatest(2, coalesce(expected_player_count, 2)));

  required_score_count := greatest(
    expected_player_count,
    coalesce(session_player_count, 0) + coalesce(guest_entry_count, 0),
    2
  );

  if ready_score_count < required_score_count then
    raise exception 'Every player must save a score before finishing the game.';
  end if;

  with ranked_scores as (
    select
      ss.id,
      rank() over (
        order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
      ) as next_placement,
      case
        when ss.guest_profile_id is null
          and ss.guest_entry_id is null
          and ss.player_name is null
        then coalesce(
          nullif(btrim(p.display_name), ''),
          nullif(upper(btrim(p.public_player_id)), ''),
          'Player'
        )
        else coalesce(
          nullif(btrim(ss.player_name), ''),
          nullif(btrim(gp.display_name), ''),
          nullif(upper(btrim(gp.public_player_id)), ''),
          'Guest Player'
        )
      end as next_recap_player_name,
      case
        when ss.guest_profile_id is null
          and ss.guest_entry_id is null
          and ss.player_name is null
        then nullif(upper(btrim(p.public_player_id)), '')
        else nullif(upper(btrim(gp.public_player_id)), '')
      end as next_recap_player_id
    from public.session_scores ss
    left join public.profiles p
      on p.id = ss.owner_user_id
     and ss.guest_profile_id is null
     and ss.guest_entry_id is null
     and ss.player_name is null
    left join public.guest_profiles gp
      on gp.id = ss.guest_profile_id
    where ss.session_id = p_session_id
      and ss.duke_slug is not null
  )
  update public.session_scores ss
  set
    placement = ranked_scores.next_placement,
    is_winner = ranked_scores.next_placement = 1,
    game_locked = true,
    included_in_stats = true,
    recap_player_name = ranked_scores.next_recap_player_name,
    recap_player_id = ranked_scores.next_recap_player_id,
    updated_at = now()
  from ranked_scores
  where ss.id = ranked_scores.id;
end;
$$;

create or replace function public.leave_game(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'User not authenticated';
  end if;

  update public.session_scores ss
  set
    owner_user_id = null,
    player_name = null,
    recap_player_name = 'Mx. Doe',
    recap_player_id = 'Mx. Doe',
    included_in_stats = false,
    updated_at = now()
  where ss.session_id = p_session_id
    and ss.owner_user_id = auth.uid()
    and ss.guest_profile_id is null
    and ss.guest_entry_id is null
    and ss.player_name is null
    and coalesce(ss.game_locked, false);

  if found then
    delete from public.session_players
    where session_id = p_session_id
      and user_id = auth.uid();

    return;
  end if;

  delete from public.session_scores ss
  where ss.session_id = p_session_id
    and ss.owner_user_id = auth.uid()
    and ss.guest_profile_id is null
    and ss.guest_entry_id is null
    and ss.player_name is null
    and not coalesce(ss.game_locked, false);

  delete from public.session_players
  where session_id = p_session_id
    and user_id = auth.uid();
end;
$$;

create or replace function public.leave_all_games()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'User not authenticated';
  end if;

  update public.session_scores ss
  set
    owner_user_id = null,
    player_name = null,
    recap_player_name = 'Mx. Doe',
    recap_player_id = 'Mx. Doe',
    included_in_stats = false,
    updated_at = now()
  where ss.owner_user_id = auth.uid()
    and ss.guest_profile_id is null
    and ss.guest_entry_id is null
    and ss.player_name is null
    and coalesce(ss.game_locked, false);

  delete from public.session_scores ss
  where ss.owner_user_id = auth.uid()
    and ss.guest_profile_id is null
    and ss.guest_entry_id is null
    and ss.player_name is null
    and not coalesce(ss.game_locked, false);

  delete from public.session_players
  where user_id = auth.uid();
end;
$$;
