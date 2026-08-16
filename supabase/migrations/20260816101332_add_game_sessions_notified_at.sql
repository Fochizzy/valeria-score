-- Stamp for the notify-game-finished edge function: the first finish claims
-- notified_at atomically, so repeat invocations (or a participant hitting the
-- endpoint directly) can never re-push to the table.
alter table public.game_sessions
  add column if not exists notified_at timestamptz;
