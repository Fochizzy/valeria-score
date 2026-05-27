alter table public.game_sessions
  add column if not exists score_revision integer not null default 1;

alter table public.session_scores
  add column if not exists confirmed_revision integer not null default 0;

update public.game_sessions
set score_revision = 1
where score_revision is null
   or score_revision < 1;

update public.session_scores
set confirmed_revision = 1
where (coalesce(game_locked, false) or duke_slug is not null)
  and coalesce(confirmed_revision, 0) < 1;

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
  session_score_revision integer;
  top_tie_count integer;
begin
  if auth.uid() is null then
    raise exception 'User not authenticated';
  end if;

  select
    gs.created_by,
    gs.expected_player_count,
    coalesce(gs.score_revision, 1)
  into
    session_creator,
    expected_player_count,
    session_score_revision
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
    and ss.duke_slug is not null
    and coalesce(ss.confirmed_revision, 0) = session_score_revision;

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

  select count(*)
  into top_tie_count
  from public.session_scores ss
  where ss.session_id = p_session_id
    and ss.duke_slug is not null
    and coalesce(ss.confirmed_revision, 0) = session_score_revision
    and coalesce(ss.score_total, 0) = (
      select max(coalesce(inner_scores.score_total, 0))
      from public.session_scores inner_scores
      where inner_scores.session_id = p_session_id
        and inner_scores.duke_slug is not null
        and coalesce(inner_scores.confirmed_revision, 0) = session_score_revision
    );

  if top_tie_count > 1 then
    raise exception 'A top-score tie must be resolved before finishing the game.';
  end if;

  with ranked_scores as (
    select
      ss.id,
      row_number() over (
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
      and coalesce(ss.confirmed_revision, 0) = session_score_revision
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

create or replace function public.finish_game_with_tiebreak(
  p_session_id uuid,
  p_tiebreak_score_ids uuid[]
)
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
  session_score_revision integer;
  top_tied_score_ids uuid[];
  top_tied_count integer;
  submitted_count integer;
  distinct_submitted_count integer;
begin
  if auth.uid() is null then
    raise exception 'User not authenticated';
  end if;

  select
    gs.created_by,
    gs.expected_player_count,
    coalesce(gs.score_revision, 1)
  into
    session_creator,
    expected_player_count,
    session_score_revision
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
    and ss.duke_slug is not null
    and coalesce(ss.confirmed_revision, 0) = session_score_revision;

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

  select
    coalesce(array_agg(ss.id order by ss.id), '{}'::uuid[]),
    count(*)::int
  into
    top_tied_score_ids,
    top_tied_count
  from public.session_scores ss
  where ss.session_id = p_session_id
    and ss.duke_slug is not null
    and coalesce(ss.confirmed_revision, 0) = session_score_revision
    and coalesce(ss.score_total, 0) = (
      select max(coalesce(inner_scores.score_total, 0))
      from public.session_scores inner_scores
      where inner_scores.session_id = p_session_id
        and inner_scores.duke_slug is not null
        and coalesce(inner_scores.confirmed_revision, 0) = session_score_revision
    );

  if top_tied_count < 2 then
    raise exception 'A tie-aware finish requires at least two current tied top scorers.';
  end if;

  submitted_count := coalesce(array_length(p_tiebreak_score_ids, 1), 0);

  if submitted_count <> top_tied_count then
    raise exception 'Submitted ids must match the current tied top scorers.';
  end if;

  select count(distinct submitted_id)
  into distinct_submitted_count
  from unnest(coalesce(p_tiebreak_score_ids, '{}'::uuid[])) as submitted_id;

  if distinct_submitted_count <> submitted_count then
    raise exception 'Submitted ids must be unique.';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_tiebreak_score_ids, '{}'::uuid[])) as submitted_id
    where not (submitted_id = any(top_tied_score_ids))
  ) then
    raise exception 'Submitted ids must match the current tied top scorers.';
  end if;

  if exists (
    select 1
    from unnest(top_tied_score_ids) as tied_id
    where not (tied_id = any(p_tiebreak_score_ids))
  ) then
    raise exception 'Submitted ids must match the current tied top scorers.';
  end if;

  with tied_ranked as (
    select
      ss.id,
      tied.ord::int as next_placement,
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
    from unnest(p_tiebreak_score_ids) with ordinality as tied(score_id, ord)
    join public.session_scores ss
      on ss.id = tied.score_id
    left join public.profiles p
      on p.id = ss.owner_user_id
     and ss.guest_profile_id is null
     and ss.guest_entry_id is null
     and ss.player_name is null
    left join public.guest_profiles gp
      on gp.id = ss.guest_profile_id
  ),
  remaining_ranked as (
    select
      ss.id,
      row_number() over (
        order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
      )::int + submitted_count as next_placement,
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
      and coalesce(ss.confirmed_revision, 0) = session_score_revision
      and not (ss.id = any(p_tiebreak_score_ids))
  ),
  ranked_scores as (
    select * from tied_ranked
    union all
    select * from remaining_ranked
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

create or replace function public.reopen_finished_game(p_session_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  session_creator uuid;
  next_score_revision integer;
  locked_row_count integer;
begin
  if auth.uid() is null then
    raise exception 'User not authenticated';
  end if;

  select gs.created_by
  into session_creator
  from public.game_sessions gs
  where gs.id = p_session_id;

  if session_creator is null then
    raise exception 'Session not found';
  end if;

  if session_creator <> auth.uid() then
    raise exception 'Only the session creator can reopen this game.';
  end if;

  select count(*)
  into locked_row_count
  from public.session_scores ss
  where ss.session_id = p_session_id
    and coalesce(ss.game_locked, false);

  if locked_row_count = 0 then
    raise exception 'Only finished games can be reopened.';
  end if;

  update public.game_sessions
  set
    score_revision = score_revision + 1,
    updated_at = now()
  where id = p_session_id
  returning score_revision into next_score_revision;

  update public.session_scores
  set
    game_locked = false,
    placement = null,
    is_winner = null,
    included_in_stats = false,
    updated_at = now()
  where session_id = p_session_id;
end;
$$;
