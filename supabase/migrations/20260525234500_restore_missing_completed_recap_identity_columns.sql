alter table public.session_scores
  add column if not exists recap_player_name text;

alter table public.session_scores
  add column if not exists recap_player_id text;

with recap_identity as (
  select
    ss.id,
    case
      when ss.guest_profile_id is null
        and ss.guest_entry_id is null
        and ss.player_name is null
      then coalesce(
        nullif(btrim(p.display_name), ''),
        nullif(upper(btrim(p.public_player_id)), ''),
        'Player'
      )
      else coalesce(
        nullif(btrim(ss.player_name), ''),
        nullif(btrim(gp.display_name), ''),
        nullif(upper(btrim(gp.public_player_id)), ''),
        'Guest Player'
      )
    end as next_recap_player_name,
    case
      when ss.guest_profile_id is null
        and ss.guest_entry_id is null
        and ss.player_name is null
      then nullif(upper(btrim(p.public_player_id)), '')
      else nullif(upper(btrim(gp.public_player_id)), '')
    end as next_recap_player_id
  from public.session_scores ss
  left join public.profiles p
    on p.id = ss.owner_user_id
   and ss.guest_profile_id is null
   and ss.guest_entry_id is null
   and ss.player_name is null
  left join public.guest_profiles gp
    on gp.id = ss.guest_profile_id
  where coalesce(ss.game_locked, false)
)
update public.session_scores ss
set
  recap_player_name = recap_identity.next_recap_player_name,
  recap_player_id = recap_identity.next_recap_player_id
from recap_identity
where ss.id = recap_identity.id
  and (
    ss.recap_player_name is null
    or btrim(ss.recap_player_name) = ''
    or ss.recap_player_id is null
  );
