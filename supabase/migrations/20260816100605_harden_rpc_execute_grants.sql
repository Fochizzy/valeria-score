-- Security advisor: several SECURITY DEFINER functions were executable by
-- the anon role (functions default to EXECUTE for PUBLIC on creation). Every
-- one already rejects unauthenticated callers via auth.uid() checks, so this
-- is defense-in-depth: anon now gets a permission error instead of reaching
-- the function body. authenticated keeps EXECUTE — the app calls these RPCs
-- as signed-in users, and is_session_member runs inside RLS policies.
revoke execute on function public.delete_game(uuid) from public, anon;
grant execute on function public.delete_game(uuid) to authenticated, service_role;

revoke execute on function public.delete_guest_profile(uuid) from public, anon;
grant execute on function public.delete_guest_profile(uuid) to authenticated, service_role;

revoke execute on function public.delete_my_profile() from public, anon;
grant execute on function public.delete_my_profile() to authenticated, service_role;

revoke execute on function public.is_session_member(uuid) from public, anon;
grant execute on function public.is_session_member(uuid) to authenticated, service_role;

revoke execute on function public.leave_game(uuid) from public, anon;
grant execute on function public.leave_game(uuid) to authenticated, service_role;

revoke execute on function public.leave_all_games() from public, anon;
grant execute on function public.leave_all_games() to authenticated, service_role;

revoke execute on function public.session_players_handover_to_self() from public, anon;
grant execute on function public.session_players_handover_to_self() to authenticated, service_role;

-- Pure auth.users trigger: nothing should call it over the API at all.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
