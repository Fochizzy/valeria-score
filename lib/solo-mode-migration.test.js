import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')

function loadSoloMigration() {
  const files = fs.readdirSync(migrationsDir)
  const match = files.find((name) => /_add_solo_mode_results\.sql$/i.test(name))
  assert.ok(match, 'Expected a migration that creates solo mode storage')
  return fs.readFileSync(path.join(migrationsDir, match), 'utf8')
}

test('solo mode migration creates a dedicated solo_game_results table with winner metadata', () => {
  const migration = loadSoloMigration()

  assert.match(migration, /create table if not exists public\.solo_game_results\b/i)
  assert.match(migration, /\bvictory_condition\b/i)
  assert.match(migration, /\bwinner\b/i)
  assert.match(migration, /\bplayer_inputs\b/i)
  assert.match(migration, /\bdark_lord_inputs\b/i)
})

test('solo mode migration enables rls and owner-scoped policies', () => {
  const migration = loadSoloMigration()

  assert.match(migration, /alter table public\.solo_game_results enable row level security;/i)
  assert.match(
    migration,
    /create policy[\s\S]*solo_game_results_select_authenticated[\s\S]*on public\.solo_game_results[\s\S]*for select[\s\S]*to authenticated/i
  )
  assert.match(
    migration,
    /create policy[\s\S]*solo_game_results_insert_authenticated[\s\S]*on public\.solo_game_results[\s\S]*for insert[\s\S]*with check[\s\S]*auth\.uid\(\)/i
  )
  assert.match(
    migration,
    /create policy[\s\S]*solo_game_results_update_authenticated[\s\S]*on public\.solo_game_results[\s\S]*for update[\s\S]*using[\s\S]*auth\.uid\(\)/i
  )
  assert.match(
    migration,
    /create policy[\s\S]*solo_game_results_delete_authenticated[\s\S]*on public\.solo_game_results[\s\S]*for delete[\s\S]*using[\s\S]*auth\.uid\(\)/i
  )
})
