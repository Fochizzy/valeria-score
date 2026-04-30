begin;

create temp table tmp_expected_rules (
  duke_slug text not null,
  stat_key text not null,
  multiplier integer not null,
  scoring_mode text not null
) on commit drop;

insert into tmp_expected_rules (duke_slug, stat_key, multiplier, scoring_mode)
values
  ('aguilar_the_gilded_knight', 'domainCount', 2, 'multiply'),
    ('aguilar_the_gilded_knight', 'domainPoints', 1, 'multiply'),
    ('aguilar_the_gilded_knight', 'fight', 4, 'division'),
    ('aguilar_the_gilded_knight', 'gold', 4, 'division'),
    ('aguilar_the_gilded_knight', 'magic', 4, 'division'),
    ('aguilar_the_gilded_knight', 'monsterPoints', 1, 'multiply'),
    ('aguilar_the_gilded_knight', 'monstersCount', 1, 'multiply'),
    ('aguilar_the_gilded_knight', 'vp', 1, 'multiply'),
    ('cornelius_the_dreamer', 'domainCount', 3, 'multiply'),
    ('cornelius_the_dreamer', 'domainPoints', 1, 'multiply'),
    ('cornelius_the_dreamer', 'fight', 3, 'division'),
    ('cornelius_the_dreamer', 'gold', 3, 'division'),
    ('cornelius_the_dreamer', 'magic', 3, 'division'),
    ('cornelius_the_dreamer', 'monsterPoints', 1, 'multiply'),
    ('cornelius_the_dreamer', 'vp', 1, 'multiply'),
    ('daniela_the_huntress', 'beastCount', 2, 'multiply'),
    ('daniela_the_huntress', 'domainPoints', 1, 'multiply'),
    ('daniela_the_huntress', 'fight', 3, 'division'),
    ('daniela_the_huntress', 'gold', 3, 'division'),
    ('daniela_the_huntress', 'key', 2, 'multiply'),
    ('daniela_the_huntress', 'magic', 3, 'division'),
    ('daniela_the_huntress', 'monsterPoints', 1, 'multiply'),
    ('daniela_the_huntress', 'vp', 1, 'multiply'),
    ('drakkenstrike', 'domainCount', 2, 'multiply'),
    ('drakkenstrike', 'domainPoints', 1, 'multiply'),
    ('drakkenstrike', 'fight', 4, 'division'),
    ('drakkenstrike', 'gold', 4, 'division'),
    ('drakkenstrike', 'helmet', 1, 'multiply'),
    ('drakkenstrike', 'magic', 4, 'division'),
    ('drakkenstrike', 'monsterPoints', 1, 'multiply'),
    ('drakkenstrike', 'vp', 1, 'multiply'),
    ('elsyn_saint_of_shadows', 'domainPoints', 1, 'multiply'),
    ('elsyn_saint_of_shadows', 'fight', 4, 'division'),
    ('elsyn_saint_of_shadows', 'gold', 4, 'division'),
    ('elsyn_saint_of_shadows', 'holy', 2, 'multiply'),
    ('elsyn_saint_of_shadows', 'key', 2, 'multiply'),
    ('elsyn_saint_of_shadows', 'magic', 4, 'division'),
    ('elsyn_saint_of_shadows', 'monsterPoints', 1, 'multiply'),
    ('elsyn_saint_of_shadows', 'vp', 1, 'multiply'),
    ('elysium_the_allsmith', 'domainPoints', 1, 'multiply'),
    ('elysium_the_allsmith', 'fight', 4, 'division'),
    ('elysium_the_allsmith', 'gold', 4, 'division'),
    ('elysium_the_allsmith', 'hammer', 1, 'multiply'),
    ('elysium_the_allsmith', 'helmet', 1, 'multiply'),
    ('elysium_the_allsmith', 'holy', 1, 'multiply'),
    ('elysium_the_allsmith', 'key', 1, 'multiply'),
    ('elysium_the_allsmith', 'magic', 4, 'division'),
    ('elysium_the_allsmith', 'monsterPoints', 1, 'multiply'),
    ('elysium_the_allsmith', 'vp', 1, 'multiply'),
    ('gurika_the_guardian', 'domainPoints', 1, 'multiply'),
    ('gurika_the_guardian', 'fight', 3, 'division'),
    ('gurika_the_guardian', 'gold', 3, 'division'),
    ('gurika_the_guardian', 'holy', 1, 'multiply'),
    ('gurika_the_guardian', 'magic', 3, 'division'),
    ('gurika_the_guardian', 'monsterPoints', 1, 'multiply'),
    ('gurika_the_guardian', 'monstersCount', 1, 'multiply'),
    ('gurika_the_guardian', 'vp', 1, 'multiply'),
    ('high_priestess_marianna', 'domainPoints', 1, 'multiply'),
    ('high_priestess_marianna', 'fight', 3, 'division'),
    ('high_priestess_marianna', 'gold', 3, 'division'),
    ('high_priestess_marianna', 'holy', 2, 'multiply'),
    ('high_priestess_marianna', 'magic', 3, 'division'),
    ('high_priestess_marianna', 'minionCount', 1, 'multiply'),
    ('high_priestess_marianna', 'monsterPoints', 1, 'multiply'),
    ('high_priestess_marianna', 'vp', 1, 'multiply'),
    ('hrothgar_the_conqueror', 'domainPoints', 1, 'multiply'),
    ('hrothgar_the_conqueror', 'fight', 4, 'division'),
    ('hrothgar_the_conqueror', 'gold', 4, 'division'),
    ('hrothgar_the_conqueror', 'lieutenantCount', 1, 'multiply'),
    ('hrothgar_the_conqueror', 'magic', 4, 'division'),
    ('hrothgar_the_conqueror', 'monsterPoints', 1, 'multiply'),
    ('hrothgar_the_conqueror', 'monstersCount', 2, 'multiply'),
    ('hrothgar_the_conqueror', 'vp', 1, 'multiply'),
    ('isabella_the_righteous', 'domainPoints', 1, 'multiply'),
    ('isabella_the_righteous', 'fight', 3, 'division'),
    ('isabella_the_righteous', 'gold', 3, 'division'),
    ('isabella_the_righteous', 'helmet', 1, 'multiply'),
    ('isabella_the_righteous', 'holy', 2, 'multiply'),
    ('isabella_the_righteous', 'magic', 3, 'division'),
    ('isabella_the_righteous', 'monsterPoints', 1, 'multiply'),
    ('isabella_the_righteous', 'vp', 1, 'multiply'),
    ('jeskala_the_joyous_knight', 'domainCount', 1, 'multiply'),
    ('jeskala_the_joyous_knight', 'domainPoints', 1, 'multiply'),
    ('jeskala_the_joyous_knight', 'fight', 4, 'division'),
    ('jeskala_the_joyous_knight', 'gold', 4, 'division'),
    ('jeskala_the_joyous_knight', 'magic', 4, 'division'),
    ('jeskala_the_joyous_knight', 'monsterPoints', 1, 'multiply'),
    ('jeskala_the_joyous_knight', 'monstersCount', 2, 'multiply'),
    ('jeskala_the_joyous_knight', 'vp', 1, 'multiply'),
    ('karsten_the_wolf', 'citizenCount', 1, 'multiply'),
    ('karsten_the_wolf', 'domainPoints', 1, 'multiply'),
    ('karsten_the_wolf', 'fight', 4, 'division'),
    ('karsten_the_wolf', 'gold', 4, 'division'),
    ('karsten_the_wolf', 'hammer', 1, 'multiply'),
    ('karsten_the_wolf', 'magic', 4, 'division'),
    ('karsten_the_wolf', 'monsterPoints', 1, 'multiply'),
    ('karsten_the_wolf', 'vp', 1, 'multiply'),
    ('lekzandr_the_protector', 'domainPoints', 1, 'multiply'),
    ('lekzandr_the_protector', 'fight', 3, 'division'),
    ('lekzandr_the_protector', 'gold', 3, 'division'),
    ('lekzandr_the_protector', 'hammer', 1, 'multiply'),
    ('lekzandr_the_protector', 'holy', 2, 'multiply'),
    ('lekzandr_the_protector', 'magic', 3, 'division'),
    ('lekzandr_the_protector', 'monsterPoints', 1, 'multiply'),
    ('lekzandr_the_protector', 'vp', 1, 'multiply'),
    ('mico_the_monster_slayer', 'bossCount', 5, 'multiply'),
    ('mico_the_monster_slayer', 'domainPoints', 1, 'multiply'),
    ('mico_the_monster_slayer', 'fight', 2, 'division'),
    ('mico_the_monster_slayer', 'gold', 2, 'division'),
    ('mico_the_monster_slayer', 'magic', 2, 'division'),
    ('mico_the_monster_slayer', 'monsterPoints', 1, 'multiply'),
    ('mico_the_monster_slayer', 'monstersCount', 1, 'multiply'),
    ('mico_the_monster_slayer', 'vp', 1, 'multiply'),
    ('mulholland_the_brave', 'citizenCount', 2, 'multiply'),
    ('mulholland_the_brave', 'domainPoints', 1, 'multiply'),
    ('mulholland_the_brave', 'fight', 4, 'division'),
    ('mulholland_the_brave', 'gold', 4, 'division'),
    ('mulholland_the_brave', 'magic', 4, 'division'),
    ('mulholland_the_brave', 'monsterPoints', 1, 'multiply'),
    ('mulholland_the_brave', 'vp', 1, 'multiply'),
    ('node_master_of_swords', 'domainPoints', 1, 'multiply'),
    ('node_master_of_swords', 'fight', 3, 'division'),
    ('node_master_of_swords', 'gold', 3, 'division'),
    ('node_master_of_swords', 'helmet', 1, 'multiply'),
    ('node_master_of_swords', 'key', 2, 'multiply'),
    ('node_master_of_swords', 'magic', 3, 'division'),
    ('node_master_of_swords', 'monsterPoints', 1, 'multiply'),
    ('node_master_of_swords', 'vp', 1, 'multiply'),
    ('pascal_the_gray_hunter', 'domainPoints', 1, 'multiply'),
    ('pascal_the_gray_hunter', 'fight', 5, 'division'),
    ('pascal_the_gray_hunter', 'gold', 5, 'division'),
    ('pascal_the_gray_hunter', 'helmet', 1, 'multiply'),
    ('pascal_the_gray_hunter', 'magic', 5, 'division'),
    ('pascal_the_gray_hunter', 'monsterPoints', 1, 'multiply'),
    ('pascal_the_gray_hunter', 'monstersCount', 2, 'multiply'),
    ('pascal_the_gray_hunter', 'vp', 1, 'multiply'),
    ('reese_the_firebrand', 'citizenCount', 1, 'multiply'),
    ('reese_the_firebrand', 'domainCount', 1, 'multiply'),
    ('reese_the_firebrand', 'domainPoints', 1, 'multiply'),
    ('reese_the_firebrand', 'fight', 4, 'division'),
    ('reese_the_firebrand', 'gold', 4, 'division'),
    ('reese_the_firebrand', 'magic', 4, 'division'),
    ('reese_the_firebrand', 'monsterPoints', 1, 'multiply'),
    ('reese_the_firebrand', 'monstersCount', 1, 'multiply'),
    ('reese_the_firebrand', 'vp', 1, 'multiply'),
    ('shem_the_north_sea_guardian', 'domainPoints', 1, 'multiply'),
    ('shem_the_north_sea_guardian', 'fight', 5, 'division'),
    ('shem_the_north_sea_guardian', 'gold', 5, 'division'),
    ('shem_the_north_sea_guardian', 'hammer', 1, 'multiply'),
    ('shem_the_north_sea_guardian', 'magic', 5, 'division'),
    ('shem_the_north_sea_guardian', 'monsterPoints', 1, 'multiply'),
    ('shem_the_north_sea_guardian', 'monstersCount', 2, 'multiply'),
    ('shem_the_north_sea_guardian', 'vp', 1, 'multiply'),
    ('simon_the_unclean', 'domainPoints', 1, 'multiply'),
    ('simon_the_unclean', 'fight', 2, 'division'),
    ('simon_the_unclean', 'gold', 2, 'division'),
    ('simon_the_unclean', 'hammer', 1, 'multiply'),
    ('simon_the_unclean', 'helmet', 1, 'multiply'),
    ('simon_the_unclean', 'magic', 2, 'division'),
    ('simon_the_unclean', 'monsterPoints', 1, 'multiply'),
    ('simon_the_unclean', 'vp', 1, 'multiply'),
    ('sir_gustavo_the_wrathborn', 'domainCount', 1, 'multiply'),
    ('sir_gustavo_the_wrathborn', 'domainPoints', 1, 'multiply'),
    ('sir_gustavo_the_wrathborn', 'fight', 5, 'division'),
    ('sir_gustavo_the_wrathborn', 'gold', 5, 'division'),
    ('sir_gustavo_the_wrathborn', 'helmet', 2, 'multiply'),
    ('sir_gustavo_the_wrathborn', 'magic', 5, 'division'),
    ('sir_gustavo_the_wrathborn', 'monsterPoints', 1, 'multiply'),
    ('sir_gustavo_the_wrathborn', 'vp', 1, 'multiply'),
    ('sir_roberts_of_stoneblood', 'domainPoints', 1, 'multiply'),
    ('sir_roberts_of_stoneblood', 'fight', 3, 'division'),
    ('sir_roberts_of_stoneblood', 'gold', 3, 'division'),
    ('sir_roberts_of_stoneblood', 'key', 1, 'multiply'),
    ('sir_roberts_of_stoneblood', 'magic', 3, 'division'),
    ('sir_roberts_of_stoneblood', 'monsterPoints', 1, 'multiply'),
    ('sir_roberts_of_stoneblood', 'monstersCount', 1, 'multiply'),
    ('sir_roberts_of_stoneblood', 'vp', 1, 'multiply'),
    ('waryn_lord_of_rogues', 'domainPoints', 1, 'multiply'),
    ('waryn_lord_of_rogues', 'fight', 3, 'division'),
    ('waryn_lord_of_rogues', 'gold', 3, 'division'),
    ('waryn_lord_of_rogues', 'hammer', 1, 'multiply'),
    ('waryn_lord_of_rogues', 'key', 2, 'multiply'),
    ('waryn_lord_of_rogues', 'magic', 3, 'division'),
    ('waryn_lord_of_rogues', 'monsterPoints', 1, 'multiply'),
    ('waryn_lord_of_rogues', 'vp', 1, 'multiply'),
    ('waybright_the_wise', 'citizenCount', 1, 'multiply'),
    ('waybright_the_wise', 'domainPoints', 1, 'multiply'),
    ('waybright_the_wise', 'fight', 4, 'division'),
    ('waybright_the_wise', 'gold', 4, 'division'),
    ('waybright_the_wise', 'holy', 2, 'multiply'),
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
  and (live.multiplier <> expected.multiplier or live.scoring_mode <> expected.scoring_mode);

insert into private.duke_score_rules (duke_slug, stat_key, multiplier, scoring_mode)
select
  expected.duke_slug,
  expected.stat_key,
  expected.multiplier,
  expected.scoring_mode
from tmp_expected_rules expected
left join private.duke_score_rules live
  on live.duke_slug = expected.duke_slug
 and live.stat_key = expected.stat_key
where live.duke_slug is null;

delete from private.duke_score_rules live
where not exists (
  select 1
  from tmp_expected_rules expected
  where expected.duke_slug = live.duke_slug
    and expected.stat_key = live.stat_key
);

alter table public.session_scores disable trigger refresh_public_analytics_on_session_scores_update;

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
  where ss.duke_slug is not null
    and btrim(ss.duke_slug) <> ''
    and ss.duke_slug <> 'no-duke-selected'
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

select json_build_object(
  'synced_rule_rows', (select count(*) from tmp_expected_rules),
  'score_rows_updated', (select count(*) from tmp_changed_scores),
  'locked_score_rows_updated', (select count(*) from tmp_changed_scores where game_locked),
  'unlocked_score_rows_updated', (select count(*) from tmp_changed_scores where not game_locked),
  'affected_locked_sessions', (select count(*) from tmp_affected_locked_sessions),
  'updated_score_rows', coalesce((
    select json_agg(json_build_object(
      'id', id,
      'session_id', session_id,
      'game_locked', game_locked,
      'new_total', recalculated_total
    ) order by game_locked desc, session_id, id)
    from tmp_changed_scores
  ), '[]'::json)
) as summary;

commit;
