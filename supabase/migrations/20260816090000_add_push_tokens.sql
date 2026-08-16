-- Expo push tokens, one row per device token. The token is the primary key
-- so a device that changes hands (logout/login) simply re-binds to the new
-- user on its next registration.
create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null default 'android'
    check (platform in ('android', 'ios')),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists push_tokens_user_idx
  on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

drop policy if exists push_tokens_select_own
  on public.push_tokens;
drop policy if exists push_tokens_insert_own
  on public.push_tokens;
drop policy if exists push_tokens_update_own
  on public.push_tokens;
drop policy if exists push_tokens_delete_own
  on public.push_tokens;

create policy push_tokens_select_own
on public.push_tokens
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy push_tokens_insert_own
on public.push_tokens
for insert
to authenticated
with check ((select auth.uid()) = user_id);

-- Updating a row also lets a signed-in device claim a token it registered
-- under a previous account on the same device.
create policy push_tokens_update_own
on public.push_tokens
for update
to authenticated
using (true)
with check ((select auth.uid()) = user_id);

create policy push_tokens_delete_own
on public.push_tokens
for delete
to authenticated
using ((select auth.uid()) = user_id);
