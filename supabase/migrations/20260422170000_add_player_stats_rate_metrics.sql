alter table public.player_global_stats
  add column if not exists podiums integer not null default 0,
  add column if not exists win_rate numeric(10, 2) not null default 0,
  add column if not exists podium_rate numeric(10, 2) not null default 0,
  add column if not exists avg_finish_percentile numeric(10, 2) not null default 0;

alter table public.player_global_stats_30d
  add column if not exists podiums integer not null default 0,
  add column if not exists win_rate numeric(10, 2) not null default 0,
  add column if not exists podium_rate numeric(10, 2) not null default 0,
  add column if not exists avg_finish_percentile numeric(10, 2) not null default 0;

alter table public.player_duke_stats
  add column if not exists podiums integer not null default 0,
  add column if not exists win_rate numeric(10, 2) not null default 0,
  add column if not exists podium_rate numeric(10, 2) not null default 0,
  add column if not exists avg_finish_percentile numeric(10, 2) not null default 0;

alter table public.player_duke_stats_30d
  add column if not exists podiums integer not null default 0,
  add column if not exists win_rate numeric(10, 2) not null default 0,
  add column if not exists podium_rate numeric(10, 2) not null default 0,
  add column if not exists avg_finish_percentile numeric(10, 2) not null default 0;

create or replace function private.rebuild_public_analytics()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  truncate table
    public.player_duke_stats_30d,
    public.player_duke_stats,
    public.player_global_stats_30d,
    public.player_global_stats,
    public.duke_global_stats;

  insert into public.player_global_stats (
    player_key,
    player_name,
    public_player_id,
    games_played,
    wins,
    podiums,
    second_places,
    third_places,
    avg_score,
    avg_finish,
    avg_finish_percentile,
    win_rate,
    podium_rate,
    player_type
  )
  with ranked_scores as (
    select
      ss.id,
      ss.session_id,
      ss.owner_user_id,
      ss.guest_profile_id,
      ss.player_name as guest_name,
      ss.duke_slug,
      ss.score_total as total_score,
      rank() over (
        partition by ss.session_id
        order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
      )::int as placement,
      (
        rank() over (
        partition by ss.session_id
        order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
        ) = 1
      ) as is_winner,
      count(*) over (partition by ss.session_id)::int as player_count,
      ss.updated_at
    from public.session_scores ss
    where coalesce(ss.game_locked, false)
      and coalesce(ss.included_in_stats, false)
      and ss.duke_slug is not null
      and btrim(ss.duke_slug) <> ''
      and ss.duke_slug <> 'no-duke-selected'
      and (ss.owner_user_id is not null or ss.guest_profile_id is not null)
  ),
  analytics_rows as (
    select
      case
        when rs.guest_profile_id is null then 'user:' || rs.owner_user_id::text
        else 'guest:' || rs.guest_profile_id::text
      end as player_key,
      case
        when rs.guest_profile_id is null then rs.owner_user_id::text
        else rs.guest_profile_id::text
      end as player_ref_key,
      case
        when rs.guest_profile_id is null then 'user'
        else 'guest'
      end as player_type,
      case
        when rs.guest_profile_id is null then coalesce(
          nullif(btrim(p.display_name), ''),
          nullif(upper(btrim(p.public_player_id)), ''),
          'Player'
        )
        else coalesce(
          nullif(btrim(gp.display_name), ''),
          nullif(upper(btrim(gp.public_player_id)), ''),
          nullif(btrim(rs.guest_name), ''),
          'Guest Player'
        )
      end as player_name,
      case
        when rs.guest_profile_id is null then nullif(upper(btrim(p.public_player_id)), '')
        else nullif(upper(btrim(gp.public_player_id)), '')
      end as public_player_id,
      rs.duke_slug,
      rs.total_score,
      rs.placement,
      rs.is_winner,
      rs.player_count,
      case
        when rs.player_count <= 1 then 100::numeric
        else round(
          (1 - ((rs.placement - 1)::numeric / nullif((rs.player_count - 1)::numeric, 0))) * 100::numeric,
          2
        )
      end as finish_percentile,
      rs.updated_at
    from ranked_scores rs
    left join public.profiles p
      on p.id = rs.owner_user_id
     and rs.guest_profile_id is null
    left join public.guest_profiles gp
      on gp.id = rs.guest_profile_id
  )
  select
    ar.player_key,
    max(ar.player_name) as player_name,
    max(ar.public_player_id) as public_player_id,
    count(*)::int as games_played,
    count(*) filter (where ar.is_winner)::int as wins,
    count(*) filter (where ar.placement <= 3)::int as podiums,
    count(*) filter (where ar.placement = 2)::int as second_places,
    count(*) filter (where ar.placement = 3)::int as third_places,
    round(avg(ar.total_score), 2) as avg_score,
    round(avg(ar.placement::numeric), 2) as avg_finish,
    round(avg(ar.finish_percentile), 2) as avg_finish_percentile,
    round((count(*) filter (where ar.is_winner)::numeric / nullif(count(*), 0)::numeric) * 100::numeric, 2) as win_rate,
    round((count(*) filter (where ar.placement <= 3)::numeric / nullif(count(*), 0)::numeric) * 100::numeric, 2) as podium_rate,
    max(ar.player_type) as player_type
  from analytics_rows ar
  group by ar.player_key;

  insert into public.player_global_stats_30d (
    player_key,
    player_name,
    public_player_id,
    games_played,
    wins,
    podiums,
    second_places,
    third_places,
    avg_score,
    avg_finish,
    avg_finish_percentile,
    win_rate,
    podium_rate,
    player_type
  )
  with ranked_scores as (
    select
      ss.id,
      ss.session_id,
      ss.owner_user_id,
      ss.guest_profile_id,
      ss.player_name as guest_name,
      ss.duke_slug,
      ss.score_total as total_score,
      rank() over (
        partition by ss.session_id
        order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
      )::int as placement,
      (
        rank() over (
        partition by ss.session_id
        order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
        ) = 1
      ) as is_winner,
      count(*) over (partition by ss.session_id)::int as player_count,
      ss.updated_at
    from public.session_scores ss
    where coalesce(ss.game_locked, false)
      and coalesce(ss.included_in_stats, false)
      and ss.duke_slug is not null
      and btrim(ss.duke_slug) <> ''
      and ss.duke_slug <> 'no-duke-selected'
      and (ss.owner_user_id is not null or ss.guest_profile_id is not null)
  ),
  analytics_rows as (
    select
      case
        when rs.guest_profile_id is null then 'user:' || rs.owner_user_id::text
        else 'guest:' || rs.guest_profile_id::text
      end as player_key,
      case
        when rs.guest_profile_id is null then rs.owner_user_id::text
        else rs.guest_profile_id::text
      end as player_ref_key,
      case
        when rs.guest_profile_id is null then 'user'
        else 'guest'
      end as player_type,
      case
        when rs.guest_profile_id is null then coalesce(
          nullif(btrim(p.display_name), ''),
          nullif(upper(btrim(p.public_player_id)), ''),
          'Player'
        )
        else coalesce(
          nullif(btrim(gp.display_name), ''),
          nullif(upper(btrim(gp.public_player_id)), ''),
          nullif(btrim(rs.guest_name), ''),
          'Guest Player'
        )
      end as player_name,
      case
        when rs.guest_profile_id is null then nullif(upper(btrim(p.public_player_id)), '')
        else nullif(upper(btrim(gp.public_player_id)), '')
      end as public_player_id,
      rs.duke_slug,
      rs.total_score,
      rs.placement,
      rs.is_winner,
      rs.player_count,
      case
        when rs.player_count <= 1 then 100::numeric
        else round(
          (1 - ((rs.placement - 1)::numeric / nullif((rs.player_count - 1)::numeric, 0))) * 100::numeric,
          2
        )
      end as finish_percentile,
      rs.updated_at
    from ranked_scores rs
    left join public.profiles p
      on p.id = rs.owner_user_id
     and rs.guest_profile_id is null
    left join public.guest_profiles gp
      on gp.id = rs.guest_profile_id
  )
  select
    ar.player_key,
    max(ar.player_name) as player_name,
    max(ar.public_player_id) as public_player_id,
    count(*)::int as games_played,
    count(*) filter (where ar.is_winner)::int as wins,
    count(*) filter (where ar.placement <= 3)::int as podiums,
    count(*) filter (where ar.placement = 2)::int as second_places,
    count(*) filter (where ar.placement = 3)::int as third_places,
    round(avg(ar.total_score), 2) as avg_score,
    round(avg(ar.placement::numeric), 2) as avg_finish,
    round(avg(ar.finish_percentile), 2) as avg_finish_percentile,
    round((count(*) filter (where ar.is_winner)::numeric / nullif(count(*), 0)::numeric) * 100::numeric, 2) as win_rate,
    round((count(*) filter (where ar.placement <= 3)::numeric / nullif(count(*), 0)::numeric) * 100::numeric, 2) as podium_rate,
    max(ar.player_type) as player_type
  from analytics_rows ar
  where ar.updated_at >= now() - interval '30 days'
  group by ar.player_key;

  insert into public.player_duke_stats (
    player_key,
    player_name,
    public_player_id,
    duke_slug,
    games_played,
    wins,
    podiums,
    avg_score,
    avg_finish,
    avg_finish_percentile,
    win_rate,
    podium_rate,
    player_type
  )
  with ranked_scores as (
    select
      ss.id,
      ss.session_id,
      ss.owner_user_id,
      ss.guest_profile_id,
      ss.player_name as guest_name,
      ss.duke_slug,
      ss.score_total as total_score,
      rank() over (
        partition by ss.session_id
        order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
      )::int as placement,
      (
        rank() over (
        partition by ss.session_id
        order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
        ) = 1
      ) as is_winner,
      count(*) over (partition by ss.session_id)::int as player_count,
      ss.updated_at
    from public.session_scores ss
    where coalesce(ss.game_locked, false)
      and coalesce(ss.included_in_stats, false)
      and ss.duke_slug is not null
      and btrim(ss.duke_slug) <> ''
      and ss.duke_slug <> 'no-duke-selected'
      and (ss.owner_user_id is not null or ss.guest_profile_id is not null)
  ),
  analytics_rows as (
    select
      case
        when rs.guest_profile_id is null then 'user:' || rs.owner_user_id::text
        else 'guest:' || rs.guest_profile_id::text
      end as player_key,
      case
        when rs.guest_profile_id is null then rs.owner_user_id::text
        else rs.guest_profile_id::text
      end as player_ref_key,
      case
        when rs.guest_profile_id is null then 'user'
        else 'guest'
      end as player_type,
      case
        when rs.guest_profile_id is null then coalesce(
          nullif(btrim(p.display_name), ''),
          nullif(upper(btrim(p.public_player_id)), ''),
          'Player'
        )
        else coalesce(
          nullif(btrim(gp.display_name), ''),
          nullif(upper(btrim(gp.public_player_id)), ''),
          nullif(btrim(rs.guest_name), ''),
          'Guest Player'
        )
      end as player_name,
      case
        when rs.guest_profile_id is null then nullif(upper(btrim(p.public_player_id)), '')
        else nullif(upper(btrim(gp.public_player_id)), '')
      end as public_player_id,
      rs.duke_slug,
      rs.total_score,
      rs.placement,
      rs.is_winner,
      rs.player_count,
      case
        when rs.player_count <= 1 then 100::numeric
        else round(
          (1 - ((rs.placement - 1)::numeric / nullif((rs.player_count - 1)::numeric, 0))) * 100::numeric,
          2
        )
      end as finish_percentile,
      rs.updated_at
    from ranked_scores rs
    left join public.profiles p
      on p.id = rs.owner_user_id
     and rs.guest_profile_id is null
    left join public.guest_profiles gp
      on gp.id = rs.guest_profile_id
  )
  select
    ar.player_key,
    max(ar.player_name) as player_name,
    max(ar.public_player_id) as public_player_id,
    ar.duke_slug,
    count(*)::int as games_played,
    count(*) filter (where ar.is_winner)::int as wins,
    count(*) filter (where ar.placement <= 3)::int as podiums,
    round(avg(ar.total_score), 2) as avg_score,
    round(avg(ar.placement::numeric), 2) as avg_finish,
    round(avg(ar.finish_percentile), 2) as avg_finish_percentile,
    round((count(*) filter (where ar.is_winner)::numeric / nullif(count(*), 0)::numeric) * 100::numeric, 2) as win_rate,
    round((count(*) filter (where ar.placement <= 3)::numeric / nullif(count(*), 0)::numeric) * 100::numeric, 2) as podium_rate,
    max(ar.player_type) as player_type
  from analytics_rows ar
  group by ar.player_key, ar.duke_slug;

  insert into public.player_duke_stats_30d (
    player_key,
    player_name,
    public_player_id,
    duke_slug,
    games_played,
    wins,
    podiums,
    avg_score,
    avg_finish,
    avg_finish_percentile,
    win_rate,
    podium_rate,
    player_type
  )
  with ranked_scores as (
    select
      ss.id,
      ss.session_id,
      ss.owner_user_id,
      ss.guest_profile_id,
      ss.player_name as guest_name,
      ss.duke_slug,
      ss.score_total as total_score,
      rank() over (
        partition by ss.session_id
        order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
      )::int as placement,
      (
        rank() over (
        partition by ss.session_id
        order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
        ) = 1
      ) as is_winner,
      count(*) over (partition by ss.session_id)::int as player_count,
      ss.updated_at
    from public.session_scores ss
    where coalesce(ss.game_locked, false)
      and coalesce(ss.included_in_stats, false)
      and ss.duke_slug is not null
      and btrim(ss.duke_slug) <> ''
      and ss.duke_slug <> 'no-duke-selected'
      and (ss.owner_user_id is not null or ss.guest_profile_id is not null)
  ),
  analytics_rows as (
    select
      case
        when rs.guest_profile_id is null then 'user:' || rs.owner_user_id::text
        else 'guest:' || rs.guest_profile_id::text
      end as player_key,
      case
        when rs.guest_profile_id is null then rs.owner_user_id::text
        else rs.guest_profile_id::text
      end as player_ref_key,
      case
        when rs.guest_profile_id is null then 'user'
        else 'guest'
      end as player_type,
      case
        when rs.guest_profile_id is null then coalesce(
          nullif(btrim(p.display_name), ''),
          nullif(upper(btrim(p.public_player_id)), ''),
          'Player'
        )
        else coalesce(
          nullif(btrim(gp.display_name), ''),
          nullif(upper(btrim(gp.public_player_id)), ''),
          nullif(btrim(rs.guest_name), ''),
          'Guest Player'
        )
      end as player_name,
      case
        when rs.guest_profile_id is null then nullif(upper(btrim(p.public_player_id)), '')
        else nullif(upper(btrim(gp.public_player_id)), '')
      end as public_player_id,
      rs.duke_slug,
      rs.total_score,
      rs.placement,
      rs.is_winner,
      rs.player_count,
      case
        when rs.player_count <= 1 then 100::numeric
        else round(
          (1 - ((rs.placement - 1)::numeric / nullif((rs.player_count - 1)::numeric, 0))) * 100::numeric,
          2
        )
      end as finish_percentile,
      rs.updated_at
    from ranked_scores rs
    left join public.profiles p
      on p.id = rs.owner_user_id
     and rs.guest_profile_id is null
    left join public.guest_profiles gp
      on gp.id = rs.guest_profile_id
  )
  select
    ar.player_key,
    max(ar.player_name) as player_name,
    max(ar.public_player_id) as public_player_id,
    ar.duke_slug,
    count(*)::int as games_played,
    count(*) filter (where ar.is_winner)::int as wins,
    count(*) filter (where ar.placement <= 3)::int as podiums,
    round(avg(ar.total_score), 2) as avg_score,
    round(avg(ar.placement::numeric), 2) as avg_finish,
    round(avg(ar.finish_percentile), 2) as avg_finish_percentile,
    round((count(*) filter (where ar.is_winner)::numeric / nullif(count(*), 0)::numeric) * 100::numeric, 2) as win_rate,
    round((count(*) filter (where ar.placement <= 3)::numeric / nullif(count(*), 0)::numeric) * 100::numeric, 2) as podium_rate,
    max(ar.player_type) as player_type
  from analytics_rows ar
  where ar.updated_at >= now() - interval '30 days'
  group by ar.player_key, ar.duke_slug;

  insert into public.duke_global_stats (
    duke_slug,
    games_played,
    avg_score,
    avg_score_per_player,
    win_percentage,
    second_percentage,
    third_percentage,
    best_score,
    most_wins_player_type,
    most_wins_player_key,
    wins_with_duke,
    best_avg_player_type,
    best_avg_player_key,
    avg_with_duke,
    most_wins_player_name,
    best_avg_player_name
  )
  with ranked_scores as (
    select
      ss.id,
      ss.session_id,
      ss.owner_user_id,
      ss.guest_profile_id,
      ss.player_name as guest_name,
      ss.duke_slug,
      ss.score_total as total_score,
      rank() over (
        partition by ss.session_id
        order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
      )::int as placement,
      (
        rank() over (
        partition by ss.session_id
        order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
        ) = 1
      ) as is_winner,
      count(*) over (partition by ss.session_id)::int as player_count,
      ss.updated_at
    from public.session_scores ss
    where coalesce(ss.game_locked, false)
      and coalesce(ss.included_in_stats, false)
      and ss.duke_slug is not null
      and btrim(ss.duke_slug) <> ''
      and ss.duke_slug <> 'no-duke-selected'
      and (ss.owner_user_id is not null or ss.guest_profile_id is not null)
  ),
  analytics_rows as (
    select
      case
        when rs.guest_profile_id is null then 'user:' || rs.owner_user_id::text
        else 'guest:' || rs.guest_profile_id::text
      end as player_key,
      case
        when rs.guest_profile_id is null then rs.owner_user_id::text
        else rs.guest_profile_id::text
      end as player_ref_key,
      case
        when rs.guest_profile_id is null then 'user'
        else 'guest'
      end as player_type,
      case
        when rs.guest_profile_id is null then coalesce(
          nullif(btrim(p.display_name), ''),
          nullif(upper(btrim(p.public_player_id)), ''),
          'Player'
        )
        else coalesce(
          nullif(btrim(gp.display_name), ''),
          nullif(upper(btrim(gp.public_player_id)), ''),
          nullif(btrim(rs.guest_name), ''),
          'Guest Player'
        )
      end as player_name,
      case
        when rs.guest_profile_id is null then nullif(upper(btrim(p.public_player_id)), '')
        else nullif(upper(btrim(gp.public_player_id)), '')
      end as public_player_id,
      rs.duke_slug,
      rs.total_score,
      rs.placement,
      rs.is_winner,
      rs.player_count,
      case
        when rs.player_count <= 1 then 100::numeric
        else round(
          (1 - ((rs.placement - 1)::numeric / nullif((rs.player_count - 1)::numeric, 0))) * 100::numeric,
          2
        )
      end as finish_percentile,
      rs.updated_at
    from ranked_scores rs
    left join public.profiles p
      on p.id = rs.owner_user_id
     and rs.guest_profile_id is null
    left join public.guest_profiles gp
      on gp.id = rs.guest_profile_id
  ),
  duke_rollup as (
    select
      ar.duke_slug,
      count(*)::int as games_played,
      round(avg(ar.total_score), 2) as avg_score,
      round(avg(ar.total_score::numeric / nullif(ar.player_count, 0)::numeric), 2) as avg_score_per_player,
      round(avg(case when ar.placement = 1 then 1.0 else 0.0 end) * 100::numeric, 2) as win_percentage,
      round(avg(case when ar.placement = 2 then 1.0 else 0.0 end) * 100::numeric, 2) as second_percentage,
      round(avg(case when ar.placement = 3 then 1.0 else 0.0 end) * 100::numeric, 2) as third_percentage,
      max(ar.total_score)::int as best_score
    from analytics_rows ar
    group by ar.duke_slug
  ),
  wins_by_player as (
    select
      ar.duke_slug,
      ar.player_type,
      ar.player_ref_key,
      max(ar.player_name) as player_name,
      count(*) filter (where ar.placement = 1)::int as wins_with_duke
    from analytics_rows ar
    group by ar.duke_slug, ar.player_type, ar.player_ref_key
  ),
  avg_by_player as (
    select
      ar.duke_slug,
      ar.player_type,
      ar.player_ref_key,
      max(ar.player_name) as player_name,
      round(avg(ar.total_score), 2) as avg_with_duke
    from analytics_rows ar
    group by ar.duke_slug, ar.player_type, ar.player_ref_key
  ),
  top_winner as (
    select distinct on (wbp.duke_slug)
      wbp.duke_slug,
      wbp.player_type as most_wins_player_type,
      wbp.player_ref_key as most_wins_player_key,
      wbp.player_name as most_wins_player_name,
      wbp.wins_with_duke
    from wins_by_player wbp
    order by
      wbp.duke_slug,
      wbp.wins_with_duke desc,
      wbp.player_name,
      wbp.player_ref_key
  ),
  top_avg as (
    select distinct on (abp.duke_slug)
      abp.duke_slug,
      abp.player_type as best_avg_player_type,
      abp.player_ref_key as best_avg_player_key,
      abp.player_name as best_avg_player_name,
      abp.avg_with_duke
    from avg_by_player abp
    order by
      abp.duke_slug,
      abp.avg_with_duke desc,
      abp.player_name,
      abp.player_ref_key
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
end;
$$;

select private.rebuild_public_analytics();
