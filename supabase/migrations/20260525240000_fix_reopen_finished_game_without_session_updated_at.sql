create or replace function public.reopen_finished_game(p_session_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  session_creator uuid;
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
  set score_revision = score_revision + 1
  where id = p_session_id;

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
