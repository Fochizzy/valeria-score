create or replace view public.session_score_results as
with valid_scores as (
  select
    ss.id,
    ss.session_id,
    case
      when ss.guest_profile_id is null then ss.owner_user_id
      else null
    end as user_id,
    ss.owner_user_id,
    ss.guest_profile_id,
    ss.player_name as guest_name,
    (ss.guest_profile_id is not null) as is_guest,
    ss.duke_slug,
    ss.score_total as total_score,
    coalesce(ss.included_in_stats, false) as included_in_stats,
    ss.updated_at
  from public.session_scores ss
  where coalesce(ss.game_locked, false)
    and ss.duke_slug is not null
    and btrim(ss.duke_slug) <> ''
    and ss.duke_slug <> 'no-duke-selected'
)
select
  id,
  session_id,
  user_id,
  owner_user_id,
  guest_profile_id,
  guest_name,
  is_guest,
  duke_slug,
  total_score,
  updated_at,
  rank() over (partition by session_id order by total_score desc, updated_at) as finish_rank,
  count(*) over (partition by session_id) as player_count,
  included_in_stats
from valid_scores;

create or replace view public.player_stats_base as
select
  ssr.session_id,
  ssr.user_id,
  ssr.owner_user_id,
  ssr.guest_profile_id,
  case
    when ssr.user_id is not null then 'user:' || ssr.user_id::text
    when ssr.guest_profile_id is not null then 'guest:' || ssr.guest_profile_id::text
    else null
  end as player_key,
  case
    when ssr.user_id is not null then 'user'
    else 'guest'
  end as player_type,
  case
    when ssr.user_id is not null then coalesce(
      nullif(btrim(p.display_name), ''),
      nullif(upper(btrim(p.public_player_id)), ''),
      'Player'
    )
    else coalesce(
      nullif(btrim(gp.display_name), ''),
      nullif(upper(btrim(gp.public_player_id)), ''),
      nullif(btrim(ssr.guest_name), ''),
      'Guest Player'
    )
  end as player_name,
  case
    when ssr.user_id is not null then nullif(upper(btrim(p.public_player_id)), '')
    else nullif(upper(btrim(gp.public_player_id)), '')
  end as public_player_id,
  ssr.duke_slug,
  ssr.total_score,
  ssr.finish_rank::int as placement,
  (ssr.finish_rank = 1) as is_winner,
  ssr.player_count::int as player_count,
  ssr.updated_at
from public.session_score_results ssr
left join public.profiles p
  on p.id = ssr.user_id
left join public.guest_profiles gp
  on gp.id = ssr.guest_profile_id
where ssr.included_in_stats = true
  and (
    ssr.user_id is not null
    or ssr.guest_profile_id is not null
  );

create or replace view public.player_global_stats as
select
  base.player_key,
  max(base.player_name) as player_name,
  max(base.public_player_id) as public_player_id,
  count(*)::int as games_played,
  count(*) filter (where base.is_winner)::int as wins,
  count(*) filter (where base.placement = 2)::int as second_places,
  count(*) filter (where base.placement = 3)::int as third_places,
  round(avg(base.total_score), 2) as avg_score,
  round(avg(base.placement::numeric), 2) as avg_finish,
  max(base.player_type) as player_type
from public.player_stats_base base
group by base.player_key;

create or replace view public.player_global_stats_30d as
select
  base.player_key,
  max(base.player_name) as player_name,
  max(base.public_player_id) as public_player_id,
  count(*)::int as games_played,
  count(*) filter (where base.is_winner)::int as wins,
  count(*) filter (where base.placement = 2)::int as second_places,
  count(*) filter (where base.placement = 3)::int as third_places,
  round(avg(base.total_score), 2) as avg_score,
  round(avg(base.placement::numeric), 2) as avg_finish,
  max(base.player_type) as player_type
from public.player_stats_base base
where base.updated_at >= now() - interval '30 days'
group by base.player_key;

create or replace view public.player_duke_stats as
select
  base.player_key,
  max(base.player_name) as player_name,
  max(base.public_player_id) as public_player_id,
  base.duke_slug,
  count(*)::int as games_played,
  count(*) filter (where base.is_winner)::int as wins,
  round(avg(base.total_score), 2) as avg_score,
  round(avg(base.placement::numeric), 2) as avg_finish,
  max(base.player_type) as player_type
from public.player_stats_base base
group by
  base.player_key,
  base.duke_slug;

create or replace view public.player_duke_stats_30d as
select
  base.player_key,
  max(base.player_name) as player_name,
  max(base.public_player_id) as public_player_id,
  base.duke_slug,
  count(*)::int as games_played,
  count(*) filter (where base.is_winner)::int as wins,
  round(avg(base.total_score), 2) as avg_score,
  round(avg(base.placement::numeric), 2) as avg_finish,
  max(base.player_type) as player_type
from public.player_stats_base base
where base.updated_at >= now() - interval '30 days'
group by
  base.player_key,
  base.duke_slug;

create or replace view public.duke_global_stats as
with base as (
  select
    psb.duke_slug,
    psb.user_id,
    psb.guest_profile_id,
    psb.player_name,
    psb.total_score,
    psb.placement as finish_rank,
    psb.player_count
  from public.player_stats_base psb
),
duke_rollup as (
  select
    base.duke_slug,
    count(*) as games_played,
    round(avg(base.total_score), 2) as avg_score,
    round(avg(base.total_score::numeric / nullif(base.player_count, 0)::numeric), 2) as avg_score_per_player,
    round(avg(case when base.finish_rank = 1 then 1.0 else 0.0 end) * 100::numeric, 2) as win_percentage,
    round(avg(case when base.finish_rank = 2 then 1.0 else 0.0 end) * 100::numeric, 2) as second_percentage,
    round(avg(case when base.finish_rank = 3 then 1.0 else 0.0 end) * 100::numeric, 2) as third_percentage,
    max(base.total_score) as best_score
  from base
  group by base.duke_slug
),
wins_by_player as (
  select
    base.duke_slug,
    case
      when base.user_id is not null then 'user'
      else 'guest'
    end as player_type,
    coalesce(base.user_id::text, base.guest_profile_id::text) as player_key,
    max(base.player_name) as player_name,
    count(*) filter (where base.finish_rank = 1) as wins_with_duke
  from base
  group by
    base.duke_slug,
    case
      when base.user_id is not null then 'user'
      else 'guest'
    end,
    coalesce(base.user_id::text, base.guest_profile_id::text)
),
avg_by_player as (
  select
    base.duke_slug,
    case
      when base.user_id is not null then 'user'
      else 'guest'
    end as player_type,
    coalesce(base.user_id::text, base.guest_profile_id::text) as player_key,
    max(base.player_name) as player_name,
    round(avg(base.total_score), 2) as avg_with_duke
  from base
  group by
    base.duke_slug,
    case
      when base.user_id is not null then 'user'
      else 'guest'
    end,
    coalesce(base.user_id::text, base.guest_profile_id::text)
),
top_winner as (
  select distinct on (wins_by_player.duke_slug)
    wins_by_player.duke_slug,
    wins_by_player.player_type as most_wins_player_type,
    wins_by_player.player_key as most_wins_player_key,
    wins_by_player.player_name as most_wins_player_name,
    wins_by_player.wins_with_duke
  from wins_by_player
  order by
    wins_by_player.duke_slug,
    wins_by_player.wins_with_duke desc,
    wins_by_player.player_name,
    wins_by_player.player_key
),
top_avg as (
  select distinct on (avg_by_player.duke_slug)
    avg_by_player.duke_slug,
    avg_by_player.player_type as best_avg_player_type,
    avg_by_player.player_key as best_avg_player_key,
    avg_by_player.player_name as best_avg_player_name,
    avg_by_player.avg_with_duke
  from avg_by_player
  order by
    avg_by_player.duke_slug,
    avg_by_player.avg_with_duke desc,
    avg_by_player.player_name,
    avg_by_player.player_key
)
select
  dr.duke_slug,
  dr.games_played,
  dr.avg_score,
  dr.avg_score_per_player,
  dr.win_percentage,
  dr.second_percentage,
  dr.third_percentage,
  dr.best_score,
  tw.most_wins_player_type,
  tw.most_wins_player_key,
  tw.wins_with_duke,
  ta.best_avg_player_type,
  ta.best_avg_player_key,
  ta.avg_with_duke,
  tw.most_wins_player_name,
  ta.best_avg_player_name
from duke_rollup dr
left join top_winner tw
  on tw.duke_slug = dr.duke_slug
left join top_avg ta
  on ta.duke_slug = dr.duke_slug;

drop function if exists public.get_profile_dashboard();

create function public.get_profile_dashboard()
returns jsonb
language sql
stable
set search_path = public
as $$
  with viewer_ctx as (
    select auth.uid() as user_id
  ),
  profile_row as (
    select
      coalesce(nullif(btrim(p.display_name), ''), 'Player') as display_name
    from viewer_ctx vc
    left join public.profiles p
      on p.id = vc.user_id
  ),
  history_rows as (
    select
      psb.session_id,
      psb.duke_slug,
      psb.total_score,
      psb.placement as rank,
      psb.player_count,
      psb.updated_at
    from public.player_stats_base psb
    join viewer_ctx vc
      on vc.user_id is not null
     and psb.user_id = vc.user_id
  ),
  guest_ids as (
    select distinct
      psb.guest_profile_id
    from public.player_stats_base psb
    join viewer_ctx vc
      on vc.user_id is not null
     and psb.owner_user_id = vc.user_id
    where psb.guest_profile_id is not null
  ),
  guest_cards as (
    select
      gp.id,
      coalesce(nullif(btrim(gp.display_name), ''), 'Guest Player') as display_name,
      gp.contact_email,
      nullif(upper(btrim(gp.public_player_id)), '') as public_player_id
    from public.guest_profiles gp
    join guest_ids gi
      on gi.guest_profile_id = gp.id
  ),
  guest_rows as (
    select
      psb.guest_profile_id,
      psb.duke_slug,
      psb.placement
    from public.player_stats_base psb
    join guest_ids gi
      on gi.guest_profile_id = psb.guest_profile_id
  ),
  guest_stats as (
    select
      gr.guest_profile_id,
      count(*)::int as total_games,
      count(*) filter (where gr.placement = 1)::int as wins,
      count(*) filter (where gr.placement <> 1)::int as losses,
      coalesce((
        select initcap(replace(inner_rows.duke_slug, '_', ' '))
        from guest_rows inner_rows
        where inner_rows.guest_profile_id = gr.guest_profile_id
        group by inner_rows.duke_slug
        order by count(*) desc, inner_rows.duke_slug
        limit 1
      ), '-') as top_duke
    from guest_rows gr
    group by gr.guest_profile_id
  )
  select jsonb_build_object(
    'displayName',
    coalesce((select pr.display_name from profile_row pr), 'Player'),
    'summary',
    jsonb_build_object(
      'games', coalesce((select count(*) from history_rows), 0),
      'wins', coalesce((select count(*) from history_rows where rank = 1), 0),
      'avgScore', coalesce((select round(avg(total_score), 2) from history_rows), 0)
    ),
    'history',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'sessionId', hr.session_id,
          'dukeSlug', hr.duke_slug,
          'totalScore', hr.total_score,
          'rank', hr.rank,
          'playerCount', hr.player_count,
          'updatedAt', hr.updated_at
        )
        order by hr.updated_at desc
      )
      from history_rows hr
    ), '[]'::jsonb),
    'sharedGuestProfiles',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', gc.id,
          'display_name', gc.display_name,
          'contact_email', gc.contact_email,
          'public_player_id', gc.public_player_id,
          'wins', coalesce(gs.wins, 0),
          'losses', coalesce(gs.losses, 0),
          'topDuke', coalesce(gs.top_duke, '-'),
          'totalGames', coalesce(gs.total_games, 0)
        )
        order by gc.display_name, gc.id
      )
      from guest_cards gc
      left join guest_stats gs
        on gs.guest_profile_id = gc.id
    ), '[]'::jsonb)
  );
$$;

grant select on public.session_score_results to anon, authenticated, service_role;
grant select on public.player_stats_base to anon, authenticated, service_role;
grant select on public.player_global_stats to anon, authenticated, service_role;
grant select on public.player_global_stats_30d to anon, authenticated, service_role;
grant select on public.player_duke_stats to anon, authenticated, service_role;
grant select on public.player_duke_stats_30d to anon, authenticated, service_role;
grant select on public.duke_global_stats to anon, authenticated, service_role;
grant execute on function public.get_profile_dashboard() to anon, authenticated, service_role;
