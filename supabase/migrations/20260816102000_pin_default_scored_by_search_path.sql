-- Security advisor: session_scores_default_scored_by had a role-mutable
-- search_path, unlike every other function in the project. Its body only
-- touches NEW.* so pinning is behavior-neutral.
alter function public.session_scores_default_scored_by() set search_path = '';
