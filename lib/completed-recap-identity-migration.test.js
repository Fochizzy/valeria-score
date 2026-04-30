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
    .filter((name) => /completed_recap_identity_and_leave_flows\.sql$/i.test(name))
    .sort()

  assert.ok(
    matches.length > 0,
    'Expected a migration that snapshots completed recap identity and adds leave flows'
  )

  return path.join(migrationsDir, matches[matches.length - 1])
}

function readMigration() {
  return fs.readFileSync(resolveMigrationPath(), 'utf8')
}

test('completed recap identity migration adds snapshot fields to session_scores', () => {
  const migration = readMigration()

  assert.match(migration, /add column if not exists recap_player_name text/i)
  assert.match(migration, /add column if not exists recap_player_id text/i)
  assert.match(migration, /update public\.session_scores ss[\s\S]*recap_player_name/i)
})

test('completed recap identity migration snapshots recap identity during finish_game', () => {
  const migration = readMigration()

  assert.match(
    migration,
    /create\s+or\s+replace\s+function public\.finish_game\(p_session_id uuid\)/i
  )
  assert.match(migration, /recap_player_name = ranked_scores\.next_recap_player_name/i)
  assert.match(migration, /recap_player_id = ranked_scores\.next_recap_player_id/i)
})

test('completed recap identity migration adds single-game and all-game leave flows that anonymize to Mx. Doe', () => {
  const migration = readMigration()

  assert.match(
    migration,
    /create\s+or\s+replace\s+function public\.leave_game\(p_session_id uuid\)/i
  )
  assert.match(
    migration,
    /create\s+or\s+replace\s+function public\.leave_all_games\(\)/i
  )
  assert.match(migration, /recap_player_name = 'Mx\. Doe'/i)
  assert.match(migration, /recap_player_id = 'Mx\. Doe'/i)
  assert.match(migration, /included_in_stats = false/i)
})
