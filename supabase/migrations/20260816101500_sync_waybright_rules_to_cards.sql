-- data/cards.ts changed Waybright the Wise (commit ab8ae8d) from
-- citizenCount x1 + holy x2 to domainCount x2 + hammer x1, but
-- private.duke_score_rules was never resynced, so the input analytics
-- refresh functions have been profiling Waybright against stale rules.
-- Scoped rerun of the 20260430044633 sync pattern for this duke only.
begin;

create temp table tmp_expected_rules (
  duke_slug text not null,
  stat_key text not null,
  multiplier integer not null,
  scoring_mode text not null
) on commit drop;

insert into tmp_expected_rules (duke_slug, stat_key, multiplier, scoring_mode)
values
  ('waybright_the_wise', 'domainCount', 2, 'multiply'),
  ('waybright_the_wise', 'domainPoints', 1, 'multiply'),
  ('waybright_the_wise', 'fight', 4, 'division'),
  ('waybright_the_wise', 'gold', 4, 'division'),
  ('waybright_the_wise', 'hammer', 1, 'multiply'),
  ('waybright_the_wise', 'magic', 4, 'division'),
  ('waybright_the_wise', 'monsterPoints', 1, 'multiply'),
  ('waybright_the_wise', 'vp', 1, 'multiply');

update private.duke_score_rules live
set
  multiplier = expected.multiplier,
  scoring_mode = expected.scoring_mode
from tmp_expected_rules expected
where live.duke_slug = expected.duke_slug
  and live.stat_key = expected.stat_key
  and (live.multiplier is distinct from expected.multiplier
    or live.scoring_mode is distinct from expected.scoring_mode);

insert into private.duke_score_rules (duke_slug, stat_key, multiplier, scoring_mode)
select expected.duke_slug, expected.stat_key, expected.multiplier, expected.scoring_mode
from tmp_expected_rules expected
left join private.duke_score_rules live
  on live.duke_slug = expected.duke_slug
  and live.stat_key = expected.stat_key
where live.duke_slug is null;

delete from private.duke_score_rules live
where live.duke_slug = 'waybright_the_wise'
  and not exists (
    select 1
    from tmp_expected_rules expected
    where expected.duke_slug = live.duke_slug
      and expected.stat_key = live.stat_key
  );

alter table public.session_scores disable trigger refresh_public_analytics_on_session_scores_update;

-- Recompute stored totals for Waybright rows from their saved inputs against
-- the corrected rules, mirroring the original sync migration's math.
create temp table tmp_changed_scores on commit drop as
with recalculated as (
  select
    ss.id,
    ss.session_id,
    coalesce(ss.game_locked, false) as game_locked,
    case
      when coalesce(resource_rule.resource_divisor, 0) > 0
      then floor(resource_inputs.resource_input_total / resource_rule.resource_divisor)
      else 0
    end
    + coalesce(non_resource.non_resource_total, 0) as recalculated_total
  from public.session_scores ss
  left join lateral (
    select max(r.multiplier)::numeric as resource_divisor
    from tmp_expected_rules r
    where r.duke_slug = ss.duke_slug
      and r.scoring_mode = 'division'
      and r.stat_key in ('gold', 'magic', 'fight')
  ) resource_rule on true
  left join lateral (
    select coalesce(sum(greatest(coalesce((ss.inputs ->> k)::numeric, 0), 0)), 0)::numeric as resource_input_total
    from unnest(array['gold', 'magic', 'fight']) as k
  ) resource_inputs on true
  left join lateral (
    select coalesce(sum(greatest(coalesce((ss.inputs ->> r.stat_key)::numeric, 0), 0) * r.multiplier), 0)::numeric as non_resource_total
    from tmp_expected_rules r
    where r.duke_slug = ss.duke_slug
      and r.scoring_mode = 'multiply'
  ) non_resource on true
  where ss.duke_slug = 'waybright_the_wise'
)
select
  ss.id,
  ss.session_id,
  recalculated.game_locked,
  recalculated.recalculated_total::integer as recalculated_total
from public.session_scores ss
join recalculated
  on recalculated.id = ss.id
where coalesce(ss.score_total, 0) <> recalculated.recalculated_total;

update public.session_scores ss
set score_total = changed.recalculated_total
from tmp_changed_scores changed
where ss.id = changed.id;

create temp table tmp_affected_locked_sessions on commit drop as
select distinct session_id
from tmp_changed_scores
where game_locked;

with ranked as (
  select
    ss.id,
    rank() over (
      partition by ss.session_id
      order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
    ) as next_placement
  from public.session_scores ss
  join tmp_affected_locked_sessions affected
    on affected.session_id = ss.session_id
  where ss.duke_slug is not null
    and btrim(ss.duke_slug) <> ''
    and ss.duke_slug <> 'no-duke-selected'
)
update public.session_scores ss
set
  placement = ranked.next_placement,
  is_winner = ranked.next_placement = 1
from ranked
where ss.id = ranked.id;

alter table public.session_scores enable trigger refresh_public_analytics_on_session_scores_update;

select private.rebuild_public_analytics();

commit;
