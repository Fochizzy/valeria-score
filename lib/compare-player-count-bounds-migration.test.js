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
    .filter((name) => /compare_player_count_bounds\.sql$/i.test(name))
    .sort()

  assert.ok(matches.length > 0, 'Expected a migration that clamps compare player counts to 2 through 5')

  return path.join(migrationsDir, matches[matches.length - 1])
}

function readMigration() {
  return fs.readFileSync(resolveMigrationPath(), 'utf8')
}

test('compare player count bounds migration clamps expected player counts to 2 through 5', () => {
  const migration = readMigration()

  assert.match(
    migration,
    /alter table public\.game_sessions[\s\S]*alter column expected_player_count set default 2/i
  )
  assert.match(
    migration,
    /update public\.game_sessions[\s\S]*set expected_player_count = least\(\s*5,\s*greatest\(\s*2,\s*coalesce\(expected_player_count,\s*2\)\s*\)\s*\)/i
  )
  assert.match(
    migration,
    /add constraint game_sessions_expected_player_count_between_2_and_5[\s\S]*check\s*\(\s*expected_player_count >= 2 and expected_player_count <= 5\s*\)/i
  )
})

test('compare player count bounds migration hardens finish_game to require between 2 and 5 expected players', () => {
  const migration = readMigration()

  assert.match(
    migration,
    /create\s+or\s+replace\s+function public\.finish_game\(p_session_id uuid\)/i
  )
  assert.match(
    migration,
    /least\(\s*5,\s*greatest\(\s*2,\s*coalesce\(expected_player_count,\s*2\)\s*\)\s*\)/i
  )
  assert.match(
    migration,
    /required_score_count := greatest\([\s\S]*session_player_count[\s\S]*guest_entry_count[\s\S]*2[\s\S]*\)/i
  )
})
