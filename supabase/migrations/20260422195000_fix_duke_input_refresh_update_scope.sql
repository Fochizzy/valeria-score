create or replace function private.refresh_duke_input_analytics()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.duke_input_stat_profiles (
    duke_slug,
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
      rs.duke_slug,
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
      ei.duke_slug,
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
      si.duke_slug,
      si.stat_key,
      'all_games'::text as profile_scope,
      si.input_value,
      si.points_generated
    from scored_inputs si
    union all
    select
      si.session_score_id,
      si.duke_slug,
      si.stat_key,
      'winning_games'::text as profile_scope,
      si.input_value,
      si.points_generated
    from scored_inputs si
    where si.is_winner
  ),
  duke_stat_aggregates as (
    select
      pr.duke_slug,
      pr.stat_key,
      pr.profile_scope,
      count(*)::int as games_sample,
      round(avg(pr.input_value), 2) as avg_input,
      round(avg(pr.points_generated), 2) as avg_points_generated,
      coalesce(sum(pr.points_generated), 0::numeric) as total_points_generated
    from profile_rows pr
    group by pr.duke_slug, pr.stat_key, pr.profile_scope
  ),
  duke_scope_totals as (
    select
      pr.duke_slug,
      pr.profile_scope,
      coalesce(sum(pr.points_generated), 0::numeric) as total_points_generated
    from profile_rows pr
    group by pr.duke_slug, pr.profile_scope
  ),
  global_stat_aggregates as (
    select
      pr.stat_key,
      pr.profile_scope,
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
  ),
  final_rows as (
    select
      dsa.duke_slug,
      dsa.stat_key,
      dsa.profile_scope,
      dsa.games_sample,
      dsa.avg_input,
      dsa.avg_points_generated,
      round(
        (dsa.total_points_generated / nullif(dst.total_points_generated, 0)) * 100::numeric,
        2
      ) as points_share,
      round(
        (coalesce(gsa.total_points_generated, 0::numeric) / nullif(gst.total_points_generated, 0)) * 100::numeric,
        2
      ) as global_points_share
    from duke_stat_aggregates dsa
    join duke_scope_totals dst
      on dst.duke_slug = dsa.duke_slug
     and dst.profile_scope = dsa.profile_scope
    left join global_stat_aggregates gsa
      on gsa.stat_key = dsa.stat_key
     and gsa.profile_scope = dsa.profile_scope
    left join global_scope_totals gst
      on gst.profile_scope = dsa.profile_scope
  )
  select
    fr.duke_slug,
    fr.stat_key,
    fr.profile_scope,
    fr.games_sample,
    coalesce(fr.avg_input, 0),
    coalesce(fr.avg_points_generated, 0),
    coalesce(fr.points_share, 0),
    coalesce(fr.global_points_share, 0),
    round(coalesce(fr.points_share, 0) - coalesce(fr.global_points_share, 0), 2) as share_delta_vs_global
  from final_rows fr;

  with usual_ranked as (
    select
      dip.duke_slug,
      dip.stat_key,
      dip.points_share,
      row_number() over (
        partition by dip.duke_slug
        order by dip.points_share desc, dip.avg_points_generated desc, dip.stat_key
      ) as row_number
    from public.duke_input_stat_profiles dip
    where dip.profile_scope = 'all_games'
  ),
  winning_ranked as (
    select
      dip.duke_slug,
      dip.stat_key,
      dip.share_delta_vs_global,
      row_number() over (
        partition by dip.duke_slug
        order by dip.share_delta_vs_global desc, dip.points_share desc, dip.stat_key
      ) as row_number
    from public.duke_input_stat_profiles dip
    where dip.profile_scope = 'winning_games'
      and dip.share_delta_vs_global > 0
  ),
  ranked_teasers as (
    select
      dgs.duke_slug,
      ur.stat_key as top_input_stat_key,
      ur.points_share as top_input_points_share,
      wr.stat_key as winning_edge_stat_key,
      wr.share_delta_vs_global as winning_edge_share_delta
    from public.duke_global_stats dgs
    left join usual_ranked ur
      on ur.duke_slug = dgs.duke_slug
     and ur.row_number = 1
    left join winning_ranked wr
      on wr.duke_slug = dgs.duke_slug
     and wr.row_number = 1
  )
  update public.duke_global_stats dgs
  set
    top_input_stat_key = ranked_teasers.top_input_stat_key,
    top_input_points_share = ranked_teasers.top_input_points_share,
    winning_edge_stat_key = ranked_teasers.winning_edge_stat_key,
    winning_edge_share_delta = ranked_teasers.winning_edge_share_delta
  from ranked_teasers
  where dgs.duke_slug = ranked_teasers.duke_slug;
end;
$$;

select private.rebuild_public_analytics();
