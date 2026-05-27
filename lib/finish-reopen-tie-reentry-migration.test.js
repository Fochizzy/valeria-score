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
    .filter((name) => /finish_reopen_tie_reentry\.sql$/i.test(name))
    .sort()

  assert.ok(
    matches.length > 0,
    'Expected a migration that adds reopen and tie re-entry support'
  )

  return path.join(migrationsDir, matches[matches.length - 1])
}

function readMigration() {
  return fs.readFileSync(resolveMigrationPath(), 'utf8')
}

test('finish reopen tie re-entry migration adds session and score revision fields', () => {
  const migration = readMigration()

  assert.match(migration, /add column if not exists score_revision integer not null default 1/i)
  assert.match(migration, /add column if not exists confirmed_revision integer not null default 0/i)
  assert.match(
    migration,
    /update public\.session_scores[\s\S]*set confirmed_revision = 1[\s\S]*where[\s\S]*coalesce\(game_locked,\s*false\)[\s\S]*duke_slug is not null/i
  )
})

test('finish reopen tie re-entry migration hardens finish_game around the current revision', () => {
  const migration = readMigration()

  assert.match(
    migration,
    /create\s+or\s+replace\s+function public\.finish_game\(p_session_id uuid\)/i
  )
  assert.match(migration, /select[\s\S]*score_revision[\s\S]*into[\s\S]*session_score_revision/i)
  assert.match(
    migration,
    /where ss\.session_id = p_session_id[\s\S]*ss\.duke_slug is not null[\s\S]*coalesce\(ss\.confirmed_revision,\s*0\)\s*=\s*session_score_revision/i
  )
})

test('finish reopen tie re-entry migration adds tie-aware finish and reopen rpcs', () => {
  const migration = readMigration()

  assert.match(
    migration,
    /create\s+or\s+replace\s+function public\.finish_game_with_tiebreak\([\s\S]*p_session_id uuid[\s\S]*p_tiebreak_score_ids uuid\[\][\s\S]*\)/i
  )
  assert.match(migration, /submitted ids must match the current tied top scorers|current tied top scorers/i)
  assert.match(
    migration,
    /create\s+or\s+replace\s+function public\.reopen_finished_game\(p_session_id uuid\)/i
  )
  assert.match(migration, /update public\.game_sessions[\s\S]*score_revision = score_revision \+ 1/i)
  assert.match(migration, /placement = null/i)
  assert.match(migration, /is_winner = null/i)
  assert.match(migration, /included_in_stats = false/i)
  assert.match(migration, /game_locked = false/i)
})
