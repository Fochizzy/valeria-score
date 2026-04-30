alter table public.game_sessions
  add column if not exists expected_player_count integer not null default 1;

with player_counts as (
  select
    sp.session_id,
    count(*)::int as player_count
  from public.session_players sp
  group by sp.session_id
),
score_counts as (
  select
    ss.session_id,
    count(*)::int as score_count
  from public.session_scores ss
  group by ss.session_id
)
update public.game_sessions gs
set expected_player_count = greatest(
  coalesce(sp.player_count, 0),
  coalesce(ss.score_count, 0),
  1
)
from player_counts sp
full outer join score_counts ss
  on ss.session_id = sp.session_id
where gs.id = coalesce(sp.session_id, ss.session_id);

create or replace function public.finish_game(p_session_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  session_creator uuid;
  expected_player_count integer;
  ready_score_count integer;
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

  select count(*)
  into ready_score_count
  from public.session_scores ss
  where ss.session_id = p_session_id
    and (coalesce(ss.game_locked, false) or ss.duke_slug is not null);

  if ready_score_count = 0 then
    raise exception 'No scores found for this session';
  end if;

  expected_player_count := greatest(
    coalesce(expected_player_count, 1),
    1
  );

  if ready_score_count < expected_player_count then
    raise exception 'Every player must save a score before finishing the game.';
  end if;

  if exists (
    select 1
    from public.session_scores ss
    where ss.session_id = p_session_id
      and not (coalesce(ss.game_locked, false) or ss.duke_slug is not null)
  ) then
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
