const fs = require('fs')
const path = require('path')
const process = require('node:process')
const test = require('node:test')
const assert = require('node:assert/strict')

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')

function resolveMigrationPath() {
  assert.ok(
    fs.existsSync(migrationsDir),
    `Expected Supabase migrations directory at ${migrationsDir}`
  )

  const matches = fs
    .readdirSync(migrationsDir)
    .filter((name) => /allow_session_creators_to_remove_added_player.*\.sql$/i.test(name))
    .sort()

  assert.ok(
    matches.length > 0,
    'Expected a migration that lets session creators remove added-player guest seats.'
  )

  return path.join(migrationsDir, matches[matches.length - 1])
}

function readMigration() {
  return fs.readFileSync(resolveMigrationPath(), 'utf8')
}

test('session creator added-player removal migration adds a delete policy for host-owned added-player seats', () => {
  const migration = readMigration()

  assert.match(
    migration,
    /create policy session_scores_delete_session_creator_added_player_scores/i
  )
  assert.match(migration, /for delete/i)
  assert.match(migration, /guest_entry_id is null/i)
  assert.match(migration, /guest_profile_id is null/i)
  assert.match(migration, /player_name is not null/i)
  assert.match(
    migration,
    /scored_by_user_id is distinct from owner_user_id/i
  )
  assert.match(
    migration,
    /where gs\.id = session_scores\.session_id[\s\S]*and gs\.created_by = \(select auth\.uid\(\)\)/i
  )
})
