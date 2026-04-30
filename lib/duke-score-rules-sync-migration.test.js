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
    .filter((name) => /sync_duke_score_rules_to_cards\.sql$/i.test(name))
    .sort()

  assert.ok(
    matches.length > 0,
    'Expected a Supabase migration that syncs duke score rules to the app cards'
  )

  return path.join(migrationsDir, matches[matches.length - 1])
}

function readMigration() {
  return fs.readFileSync(resolveMigrationPath(), 'utf8')
}

test('sync migration updates duke score rules from app-backed values and rebuilds analytics', () => {
  const migration = readMigration()

  assert.match(migration, /insert into tmp_expected_rules/i)
  assert.match(migration, /update private\.duke_score_rules/i)
  assert.match(migration, /insert into private\.duke_score_rules/i)
  assert.match(migration, /delete from private\.duke_score_rules/i)
  assert.match(migration, /select private\.rebuild_public_analytics\(\)/i)
})

test('sync migration recalculates session score totals before refreshing analytics', () => {
  const migration = readMigration()

  assert.match(migration, /create temp table tmp_changed_scores/i)
  assert.match(migration, /update public\.session_scores ss\s+set score_total = changed\.recalculated_total/i)
  assert.match(migration, /alter table public\.session_scores disable trigger refresh_public_analytics_on_session_scores_update/i)
  assert.match(migration, /alter table public\.session_scores enable trigger refresh_public_analytics_on_session_scores_update/i)
})
