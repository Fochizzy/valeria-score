-- The completeness audit found public.leave_all_games missing in production
-- even though the client's "Remove My History" flow (manage-data) calls it.
-- Restore it verbatim from 20260423001500_completed_recap_identity_and_leave_flows,
-- which defined it alongside leave_game (which did make it to production).
create or replace function public.leave_all_games()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'User not authenticated';
  end if;

  update public.session_scores ss
  set
    owner_user_id = null,
    player_name = null,
    recap_player_name = 'Mx. Doe',
    recap_player_id = 'Mx. Doe',
    included_in_stats = false,
    updated_at = now()
  where ss.owner_user_id = auth.uid()
    and ss.guest_profile_id is null
    and ss.guest_entry_id is null
    and ss.player_name is null
    and coalesce(ss.game_locked, false);

  delete from public.session_scores ss
  where ss.owner_user_id = auth.uid()
    and ss.guest_profile_id is null
    and ss.guest_entry_id is null
    and ss.player_name is null
    and not coalesce(ss.game_locked, false);

  delete from public.session_players
  where user_id = auth.uid();
end;
$$;
