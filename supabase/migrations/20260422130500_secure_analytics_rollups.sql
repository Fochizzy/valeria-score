create schema if not exists private;

revoke all on schema private from public;

drop function if exists public.get_profile_dashboard();

drop view if exists public.duke_global_stats;
drop table if exists public.duke_global_stats;
drop view if exists public.player_duke_stats_30d;
drop table if exists public.player_duke_stats_30d;
drop view if exists public.player_duke_stats;
drop table if exists public.player_duke_stats;
drop view if exists public.player_global_stats_30d;
drop table if exists public.player_global_stats_30d;
drop view if exists public.player_global_stats;
drop table if exists public.player_global_stats;
drop view if exists public.player_stats_base;
drop table if exists public.player_stats_base;
drop view if exists public.session_score_results;
drop table if exists public.session_score_results;

create table public.player_global_stats (
  player_key text primary key,
  player_name text not null,
  public_player_id text,
  games_played integer not null default 0,
  wins integer not null default 0,
  second_places integer not null default 0,
  third_places integer not null default 0,
  avg_score numeric(10, 2) not null default 0,
  avg_finish numeric(10, 2) not null default 0,
  player_type text not null check (player_type in ('user', 'guest'))
);

create table public.player_global_stats_30d (
  player_key text primary key,
  player_name text not null,
  public_player_id text,
  games_played integer not null default 0,
  wins integer not null default 0,
  second_places integer not null default 0,
  third_places integer not null default 0,
  avg_score numeric(10, 2) not null default 0,
  avg_finish numeric(10, 2) not null default 0,
  player_type text not null check (player_type in ('user', 'guest'))
);

create table public.player_duke_stats (
  player_key text not null,
  player_name text not null,
  public_player_id text,
  duke_slug text not null,
  games_played integer not null default 0,
  wins integer not null default 0,
  avg_score numeric(10, 2) not null default 0,
  avg_finish numeric(10, 2) not null default 0,
  player_type text not null check (player_type in ('user', 'guest')),
  primary key (player_key, duke_slug)
);

create table public.player_duke_stats_30d (
  player_key text not null,
  player_name text not null,
  public_player_id text,
  duke_slug text not null,
  games_played integer not null default 0,
  wins integer not null default 0,
  avg_score numeric(10, 2) not null default 0,
  avg_finish numeric(10, 2) not null default 0,
  player_type text not null check (player_type in ('user', 'guest')),
  primary key (player_key, duke_slug)
);

create table public.duke_global_stats (
  duke_slug text primary key,
  games_played integer not null default 0,
  avg_score numeric(10, 2) not null default 0,
  avg_score_per_player numeric(10, 2) not null default 0,
  win_percentage numeric(10, 2) not null default 0,
  second_percentage numeric(10, 2) not null default 0,
  third_percentage numeric(10, 2) not null default 0,
  best_score integer not null default 0,
  most_wins_player_type text check (most_wins_player_type in ('user', 'guest')),
  most_wins_player_key text,
  wins_with_duke integer,
  best_avg_player_type text check (best_avg_player_type in ('user', 'guest')),
  best_avg_player_key text,
  avg_with_duke numeric(10, 2),
  most_wins_player_name text,
  best_avg_player_name text
);

create index player_global_stats_public_player_id_idx
  on public.player_global_stats (public_player_id);

create or replace function private.rebuild_public_analytics()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.player_duke_stats_30d;
  delete from public.player_duke_stats;
  delete from public.player_global_stats_30d;
  delete from public.player_global_stats;
  delete from public.duke_global_stats;

  insert into public.player_global_stats (
    player_key,
    player_name,
    public_player_id,
    games_played,
    wins,
    second_places,
    third_places,
    avg_score,
    avg_finish,
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
      coalesce(ss.placement, rank() over (
        partition by ss.session_id
        order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
      ))::int as placement,
      coalesce(ss.is_winner, coalesce(ss.placement, rank() over (
        partition by ss.session_id
        order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
      )) = 1) as is_winner,
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
    count(*) filter (where ar.placement = 2)::int as second_places,
    count(*) filter (where ar.placement = 3)::int as third_places,
    round(avg(ar.total_score), 2) as avg_score,
    round(avg(ar.placement::numeric), 2) as avg_finish,
    max(ar.player_type) as player_type
  from analytics_rows ar
  group by ar.player_key;

  insert into public.player_global_stats_30d (
    player_key,
    player_name,
    public_player_id,
    games_played,
    wins,
    second_places,
    third_places,
    avg_score,
    avg_finish,
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
      coalesce(ss.placement, rank() over (
        partition by ss.session_id
        order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
      ))::int as placement,
      coalesce(ss.is_winner, coalesce(ss.placement, rank() over (
        partition by ss.session_id
        order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
      )) = 1) as is_winner,
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
    count(*) filter (where ar.placement = 2)::int as second_places,
    count(*) filter (where ar.placement = 3)::int as third_places,
    round(avg(ar.total_score), 2) as avg_score,
    round(avg(ar.placement::numeric), 2) as avg_finish,
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
    avg_score,
    avg_finish,
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
      coalesce(ss.placement, rank() over (
        partition by ss.session_id
        order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
      ))::int as placement,
      coalesce(ss.is_winner, coalesce(ss.placement, rank() over (
        partition by ss.session_id
        order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
      )) = 1) as is_winner,
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
    round(avg(ar.total_score), 2) as avg_score,
    round(avg(ar.placement::numeric), 2) as avg_finish,
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
    avg_score,
    avg_finish,
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
      coalesce(ss.placement, rank() over (
        partition by ss.session_id
        order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
      ))::int as placement,
      coalesce(ss.is_winner, coalesce(ss.placement, rank() over (
        partition by ss.session_id
        order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
      )) = 1) as is_winner,
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
    round(avg(ar.total_score), 2) as avg_score,
    round(avg(ar.placement::numeric), 2) as avg_finish,
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
      coalesce(ss.placement, rank() over (
        partition by ss.session_id
        order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
      ))::int as placement,
      coalesce(ss.is_winner, coalesce(ss.placement, rank() over (
        partition by ss.session_id
        order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
      )) = 1) as is_winner,
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

create or replace function private.refresh_public_analytics_from_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.rebuild_public_analytics();
  return null;
end;
$$;

drop trigger if exists refresh_public_analytics_on_session_scores_insert on public.session_scores;
create trigger refresh_public_analytics_on_session_scores_insert
after insert on public.session_scores
for each row
when (
  coalesce(new.game_locked, false)
  and coalesce(new.included_in_stats, false)
  and new.duke_slug is not null
  and btrim(new.duke_slug) <> ''
  and new.duke_slug <> 'no-duke-selected'
)
execute function private.refresh_public_analytics_from_change();

drop trigger if exists refresh_public_analytics_on_session_scores_update on public.session_scores;
create trigger refresh_public_analytics_on_session_scores_update
after update on public.session_scores
for each row
when (
  (
    coalesce(old.game_locked, false)
    and coalesce(old.included_in_stats, false)
    and old.duke_slug is not null
    and btrim(old.duke_slug) <> ''
    and old.duke_slug <> 'no-duke-selected'
  )
  or (
    coalesce(new.game_locked, false)
    and coalesce(new.included_in_stats, false)
    and new.duke_slug is not null
    and btrim(new.duke_slug) <> ''
    and new.duke_slug <> 'no-duke-selected'
  )
)
execute function private.refresh_public_analytics_from_change();

drop trigger if exists refresh_public_analytics_on_session_scores_delete on public.session_scores;
create trigger refresh_public_analytics_on_session_scores_delete
after delete on public.session_scores
for each row
when (
  coalesce(old.game_locked, false)
  and coalesce(old.included_in_stats, false)
  and old.duke_slug is not null
  and btrim(old.duke_slug) <> ''
  and old.duke_slug <> 'no-duke-selected'
)
execute function private.refresh_public_analytics_from_change();

drop trigger if exists refresh_public_analytics_on_profiles_update on public.profiles;
create trigger refresh_public_analytics_on_profiles_update
after update of display_name, public_player_id on public.profiles
for each row
execute function private.refresh_public_analytics_from_change();

drop trigger if exists refresh_public_analytics_on_profiles_delete on public.profiles;
create trigger refresh_public_analytics_on_profiles_delete
after delete on public.profiles
for each row
execute function private.refresh_public_analytics_from_change();

drop trigger if exists refresh_public_analytics_on_guest_profiles_update on public.guest_profiles;
create trigger refresh_public_analytics_on_guest_profiles_update
after update of display_name, public_player_id on public.guest_profiles
for each row
execute function private.refresh_public_analytics_from_change();

drop trigger if exists refresh_public_analytics_on_guest_profiles_delete on public.guest_profiles;
create trigger refresh_public_analytics_on_guest_profiles_delete
after delete on public.guest_profiles
for each row
execute function private.refresh_public_analytics_from_change();

alter table public.player_global_stats enable row level security;
alter table public.player_global_stats_30d enable row level security;
alter table public.player_duke_stats enable row level security;
alter table public.player_duke_stats_30d enable row level security;
alter table public.duke_global_stats enable row level security;

create policy player_global_stats_select_authenticated
on public.player_global_stats
for select
to authenticated
using (true);

create policy player_global_stats_30d_select_authenticated
on public.player_global_stats_30d
for select
to authenticated
using (true);

create policy player_duke_stats_select_authenticated
on public.player_duke_stats
for select
to authenticated
using (true);

create policy player_duke_stats_30d_select_authenticated
on public.player_duke_stats_30d
for select
to authenticated
using (true);

create policy duke_global_stats_select_authenticated
on public.duke_global_stats
for select
to authenticated
using (true);

revoke all on public.player_global_stats from anon;
revoke all on public.player_global_stats_30d from anon;
revoke all on public.player_duke_stats from anon;
revoke all on public.player_duke_stats_30d from anon;
revoke all on public.duke_global_stats from anon;

grant select on public.player_global_stats to authenticated, service_role;
grant select on public.player_global_stats_30d to authenticated, service_role;
grant select on public.player_duke_stats to authenticated, service_role;
grant select on public.player_duke_stats_30d to authenticated, service_role;
grant select on public.duke_global_stats to authenticated, service_role;

create function public.get_profile_dashboard()
returns jsonb
language sql
stable
set search_path = ''
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
  ranked_scores as (
    select
      ss.id,
      ss.session_id,
      ss.owner_user_id,
      ss.guest_profile_id,
      ss.duke_slug,
      ss.score_total as total_score,
      coalesce(ss.placement, rank() over (
        partition by ss.session_id
        order by coalesce(ss.score_total, 0) desc, ss.updated_at asc nulls last, ss.id asc
      ))::int as placement,
      count(*) over (partition by ss.session_id)::int as player_count,
      ss.updated_at
    from public.session_scores ss
    where coalesce(ss.game_locked, false)
      and coalesce(ss.included_in_stats, false)
      and ss.duke_slug is not null
      and btrim(ss.duke_slug) <> ''
      and ss.duke_slug <> 'no-duke-selected'
  ),
  history_rows as (
    select
      rs.session_id,
      rs.duke_slug,
      rs.total_score,
      rs.placement as rank,
      rs.player_count,
      rs.updated_at
    from ranked_scores rs
    join viewer_ctx vc
      on vc.user_id is not null
     and rs.owner_user_id = vc.user_id
    where rs.guest_profile_id is null
  ),
  guest_ids as (
    select distinct
      rs.guest_profile_id
    from ranked_scores rs
    join viewer_ctx vc
      on vc.user_id is not null
     and rs.owner_user_id = vc.user_id
    where rs.guest_profile_id is not null
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
      rs.guest_profile_id,
      rs.duke_slug,
      rs.placement
    from ranked_scores rs
    join guest_ids gi
      on gi.guest_profile_id = rs.guest_profile_id
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

grant execute on function public.get_profile_dashboard() to authenticated, service_role;

select private.rebuild_public_analytics();
