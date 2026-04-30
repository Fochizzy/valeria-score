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
    .filter((name) => /allow_session_creators_to_remove_guest_scores\.sql$/i.test(name))
    .sort()

  assert.ok(
    matches.length > 0,
    'Expected a migration that lets session creators remove guest score rows.'
  )

  return path.join(migrationsDir, matches[matches.length - 1])
}

function readMigration() {
  return fs.readFileSync(resolveMigrationPath(), 'utf8')
}

test('session creator guest removal migration adds a guest-only delete policy for hosts', () => {
  const migration = readMigration()

  assert.match(
    migration,
    /create policy session_scores_delete_session_creator_guest_scores/i
  )
  assert.match(migration, /for delete/i)
  assert.match(migration, /guest_entry_id is not null/i)
  assert.match(
    migration,
    /where gs\.id = session_scores\.session_id[\s\S]*and gs\.created_by = \(select auth\.uid\(\)\)/i
  )
})
