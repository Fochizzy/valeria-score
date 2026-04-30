create table if not exists public.global_input_stat_profiles (
  stat_key text not null,
  profile_scope text not null check (profile_scope in ('all_games', 'winning_games')),
  games_sample integer not null default 0,
  avg_input numeric(10, 2) not null default 0,
  avg_points_generated numeric(10, 2) not null default 0,
  points_share numeric(10, 2) not null default 0,
  global_points_share numeric(10, 2) not null default 0,
  share_delta_vs_global numeric(10, 2) not null default 0,
  primary key (stat_key, profile_scope)
);

create table if not exists public.global_game_margin_stats (
  margin_bucket text primary key check (margin_bucket in ('lte_3', 'lte_5')),
  tables_sample integer not null default 0,
  tables_with_margin integer not null default 0,
  share_percentage numeric(10, 2) not null default 0
);

create index if not exists global_input_stat_profiles_scope_idx
  on public.global_input_stat_profiles (profile_scope, points_share desc);

create or replace function private.refresh_global_input_analytics()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.global_input_stat_profiles (
    stat_key,
    profile_scope,
    games_sample,
    avg_input,
    avg_points_generated,
    points_share,
    global_points_share,
    share_delta_vs_global
  )
  with ranked_scores as (
    select
      ss.id,
      ss.session_id,
      ss.duke_slug,
      (
        rank() over (
          partition by ss.session_id
          order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
        ) = 1
      ) as is_winner,
      coalesce(ss.inputs, '{}'::jsonb) as inputs
    from public.session_scores ss
    where coalesce(ss.game_locked, false)
      and coalesce(ss.included_in_stats, false)
      and ss.duke_slug is not null
      and btrim(ss.duke_slug) <> ''
      and ss.duke_slug <> 'no-duke-selected'
      and (ss.owner_user_id is not null or ss.guest_profile_id is not null)
  ),
  extracted_inputs as (
    select
      rs.id as session_score_id,
      rs.is_winner,
      rules.stat_key,
      rules.multiplier,
      rules.scoring_mode,
      coalesce(
        case
          when stat_entry.value is not null
            and (stat_entry.value #>> '{}') ~ '^-?\d+(\.\d+)?$'
            then (stat_entry.value #>> '{}')::numeric
          else 0::numeric
        end,
        0::numeric
      ) as input_value
    from ranked_scores rs
    join private.duke_score_rules rules
      on rules.duke_slug = rs.duke_slug
    left join lateral (
      select entry.value
      from jsonb_each(rs.inputs) as entry(key, value)
      where entry.key = rules.stat_key
    ) as stat_entry
      on true
  ),
  scored_inputs as (
    select
      ei.session_score_id,
      ei.is_winner,
      ei.stat_key,
      greatest(ei.input_value, 0::numeric) as input_value,
      case
        when ei.scoring_mode = 'division'
          then floor(greatest(ei.input_value, 0::numeric) / nullif(ei.multiplier::numeric, 0))
        else greatest(ei.input_value, 0::numeric) * ei.multiplier::numeric
      end as points_generated
    from extracted_inputs ei
  ),
  profile_rows as (
    select
      si.session_score_id,
      si.stat_key,
      'all_games'::text as profile_scope,
      si.input_value,
      si.points_generated
    from scored_inputs si
    union all
    select
      si.session_score_id,
      si.stat_key,
      'winning_games'::text as profile_scope,
      si.input_value,
      si.points_generated
    from scored_inputs si
    where si.is_winner
  ),
  global_stat_aggregates as (
    select
      pr.stat_key,
      pr.profile_scope,
      count(*)::int as games_sample,
      round(avg(pr.input_value), 2) as avg_input,
      round(avg(pr.points_generated), 2) as avg_points_generated,
      coalesce(sum(pr.points_generated), 0::numeric) as total_points_generated
    from profile_rows pr
    group by pr.stat_key, pr.profile_scope
  ),
  global_scope_totals as (
    select
      pr.profile_scope,
      coalesce(sum(pr.points_generated), 0::numeric) as total_points_generated
    from profile_rows pr
    group by pr.profile_scope
  )
  select
    gsa.stat_key,
    gsa.profile_scope,
    gsa.games_sample,
    coalesce(gsa.avg_input, 0),
    coalesce(gsa.avg_points_generated, 0),
    round(
      (gsa.total_points_generated / nullif(gst.total_points_generated, 0)) * 100::numeric,
      2
    ) as points_share,
    round(
      (gsa.total_points_generated / nullif(gst.total_points_generated, 0)) * 100::numeric,
      2
    ) as global_points_share,
    0::numeric(10, 2) as share_delta_vs_global
  from global_stat_aggregates gsa
  left join global_scope_totals gst
    on gst.profile_scope = gsa.profile_scope;

  insert into public.global_game_margin_stats (
    margin_bucket,
    tables_sample,
    tables_with_margin,
    share_percentage
  )
  with ranked_scores as (
    select
      ss.session_id,
      coalesce(ss.score_total, 0)::numeric as total_score,
      rank() over (
        partition by ss.session_id
        order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
      )::int as placement
    from public.session_scores ss
    where coalesce(ss.game_locked, false)
      and coalesce(ss.included_in_stats, false)
      and ss.duke_slug is not null
      and btrim(ss.duke_slug) <> ''
      and ss.duke_slug <> 'no-duke-selected'
      and (ss.owner_user_id is not null or ss.guest_profile_id is not null)
  ),
  session_top_scores as (
    select
      rs.session_id,
      max(case when rs.placement = 1 then rs.total_score end) as top_score,
      max(case when rs.placement = 2 then rs.total_score end) as second_score,
      count(*)::int as player_count
    from ranked_scores rs
    group by rs.session_id
    having count(*) > 1
  ),
  session_margins as (
    select
      sts.session_id,
      greatest(coalesce(sts.top_score, 0) - coalesce(sts.second_score, 0), 0)::numeric as margin
    from session_top_scores sts
    where sts.second_score is not null
  ),
  thresholds as (
    select 'lte_3'::text as margin_bucket, 3::numeric as max_margin
    union all
    select 'lte_5'::text as margin_bucket, 5::numeric as max_margin
  )
  select
    thresholds.margin_bucket,
    count(session_margins.session_id)::int as tables_sample,
    count(session_margins.session_id) filter (
      where session_margins.margin <= thresholds.max_margin
    )::int as tables_with_margin,
    coalesce(
      round(
        (
          count(session_margins.session_id) filter (
            where session_margins.margin <= thresholds.max_margin
          )::numeric / nullif(count(session_margins.session_id), 0)::numeric
        ) * 100::numeric,
        2
      ),
      0
    ) as share_percentage
  from thresholds
  left join session_margins
    on true
  group by thresholds.margin_bucket, thresholds.max_margin
  order by thresholds.max_margin asc;
end;
$$;

create or replace function private.rebuild_public_analytics()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.rebuild_public_analytics_base();
  truncate table public.duke_input_stat_profiles, public.global_input_stat_profiles, public.global_game_margin_stats;
  perform private.refresh_duke_input_analytics();
  perform private.refresh_global_input_analytics();
end;
$$;

alter table public.global_input_stat_profiles enable row level security;
alter table public.global_game_margin_stats enable row level security;

drop policy if exists global_input_stat_profiles_select_authenticated
  on public.global_input_stat_profiles;

create policy global_input_stat_profiles_select_authenticated
on public.global_input_stat_profiles
for select
to authenticated
using (true);

drop policy if exists global_game_margin_stats_select_authenticated
  on public.global_game_margin_stats;

create policy global_game_margin_stats_select_authenticated
on public.global_game_margin_stats
for select
to authenticated
using (true);

revoke all on public.global_input_stat_profiles from anon;
revoke all on public.global_game_margin_stats from anon;

grant select on public.global_input_stat_profiles to authenticated, service_role;
grant select on public.global_game_margin_stats to authenticated, service_role;

select private.rebuild_public_analytics();
