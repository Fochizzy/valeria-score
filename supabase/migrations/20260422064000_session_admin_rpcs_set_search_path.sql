create or replace function public.delete_in_progress_session(p_session_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  session_creator uuid;
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
    raise exception 'Only the session creator can delete this in-progress session';
  end if;

  if exists (
    select 1
    from public.session_scores ss
    where ss.session_id = p_session_id
      and coalesce(ss.game_locked, false)
  ) then
    raise exception 'This session already has locked scores. Use the game delete flow from Compare instead.';
  end if;

  delete from public.session_scores
  where session_id = p_session_id;

  delete from public.session_players
  where session_id = p_session_id;

  delete from public.game_sessions
  where id = p_session_id;
end;
$$;

create or replace function public.finish_game(p_session_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  session_creator uuid;
  score_count integer;
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
    raise exception 'Only the session creator can finish this game.';
  end if;

  select count(*)
  into score_count
  from public.session_scores ss
  where ss.session_id = p_session_id;

  if score_count = 0 then
    raise exception 'No scores found for this session';
  end if;

  with ranked_scores as (
    select
      ss.id,
      rank() over (
        order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
      ) as next_placement
    from public.session_scores ss
    where ss.session_id = p_session_id
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
