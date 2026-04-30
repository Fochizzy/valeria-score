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
    .filter((name) => /fix_duke_input_refresh_update_scope\.sql$/i.test(name))
    .sort()

  assert.ok(
    matches.length > 0,
    'Expected a Supabase migration that fixes duke input refresh update scope'
  )

  return path.join(migrationsDir, matches[matches.length - 1])
}

function readMigration() {
  return fs.readFileSync(resolveMigrationPath(), 'utf8')
}

test('scopes duke_global_stats teaser refresh updates by duke_slug', () => {
  const migration = readMigration()

  assert.doesNotMatch(
    migration,
    /update public\.duke_global_stats\s+set\s+top_input_stat_key = null/i
  )
  assert.match(migration, /ranked_teasers as \(/i)
  assert.match(
    migration,
    /update public\.duke_global_stats dgs\s+set[\s\S]*top_input_stat_key = ranked_teasers\.top_input_stat_key[\s\S]*where dgs\.duke_slug = ranked_teasers\.duke_slug/i
  )
})
