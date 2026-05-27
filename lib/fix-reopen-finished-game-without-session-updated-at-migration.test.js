import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const migration = readFileSync(
  new URL(
    '../supabase/migrations/20260525240000_fix_reopen_finished_game_without_session_updated_at.sql',
    import.meta.url
  ),
  'utf8'
)

test('reopen finished game hotfix keeps the score revision bump', () => {
  assert.match(
    migration,
    /update public\.game_sessions\s+set score_revision = score_revision \+ 1/i
  )
})

test('reopen finished game hotfix no longer touches a missing game_sessions updated_at column', () => {
  assert.doesNotMatch(
    migration,
    /update public\.game_sessions\s+set[\s\S]*updated_at = now\(\)\s+where id = p_session_id;/i
  )
})
