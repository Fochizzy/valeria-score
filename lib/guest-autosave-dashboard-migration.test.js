const fs = require('fs')
const path = require('path')
const process = require('node:process')
const test = require('node:test')
const assert = require('node:assert/strict')

function readMigration() {
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
  const migrationName = fs
    .readdirSync(migrationsDir)
    .find((entry) => entry.endsWith('_guest_score_drafts_and_shared_guest_cards.sql'))
  const migrationPath = migrationName ? path.join(migrationsDir, migrationName) : ''

  assert.ok(
    migrationPath && fs.existsSync(migrationPath),
    `Expected guest autosave migration in ${migrationsDir}`
  )

  return fs.readFileSync(migrationPath, 'utf8')
}

test('guest autosave migration adds draft columns and guest-card badge fields', () => {
  const migration = readMigration()

  assert.match(migration, /add column if not exists draft_duke_slug text/i)
  assert.match(migration, /add column if not exists draft_inputs jsonb/i)
  assert.match(migration, /add column if not exists draft_score_total integer/i)
  assert.match(migration, /add column if not exists draft_updated_at timestamptz/i)
  assert.match(migration, /'inProgressCount'/i)
  assert.match(migration, /'lastDraftUpdatedAt'/i)
})

test('guest autosave migration widens guest-card access without exposing draft details', () => {
  const migration = readMigration()

  assert.match(migration, /viewer_sessions/i)
  assert.match(migration, /accessible_guest_ids/i)
  assert.match(migration, /draft_updated_at is not null/i)
  assert.match(migration, /'inProgressCount', coalesce/i)
  assert.doesNotMatch(migration, /'draftDuke'/i)
  assert.doesNotMatch(migration, /'draftScoreTotal'/i)
})
