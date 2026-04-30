-- Auto-cleanup orphan score rows when a user account is deleted.
--
-- Today, session_scores.owner_user_id is just a uuid column with no FK to
-- profiles. When a user account is deleted (which cascades to profiles via
-- profiles.id = auth.users.id), their session_scores rows are left behind
-- as orphans pointing at a non-existent profile. We saw this play out
-- after deleting test users — score rows had to be cleaned up by hand.
--
-- This migration adds the missing FK with ON DELETE CASCADE so future
-- account deletions automatically remove the user's score rows. The
-- analytics rollups already aggregate by owner_user_id, so they'll
-- re-compute correctly on the next trigger pass.
--
-- Pre-condition: there are no orphan rows. We just deleted the one we
-- found, so the constraint will validate cleanly.

alter table public.session_scores
  add constraint session_scores_owner_user_id_fkey
  foreign key (owner_user_id)
  references public.profiles(id)
  on delete cascade;
