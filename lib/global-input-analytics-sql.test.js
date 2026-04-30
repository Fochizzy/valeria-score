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
    .filter((name) => /global_scoring_family_analytics\.sql$/i.test(name))
    .sort()

  assert.ok(
    matches.length > 0,
    'Expected a Supabase migration for global scoring family analytics'
  )

  return path.join(migrationsDir, matches[matches.length - 1])
}

function readMigration() {
  return fs.readFileSync(resolveMigrationPath(), 'utf8')
}

test('creates overall input-profile and close-margin analytics tables', () => {
  const migration = readMigration()

  assert.match(
    migration,
    /create table if not exists public\.global_input_stat_profiles\b/i
  )
  assert.match(
    migration,
    /create table if not exists public\.global_game_margin_stats\b/i
  )
})

test('refreshes global scoring analytics from locked session scores inside the rebuild wrapper', () => {
  const migration = readMigration()

  assert.match(
    migration,
    /create(?:\s+or\s+replace)?\s+function private\.refresh_global_input_analytics\(\)/i
  )
  assert.match(migration, /insert into public\.global_input_stat_profiles/i)
  assert.match(migration, /insert into public\.global_game_margin_stats/i)
  assert.match(
    migration,
    /truncate table public\.duke_input_stat_profiles,\s*public\.global_input_stat_profiles,\s*public\.global_game_margin_stats/i
  )
  assert.match(migration, /perform private\.refresh_global_input_analytics\(\)/i)
  assert.match(migration, /top_score/i)
  assert.match(migration, /second_score/i)
  assert.match(migration, /margin_bucket/i)
})

test('protects the new global analytics tables with authenticated read access', () => {
  const migration = readMigration()

  for (const tableName of ['global_input_stat_profiles', 'global_game_margin_stats']) {
    assert.match(
      migration,
      new RegExp(`alter table public\\.${tableName} enable row level security`, 'i')
    )
    assert.match(
      migration,
      new RegExp(`create policy ${tableName}_select_authenticated`, 'i')
    )
    assert.match(
      migration,
      new RegExp(`grant select on public\\.${tableName} to authenticated, service_role`, 'i')
    )
  }
})
