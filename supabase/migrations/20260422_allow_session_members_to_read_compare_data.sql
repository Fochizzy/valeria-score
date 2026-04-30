drop policy if exists session_scores_select_session_members on public.session_scores;

create policy session_scores_select_session_members
on public.session_scores
for select
to authenticated
using (
  owner_user_id = auth.uid()
  or exists (
    select 1
    from public.session_players participant
    where participant.session_id = session_scores.session_id
      and participant.user_id = auth.uid()
  )
  or exists (
    select 1
    from public.game_sessions gs
    where gs.id = session_scores.session_id
      and gs.created_by = auth.uid()
  )
);

drop policy if exists profiles_select_shared_session_member on public.profiles;

create policy profiles_select_shared_session_member
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.session_players me
    join public.session_players peer
      on peer.session_id = me.session_id
    where me.user_id = auth.uid()
      and peer.user_id = profiles.id
  )
  or exists (
    select 1
    from public.game_sessions gs
    where gs.created_by = auth.uid()
      and exists (
        select 1
        from public.session_players peer
        where peer.session_id = gs.id
          and peer.user_id = profiles.id
      )
  )
);
