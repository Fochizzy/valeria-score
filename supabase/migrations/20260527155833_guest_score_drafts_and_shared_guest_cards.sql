alter table public.session_scores
  add column if not exists draft_duke_slug text,
  add column if not exists draft_inputs jsonb,
  add column if not exists draft_score_total integer,
  add column if not exists draft_updated_at timestamptz;

create or replace function public.get_profile_dashboard()
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
  viewer_sessions as (
    select distinct
      sp.session_id
    from viewer_ctx vc
    join public.session_players sp
      on vc.user_id is not null
     and sp.user_id = vc.user_id

    union

    select distinct
      gs.id as session_id
    from viewer_ctx vc
    join public.game_sessions gs
      on vc.user_id is not null
     and gs.created_by = vc.user_id

    union

    select distinct
      ss.session_id
    from viewer_ctx vc
    join public.session_scores ss
      on vc.user_id is not null
     and (
       ss.owner_user_id = vc.user_id
       or ss.scored_by_user_id = vc.user_id
     )
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
  accessible_guest_ids as (
    select
      gp.id as guest_profile_id
    from viewer_ctx vc
    join public.guest_profiles gp
      on vc.user_id is not null
     and gp.owner_user_id = vc.user_id

    union

    select distinct
      ss.guest_profile_id
    from viewer_sessions vs
    join public.session_scores ss
      on ss.session_id = vs.session_id
    where ss.guest_profile_id is not null
  ),
  guest_cards as (
    select
      gp.id,
      coalesce(nullif(btrim(gp.display_name), ''), 'Guest Player') as display_name,
      gp.contact_email,
      nullif(upper(btrim(gp.public_player_id)), '') as public_player_id
    from public.guest_profiles gp
    join accessible_guest_ids ag
      on ag.guest_profile_id = gp.id
  ),
  guest_rows as (
    select
      rs.guest_profile_id,
      rs.duke_slug,
      rs.placement
    from ranked_scores rs
    join accessible_guest_ids ag
      on ag.guest_profile_id = rs.guest_profile_id
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
  ),
  guest_draft_badges as (
    select
      ss.guest_profile_id,
      count(*)::int as in_progress_count,
      max(ss.draft_updated_at) as last_draft_updated_at
    from public.session_scores ss
    join accessible_guest_ids ag
      on ag.guest_profile_id = ss.guest_profile_id
    where ss.draft_updated_at is not null
      and not coalesce(ss.game_locked, false)
    group by ss.guest_profile_id
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
          'totalGames', coalesce(gs.total_games, 0),
          'inProgressCount', coalesce(gdb.in_progress_count, 0),
          'lastDraftUpdatedAt', gdb.last_draft_updated_at
        )
        order by gc.display_name, gc.id
      )
      from guest_cards gc
      left join guest_stats gs
        on gs.guest_profile_id = gc.id
      left join guest_draft_badges gdb
        on gdb.guest_profile_id = gc.id
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.get_profile_dashboard() to authenticated, service_role;
