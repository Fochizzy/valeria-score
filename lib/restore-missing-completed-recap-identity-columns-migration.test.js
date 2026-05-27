import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const migration = readFileSync(
  new URL('../supabase/migrations/20260525234500_restore_missing_completed_recap_identity_columns.sql', import.meta.url),
  'utf8'
)

test('restore missing completed recap identity migration adds recap columns', () => {
  assert.match(
    migration,
    /alter table public\.session_scores\s+add column if not exists recap_player_name text;/i
  )
  assert.match(
    migration,
    /alter table public\.session_scores\s+add column if not exists recap_player_id text;/i
  )
})

test('restore missing completed recap identity migration backfills locked rows', () => {
  assert.match(migration, /where coalesce\(ss\.game_locked, false\)/i)
  assert.match(migration, /recap_player_name = recap_identity\.next_recap_player_name/i)
  assert.match(migration, /recap_player_id = recap_identity\.next_recap_player_id/i)
})
