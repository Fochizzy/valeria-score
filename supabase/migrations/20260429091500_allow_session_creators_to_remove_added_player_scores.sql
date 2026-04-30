drop policy if exists session_scores_delete_session_creator_added_player_scores on public.session_scores;

create policy session_scores_delete_session_creator_added_player_scores
on public.session_scores
for delete
to authenticated
using (
  guest_entry_id is null
  and guest_profile_id is null
  and player_name is not null
  and scored_by_user_id is distinct from owner_user_id
  and exists (
    select 1
    from public.game_sessions gs
    where gs.id = session_scores.session_id
      and gs.created_by = (select auth.uid())
  )
);
