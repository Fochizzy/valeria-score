create schema if not exists private;

create table if not exists private.duke_score_rules (
  duke_slug text not null,
  stat_key text not null,
  multiplier integer not null,
  scoring_mode text not null check (scoring_mode in ('division', 'multiply')),
  primary key (duke_slug, stat_key)
);

insert into private.duke_score_rules (
  duke_slug,
  stat_key,
  multiplier,
  scoring_mode
)
values
  ('aguilar_the_gilded_knight', 'gold', 3, 'division'),
  ('aguilar_the_gilded_knight', 'magic', 3, 'division'),
  ('aguilar_the_gilded_knight', 'fight', 3, 'division'),
  ('aguilar_the_gilded_knight', 'vp', 1, 'multiply'),
  ('aguilar_the_gilded_knight', 'monstersCount', 1, 'multiply'),
  ('aguilar_the_gilded_knight', 'monsterPoints', 1, 'multiply'),
  ('aguilar_the_gilded_knight', 'domainCount', 2, 'multiply'),
  ('aguilar_the_gilded_knight', 'domainPoints', 1, 'multiply'),
  ('cornelius_the_dreamer', 'gold', 3, 'division'),
  ('cornelius_the_dreamer', 'magic', 3, 'division'),
  ('cornelius_the_dreamer', 'fight', 3, 'division'),
  ('cornelius_the_dreamer', 'vp', 1, 'multiply'),
  ('cornelius_the_dreamer', 'monsterPoints', 1, 'multiply'),
  ('cornelius_the_dreamer', 'domainCount', 2, 'multiply'),
  ('cornelius_the_dreamer', 'domainPoints', 1, 'multiply'),
  ('daniela_the_huntress', 'gold', 3, 'division'),
  ('daniela_the_huntress', 'magic', 3, 'division'),
  ('daniela_the_huntress', 'fight', 3, 'division'),
  ('daniela_the_huntress', 'vp', 1, 'multiply'),
  ('daniela_the_huntress', 'key', 2, 'multiply'),
  ('daniela_the_huntress', 'monsterPoints', 1, 'multiply'),
  ('daniela_the_huntress', 'beastCount', 2, 'multiply'),
  ('daniela_the_huntress', 'domainPoints', 1, 'multiply'),
  ('drakkenstrike', 'gold', 4, 'division'),
  ('drakkenstrike', 'magic', 4, 'division'),
  ('drakkenstrike', 'fight', 4, 'division'),
  ('drakkenstrike', 'vp', 1, 'multiply'),
  ('drakkenstrike', 'helmet', 1, 'multiply'),
  ('drakkenstrike', 'monsterPoints', 1, 'multiply'),
  ('drakkenstrike', 'domainCount', 2, 'multiply'),
  ('drakkenstrike', 'domainPoints', 1, 'multiply'),
  ('elsyn_saint_of_shadows', 'gold', 4, 'division'),
  ('elsyn_saint_of_shadows', 'magic', 4, 'division'),
  ('elsyn_saint_of_shadows', 'fight', 4, 'division'),
  ('elsyn_saint_of_shadows', 'vp', 1, 'multiply'),
  ('elsyn_saint_of_shadows', 'key', 2, 'multiply'),
  ('elsyn_saint_of_shadows', 'holy', 2, 'multiply'),
  ('elsyn_saint_of_shadows', 'monsterPoints', 1, 'multiply'),
  ('elsyn_saint_of_shadows', 'domainPoints', 1, 'multiply'),
  ('elysium_the_allsmith', 'gold', 4, 'division'),
  ('elysium_the_allsmith', 'magic', 4, 'division'),
  ('elysium_the_allsmith', 'fight', 4, 'division'),
  ('elysium_the_allsmith', 'vp', 1, 'multiply'),
  ('elysium_the_allsmith', 'hammer', 1, 'multiply'),
  ('elysium_the_allsmith', 'helmet', 1, 'multiply'),
  ('elysium_the_allsmith', 'key', 1, 'multiply'),
  ('elysium_the_allsmith', 'holy', 1, 'multiply'),
  ('elysium_the_allsmith', 'monsterPoints', 1, 'multiply'),
  ('elysium_the_allsmith', 'domainPoints', 1, 'multiply'),
  ('gurika_the_guardian', 'gold', 3, 'division'),
  ('gurika_the_guardian', 'magic', 3, 'division'),
  ('gurika_the_guardian', 'fight', 3, 'division'),
  ('gurika_the_guardian', 'vp', 1, 'multiply'),
  ('gurika_the_guardian', 'holy', 1, 'multiply'),
  ('gurika_the_guardian', 'monstersCount', 1, 'multiply'),
  ('gurika_the_guardian', 'monsterPoints', 1, 'multiply'),
  ('gurika_the_guardian', 'domainPoints', 1, 'multiply'),
  ('high_priestess_marianna', 'gold', 3, 'division'),
  ('high_priestess_marianna', 'magic', 3, 'division'),
  ('high_priestess_marianna', 'fight', 3, 'division'),
  ('high_priestess_marianna', 'vp', 1, 'multiply'),
  ('high_priestess_marianna', 'holy', 2, 'multiply'),
  ('high_priestess_marianna', 'monsterPoints', 1, 'multiply'),
  ('high_priestess_marianna', 'minionCount', 1, 'multiply'),
  ('high_priestess_marianna', 'domainPoints', 1, 'multiply'),
  ('hrothgar_the_conqueror', 'gold', 4, 'division'),
  ('hrothgar_the_conqueror', 'magic', 4, 'division'),
  ('hrothgar_the_conqueror', 'fight', 4, 'division'),
  ('hrothgar_the_conqueror', 'vp', 1, 'multiply'),
  ('hrothgar_the_conqueror', 'monstersCount', 2, 'multiply'),
  ('hrothgar_the_conqueror', 'monsterPoints', 1, 'multiply'),
  ('hrothgar_the_conqueror', 'lieutenantCount', 1, 'multiply'),
  ('hrothgar_the_conqueror', 'domainPoints', 1, 'multiply'),
  ('isabella_the_righteous', 'gold', 3, 'division'),
  ('isabella_the_righteous', 'magic', 3, 'division'),
  ('isabella_the_righteous', 'fight', 3, 'division'),
  ('isabella_the_righteous', 'vp', 1, 'multiply'),
  ('isabella_the_righteous', 'helmet', 1, 'multiply'),
  ('isabella_the_righteous', 'key', 2, 'multiply'),
  ('isabella_the_righteous', 'monsterPoints', 1, 'multiply'),
  ('isabella_the_righteous', 'domainPoints', 1, 'multiply'),
  ('jeskala_the_joyous_knight', 'gold', 4, 'division'),
  ('jeskala_the_joyous_knight', 'magic', 4, 'division'),
  ('jeskala_the_joyous_knight', 'fight', 4, 'division'),
  ('jeskala_the_joyous_knight', 'vp', 1, 'multiply'),
  ('jeskala_the_joyous_knight', 'monstersCount', 2, 'multiply'),
  ('jeskala_the_joyous_knight', 'monsterPoints', 1, 'multiply'),
  ('jeskala_the_joyous_knight', 'domainCount', 1, 'multiply'),
  ('jeskala_the_joyous_knight', 'domainPoints', 1, 'multiply'),
  ('karsten_the_wolf', 'gold', 4, 'division'),
  ('karsten_the_wolf', 'magic', 4, 'division'),
  ('karsten_the_wolf', 'fight', 4, 'division'),
  ('karsten_the_wolf', 'vp', 1, 'multiply'),
  ('karsten_the_wolf', 'hammer', 1, 'multiply'),
  ('karsten_the_wolf', 'citizenCount', 1, 'multiply'),
  ('karsten_the_wolf', 'monsterPoints', 1, 'multiply'),
  ('karsten_the_wolf', 'domainPoints', 1, 'multiply'),
  ('lekzandr_the_protector', 'gold', 3, 'division'),
  ('lekzandr_the_protector', 'magic', 3, 'division'),
  ('lekzandr_the_protector', 'fight', 3, 'division'),
  ('lekzandr_the_protector', 'vp', 1, 'multiply'),
  ('lekzandr_the_protector', 'hammer', 1, 'multiply'),
  ('lekzandr_the_protector', 'holy', 2, 'multiply'),
  ('lekzandr_the_protector', 'monsterPoints', 1, 'multiply'),
  ('lekzandr_the_protector', 'domainPoints', 1, 'multiply'),
  ('mico_the_monster_slayer', 'gold', 2, 'division'),
  ('mico_the_monster_slayer', 'magic', 2, 'division'),
  ('mico_the_monster_slayer', 'fight', 2, 'division'),
  ('mico_the_monster_slayer', 'vp', 1, 'multiply'),
  ('mico_the_monster_slayer', 'monstersCount', 1, 'multiply'),
  ('mico_the_monster_slayer', 'monsterPoints', 1, 'multiply'),
  ('mico_the_monster_slayer', 'bossCount', 5, 'multiply'),
  ('mico_the_monster_slayer', 'domainPoints', 1, 'multiply'),
  ('mulholland_the_brave', 'gold', 4, 'division'),
  ('mulholland_the_brave', 'magic', 4, 'division'),
  ('mulholland_the_brave', 'fight', 4, 'division'),
  ('mulholland_the_brave', 'vp', 1, 'multiply'),
  ('mulholland_the_brave', 'citizenCount', 1, 'multiply'),
  ('mulholland_the_brave', 'monsterPoints', 1, 'multiply'),
  ('mulholland_the_brave', 'domainPoints', 1, 'multiply'),
  ('node_master_of_swords', 'gold', 3, 'division'),
  ('node_master_of_swords', 'magic', 3, 'division'),
  ('node_master_of_swords', 'fight', 3, 'division'),
  ('node_master_of_swords', 'vp', 1, 'multiply'),
  ('node_master_of_swords', 'helmet', 1, 'multiply'),
  ('node_master_of_swords', 'key', 2, 'multiply'),
  ('node_master_of_swords', 'monsterPoints', 1, 'multiply'),
  ('node_master_of_swords', 'domainPoints', 1, 'multiply'),
  ('pascal_the_gray_hunter', 'gold', 5, 'division'),
  ('pascal_the_gray_hunter', 'magic', 5, 'division'),
  ('pascal_the_gray_hunter', 'fight', 5, 'division'),
  ('pascal_the_gray_hunter', 'vp', 1, 'multiply'),
  ('pascal_the_gray_hunter', 'hammer', 1, 'multiply'),
  ('pascal_the_gray_hunter', 'monstersCount', 2, 'multiply'),
  ('pascal_the_gray_hunter', 'monsterPoints', 1, 'multiply'),
  ('pascal_the_gray_hunter', 'domainPoints', 1, 'multiply'),
  ('reese_the_firebrand', 'gold', 4, 'division'),
  ('reese_the_firebrand', 'magic', 4, 'division'),
  ('reese_the_firebrand', 'fight', 4, 'division'),
  ('reese_the_firebrand', 'vp', 1, 'multiply'),
  ('reese_the_firebrand', 'citizenCount', 1, 'multiply'),
  ('reese_the_firebrand', 'monstersCount', 1, 'multiply'),
  ('reese_the_firebrand', 'monsterPoints', 1, 'multiply'),
  ('reese_the_firebrand', 'domainCount', 1, 'multiply'),
  ('reese_the_firebrand', 'domainPoints', 1, 'multiply'),
  ('shem_the_north_sea_guardian', 'gold', 5, 'division'),
  ('shem_the_north_sea_guardian', 'magic', 5, 'division'),
  ('shem_the_north_sea_guardian', 'fight', 5, 'division'),
  ('shem_the_north_sea_guardian', 'vp', 1, 'multiply'),
  ('shem_the_north_sea_guardian', 'hammer', 1, 'multiply'),
  ('shem_the_north_sea_guardian', 'monstersCount', 2, 'multiply'),
  ('shem_the_north_sea_guardian', 'monsterPoints', 1, 'multiply'),
  ('shem_the_north_sea_guardian', 'domainPoints', 1, 'multiply'),
  ('sir_roberts_of_stoneblood', 'gold', 5, 'division'),
  ('sir_roberts_of_stoneblood', 'magic', 5, 'division'),
  ('sir_roberts_of_stoneblood', 'fight', 5, 'division'),
  ('sir_roberts_of_stoneblood', 'vp', 1, 'multiply'),
  ('sir_roberts_of_stoneblood', 'key', 1, 'multiply'),
  ('sir_roberts_of_stoneblood', 'monstersCount', 1, 'multiply'),
  ('sir_roberts_of_stoneblood', 'monsterPoints', 1, 'multiply'),
  ('sir_roberts_of_stoneblood', 'domainPoints', 1, 'multiply'),
  ('simon_the_unclean', 'gold', 2, 'division'),
  ('simon_the_unclean', 'magic', 2, 'division'),
  ('simon_the_unclean', 'fight', 2, 'division'),
  ('simon_the_unclean', 'vp', 1, 'multiply'),
  ('simon_the_unclean', 'hammer', 1, 'multiply'),
  ('simon_the_unclean', 'helmet', 1, 'multiply'),
  ('simon_the_unclean', 'monsterPoints', 1, 'multiply'),
  ('simon_the_unclean', 'domainPoints', 1, 'multiply'),
  ('sir_gustavo_the_wrathborn', 'gold', 4, 'division'),
  ('sir_gustavo_the_wrathborn', 'magic', 4, 'division'),
  ('sir_gustavo_the_wrathborn', 'fight', 4, 'division'),
  ('sir_gustavo_the_wrathborn', 'vp', 1, 'multiply'),
  ('sir_gustavo_the_wrathborn', 'helmet', 2, 'multiply'),
  ('sir_gustavo_the_wrathborn', 'monsterPoints', 1, 'multiply'),
  ('sir_gustavo_the_wrathborn', 'domainCount', 1, 'multiply'),
  ('sir_gustavo_the_wrathborn', 'domainPoints', 1, 'multiply'),
  ('waryn_lord_of_rogues', 'gold', 3, 'division'),
  ('waryn_lord_of_rogues', 'magic', 3, 'division'),
  ('waryn_lord_of_rogues', 'fight', 3, 'division'),
  ('waryn_lord_of_rogues', 'vp', 1, 'multiply'),
  ('waryn_lord_of_rogues', 'hammer', 1, 'multiply'),
  ('waryn_lord_of_rogues', 'key', 2, 'multiply'),
  ('waryn_lord_of_rogues', 'monsterPoints', 1, 'multiply'),
  ('waryn_lord_of_rogues', 'domainPoints', 1, 'multiply'),
  ('waybright_the_wise', 'gold', 3, 'division'),
  ('waybright_the_wise', 'magic', 3, 'division'),
  ('waybright_the_wise', 'fight', 3, 'division'),
  ('waybright_the_wise', 'vp', 1, 'multiply'),
  ('waybright_the_wise', 'holy', 2, 'multiply'),
  ('waybright_the_wise', 'citizenCount', 1, 'multiply'),
  ('waybright_the_wise', 'monsterPoints', 1, 'multiply'),
  ('waybright_the_wise', 'domainPoints', 1, 'multiply')
on conflict (duke_slug, stat_key) do update
set
  multiplier = excluded.multiplier,
  scoring_mode = excluded.scoring_mode;

create table if not exists public.duke_input_stat_profiles (
  duke_slug text not null,
  stat_key text not null,
  profile_scope text not null check (profile_scope in ('all_games', 'winning_games')),
  games_sample integer not null default 0,
  avg_input numeric(10, 2) not null default 0,
  avg_points_generated numeric(10, 2) not null default 0,
  points_share numeric(10, 2) not null default 0,
  global_points_share numeric(10, 2) not null default 0,
  share_delta_vs_global numeric(10, 2) not null default 0,
  primary key (duke_slug, stat_key, profile_scope)
);

create index if not exists duke_input_stat_profiles_duke_scope_idx
  on public.duke_input_stat_profiles (duke_slug, profile_scope);

alter table public.duke_global_stats
  add column if not exists top_input_stat_key text;

alter table public.duke_global_stats
  add column if not exists top_input_points_share numeric(10, 2);

alter table public.duke_global_stats
  add column if not exists winning_edge_stat_key text;

alter table public.duke_global_stats
  add column if not exists winning_edge_share_delta numeric(10, 2);

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

  update public.duke_global_stats
  set
    top_input_stat_key = null,
    top_input_points_share = null,
    winning_edge_stat_key = null,
    winning_edge_share_delta = null;

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
  )
  update public.duke_global_stats dgs
  set
    top_input_stat_key = ur.stat_key,
    top_input_points_share = ur.points_share,
    winning_edge_stat_key = wr.stat_key,
    winning_edge_share_delta = wr.share_delta_vs_global
  from usual_ranked ur
  left join winning_ranked wr
    on wr.duke_slug = ur.duke_slug
   and wr.row_number = 1
  where dgs.duke_slug = ur.duke_slug
    and ur.row_number = 1;
end;
$$;

do $$
begin
  if to_regprocedure('private.rebuild_public_analytics()') is not null
    and to_regprocedure('private.rebuild_public_analytics_base()') is null then
    execute 'alter function private.rebuild_public_analytics() rename to rebuild_public_analytics_base';
  end if;
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
  truncate table public.duke_input_stat_profiles;
  perform private.refresh_duke_input_analytics();
end;
$$;

alter table public.duke_input_stat_profiles enable row level security;

drop policy if exists duke_input_stat_profiles_select_authenticated
  on public.duke_input_stat_profiles;

create policy duke_input_stat_profiles_select_authenticated
on public.duke_input_stat_profiles
for select
to authenticated
using (true);

revoke all on public.duke_input_stat_profiles from anon;
grant select on public.duke_input_stat_profiles to authenticated, service_role;

select private.rebuild_public_analytics();
