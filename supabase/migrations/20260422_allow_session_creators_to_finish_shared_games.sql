drop policy if exists session_scores_update_session_creator on public.session_scores;

create policy session_scores_update_session_creator
on public.session_scores
for update
to authenticated
using (
  exists (
    select 1
    from public.game_sessions gs
    where gs.id = session_scores.session_id
      and gs.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.game_sessions gs
    where gs.id = session_scores.session_id
      and gs.created_by = auth.uid()
  )
);
