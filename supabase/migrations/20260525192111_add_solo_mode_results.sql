create table if not exists public.solo_game_results (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null,
  player_duke_slug text not null,
  dark_lord_duke_slug text not null,
  victory_condition text not null
    check (
      victory_condition in (
        'slay_all_monsters',
        'monster_attacks_empty_column',
        'five_stacks_exhausted'
      )
    ),
  winner text not null
    check (winner in ('player', 'dark_lord')),
  resolution text not null
    check (resolution in ('player_auto', 'dark_lord_auto', 'contested')),
  player_total integer not null default 0 check (player_total >= 0),
  dark_lord_total integer not null default 0 check (dark_lord_total >= 0),
  player_inputs jsonb not null default '{}'::jsonb,
  dark_lord_inputs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists solo_game_results_owner_created_idx
  on public.solo_game_results (owner_user_id, created_at desc);

create index if not exists solo_game_results_player_duke_idx
  on public.solo_game_results (player_duke_slug);

create index if not exists solo_game_results_dark_lord_duke_idx
  on public.solo_game_results (dark_lord_duke_slug);

create index if not exists solo_game_results_victory_condition_idx
  on public.solo_game_results (victory_condition);

alter table public.solo_game_results enable row level security;

drop policy if exists solo_game_results_select_authenticated
  on public.solo_game_results;
drop policy if exists solo_game_results_insert_authenticated
  on public.solo_game_results;
drop policy if exists solo_game_results_update_authenticated
  on public.solo_game_results;
drop policy if exists solo_game_results_delete_authenticated
  on public.solo_game_results;

create policy solo_game_results_select_authenticated
on public.solo_game_results
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = owner_user_id);

create policy solo_game_results_insert_authenticated
on public.solo_game_results
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = owner_user_id);

create policy solo_game_results_update_authenticated
on public.solo_game_results
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = owner_user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = owner_user_id);

create policy solo_game_results_delete_authenticated
on public.solo_game_results
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = owner_user_id);

revoke all on public.solo_game_results from anon;
grant select, insert, update, delete on public.solo_game_results to authenticated, service_role;
