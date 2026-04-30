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
    .filter((name) => /duke_input_analytics\.sql$/i.test(name))
    .sort()

  assert.ok(
    matches.length > 0,
    'Expected a Supabase migration for duke input analytics'
  )

  return path.join(migrationsDir, matches[matches.length - 1])
}

function readMigration() {
  return fs.readFileSync(resolveMigrationPath(), 'utf8')
}

test('creates duke input analytics storage and teaser columns', () => {
  const migration = readMigration()

  assert.match(migration, /create table if not exists private\.duke_score_rules\b/i)
  assert.match(migration, /create table if not exists public\.duke_input_stat_profiles\b/i)

  for (const columnName of [
    'top_input_stat_key',
    'top_input_points_share',
    'winning_edge_stat_key',
    'winning_edge_share_delta',
  ]) {
    assert.match(
      migration,
      new RegExp(
        `alter table public\\.duke_global_stats\\s+add column if not exists ${columnName}\\b`,
        'i'
      )
    )
  }
})

test('expands saved score inputs and rebuilds duke profiles from the analytics refresh function', () => {
  const migration = readMigration()

  assert.match(
    migration,
    /create(?:\s+or\s+replace)?\s+function private\.rebuild_public_analytics\(\)/i
  )
  assert.match(migration, /truncate table public\.duke_input_stat_profiles/i)
  assert.doesNotMatch(migration, /delete from public\.duke_input_stat_profiles/i)
  assert.doesNotMatch(migration, /coalesce\(ss\.is_winner,\s*coalesce\(ss\.placement,\s*rank\(\)\s+over/i)
  assert.match(migration, /jsonb_each/i)
  assert.match(migration, /profile_scope/i)
  assert.match(migration, /all_games/i)
  assert.match(migration, /winning_games/i)
  assert.match(migration, /share_delta_vs_global/i)
  assert.match(migration, /insert into public\.duke_input_stat_profiles/i)
})

test('protects duke input profiles with RLS and authenticated read access', () => {
  const migration = readMigration()

  assert.match(
    migration,
    /alter table public\.duke_input_stat_profiles enable row level security/i
  )
  assert.match(
    migration,
    /create policy duke_input_stat_profiles_select_authenticated/i
  )
  assert.match(
    migration,
    /grant select on public\.duke_input_stat_profiles to authenticated, service_role/i
  )
})
