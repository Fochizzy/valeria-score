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
    ss.updated_at
  from public.session_scores ss
  where ss.game_locked = true
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
  count(*) over (partition by session_id) as player_count
from valid_scores;

create or replace view public.duke_global_stats as
with base as (
  select
    ssr.duke_slug,
    ssr.user_id,
    ssr.guest_profile_id,
    ssr.total_score,
    ssr.finish_rank,
    ssr.player_count,
    case
      when ssr.user_id is not null then coalesce(
        nullif(btrim(p.display_name), ''),
        nullif(upper(btrim(p.public_player_id)), ''),
        'Unknown Player'
      )
      when nullif(btrim(gp.display_name), '') is not null
        and nullif(upper(btrim(gp.public_player_id)), '') is not null
        and upper(btrim(gp.display_name)) <> upper(btrim(gp.public_player_id))
        then btrim(gp.display_name) || ' (' || upper(btrim(gp.public_player_id)) || ')'
      when nullif(upper(btrim(gp.public_player_id)), '') is not null
        then upper(btrim(gp.public_player_id))
      when nullif(btrim(gp.display_name), '') is not null
        then btrim(gp.display_name)
      when nullif(btrim(ssr.guest_name), '') is not null
        then btrim(ssr.guest_name)
      else 'Guest Player'
    end as player_name
  from public.session_score_results ssr
  left join public.profiles p
    on p.id = ssr.user_id
  left join public.guest_profiles gp
    on gp.id = ssr.guest_profile_id
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
