const fs = require('fs')
const path = require('path')
const process = require('node:process')
const test = require('node:test')
const assert = require('node:assert/strict')

const migrationPath = path.join(
  process.cwd(),
  'supabase',
  'migrations',
  '20260422130500_secure_analytics_rollups.sql'
)

function readMigration() {
  assert.ok(
    fs.existsSync(migrationPath),
    `Expected analytics security migration at ${migrationPath}`
  )

  return fs.readFileSync(migrationPath, 'utf8')
}

test('creates RLS-backed analytics tables instead of recreating public views', () => {
  const migration = readMigration()

  assert.match(migration, /drop view if exists public\.session_score_results/i)
  assert.match(migration, /drop view if exists public\.player_stats_base/i)
  assert.match(migration, /create table public\.player_global_stats\b/i)
  assert.match(migration, /create table public\.player_global_stats_30d\b/i)
  assert.match(migration, /create table public\.player_duke_stats\b/i)
  assert.match(migration, /create table public\.player_duke_stats_30d\b/i)
  assert.match(migration, /create table public\.duke_global_stats\b/i)
  assert.doesNotMatch(migration, /create(?:\s+or\s+replace)?\s+view public\.session_score_results/i)
  assert.doesNotMatch(migration, /create(?:\s+or\s+replace)?\s+view public\.player_stats_base/i)
  assert.doesNotMatch(migration, /create(?:\s+or\s+replace)?\s+view public\.player_global_stats\b/i)
})

test('enables RLS and authenticated read access on the public analytics tables', () => {
  const migration = readMigration()

  for (const tableName of [
    'player_global_stats',
    'player_global_stats_30d',
    'player_duke_stats',
    'player_duke_stats_30d',
    'duke_global_stats',
  ]) {
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

test('uses a private definer refresh function and rewrites the profile dashboard rpc away from player_stats_base', () => {
  const migration = readMigration()

  assert.match(migration, /create schema if not exists private/i)
  assert.match(migration, /create(?:\s+or\s+replace)?\s+function private\.rebuild_public_analytics\(\)/i)
  assert.match(migration, /security definer/i)
  assert.match(migration, /set search_path = ''/i)
  assert.match(migration, /create(?:\s+or\s+replace)?\s+function public\.get_profile_dashboard\(\)/i)
  assert.match(migration, /from public\.session_scores/i)
  assert.doesNotMatch(migration, /from public\.player_stats_base/i)
})
