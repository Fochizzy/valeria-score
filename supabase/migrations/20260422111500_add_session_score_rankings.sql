alter table public.session_scores
  add column if not exists placement integer,
  add column if not exists is_winner boolean;

with ranked_scores as (
  select
    ss.id,
    rank() over (
      partition by ss.session_id
      order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
    ) as next_placement
  from public.session_scores ss
  where coalesce(ss.game_locked, false)
)
update public.session_scores ss
set
  placement = ranked_scores.next_placement,
  is_winner = ranked_scores.next_placement = 1
from ranked_scores
where ss.id = ranked_scores.id;

update public.session_scores
set
  placement = null,
  is_winner = null
where not coalesce(game_locked, false);
