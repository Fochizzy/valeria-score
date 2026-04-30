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
    .filter((name) => /compare_expected_player_count\.sql$/i.test(name))
    .sort()

  assert.ok(matches.length > 0, 'Expected a migration for compare expected player count')

  return path.join(migrationsDir, matches[matches.length - 1])
}

function readMigration() {
  return fs.readFileSync(resolveMigrationPath(), 'utf8')
}

test('compare expected player count migration stores a session-level target', () => {
  const migration = readMigration()

  assert.match(
    migration,
    /alter table public\.game_sessions\s+add column if not exists expected_player_count integer not null default 1/i
  )
  assert.match(
    migration,
    /set expected_player_count = greatest\(/i
  )
  assert.match(
    migration,
    /coalesce\(sp\.player_count,\s*0\)/i
  )
  assert.match(
    migration,
    /coalesce\(ss\.score_count,\s*0\)/i
  )
})

test('compare expected player count migration blocks finish_game until the table target is ready', () => {
  const migration = readMigration()

  assert.match(
    migration,
    /create\s+or\s+replace\s+function public\.finish_game\(p_session_id uuid\)/i
  )
  assert.match(
    migration,
    /expected_player_count/i
  )
  assert.match(
    migration,
    /ready_score_count/i
  )
  assert.match(
    migration,
    /where ss\.session_id = p_session_id[\s\S]*and \(coalesce\(ss\.game_locked,\s*false\) or ss\.duke_slug is not null\)/i
  )
  assert.match(
    migration,
    /raise exception 'Every player must save a score before finishing the game\.'/i
  )
})
