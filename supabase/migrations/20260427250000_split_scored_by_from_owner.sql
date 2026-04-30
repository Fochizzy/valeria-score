-- Phase 1 of the "any player can add any guest or player profile" feature.
--
-- Splits the two responsibilities currently overloaded onto session_scores.owner_user_id:
--   * owner_user_id    — the player whose stats this score counts toward
--   * scored_by_user_id — the editor who can update / delete this row
--
-- Today they're always equal (you score your own row). Going forward, when
-- player A adds player B's profile to a game and scores it on B's behalf,
-- the row will have owner_user_id = B and scored_by_user_id = A.
--
-- Safe to apply now:
--   * scored_by_user_id is backfilled to owner_user_id, so existing rows are
--     unchanged in behaviour.
--   * A BEFORE INSERT/UPDATE trigger auto-fills scored_by_user_id from
--     owner_user_id when the client doesn't set it, so the existing app
--     keeps working with no client changes (Phase 1 deliberately doesn't
--     touch lib/scores.ts).
--   * RLS policies for INSERT / UPDATE / DELETE move from owner_user_id =
--     auth.uid() to scored_by_user_id = auth.uid(), preserving the existing
--     session-creator override on UPDATE. SELECT is unchanged.

alter table public.session_scores
  add column if not exists scored_by_user_id uuid
    references public.profiles(id) on delete set null;

update public.session_scores
set scored_by_user_id = owner_user_id
where scored_by_user_id is null
  and owner_user_id is not null;

-- We don't make scored_by_user_id NOT NULL yet — guest-only rows historically
-- have owner_user_id = the host who added the guest, but we want to keep the
-- nullable shape consistent with owner_user_id so neither column is harder
-- to nullify than the other. The trigger below + the RLS policies require
-- it on insert anyway.

create index if not exists session_scores_scored_by_user_id_idx
  on public.session_scores (scored_by_user_id);

-- Default scored_by_user_id from owner_user_id so any client path that
-- doesn't yet set it (every path today) keeps inserting valid rows.
create or replace function public.session_scores_default_scored_by()
returns trigger
language plpgsql
as $$
begin
  if new.scored_by_user_id is null then
    new.scored_by_user_id := new.owner_user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists session_scores_default_scored_by_insert on public.session_scores;
create trigger session_scores_default_scored_by_insert
  before insert on public.session_scores
  for each row
  execute function public.session_scores_default_scored_by();

drop trigger if exists session_scores_default_scored_by_update on public.session_scores;
create trigger session_scores_default_scored_by_update
  before update on public.session_scores
  for each row
  when (new.scored_by_user_id is null)
  execute function public.session_scores_default_scored_by();

-- ---------- RLS flip ----------
-- Drop the old owner-keyed policies and recreate against scored_by_user_id.
-- SELECT (session_scores_select_session_members) stays as-is — anyone in the
-- session can still read.

drop policy if exists session_scores_insert_own on public.session_scores;
drop policy if exists session_scores_update_session_creator on public.session_scores;
drop policy if exists session_scores_delete_own on public.session_scores;

create policy session_scores_insert_scored_by
  on public.session_scores
  for insert
  to authenticated
  with check ((select auth.uid()) = scored_by_user_id);

create policy session_scores_update_scored_by_or_creator
  on public.session_scores
  for update
  to authenticated
  using (
    (select auth.uid()) = scored_by_user_id
    or exists (
      select 1
      from public.game_sessions gs
      where gs.id = session_scores.session_id
        and gs.created_by = (select auth.uid())
    )
  )
  with check (
    (select auth.uid()) = scored_by_user_id
    or exists (
      select 1
      from public.game_sessions gs
      where gs.id = session_scores.session_id
        and gs.created_by = (select auth.uid())
    )
  );

create policy session_scores_delete_scored_by
  on public.session_scores
  for delete
  to authenticated
  using ((select auth.uid()) = scored_by_user_id);
