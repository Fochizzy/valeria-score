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

  required_score_count := greatest(
    coalesce(expected_player_count, 1),
    coalesce(session_player_count, 0) + coalesce(guest_entry_count, 0),
    1
  );

  if ready_score_count < required_score_count then
    raise exception 'Every player must save a score before finishing the game.';
  end if;

  with ranked_scores as (
    select
      ss.id,
      rank() over (
        order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
      ) as next_placement
    from public.session_scores ss
    where ss.session_id = p_session_id
      and ss.duke_slug is not null
  )
  update public.session_scores ss
  set
    placement = ranked_scores.next_placement,
    is_winner = ranked_scores.next_placement = 1,
    game_locked = true,
    included_in_stats = true,
    updated_at = now()
  from ranked_scores
  where ss.id = ranked_scores.id;
end;
$$;
