const fs = require('fs')
const path = require('path')
const process = require('node:process')
const test = require('node:test')
const assert = require('node:assert/strict')

const migrationPath = path.join(
  process.cwd(),
  'supabase',
  'migrations',
  '20260422170000_add_player_stats_rate_metrics.sql'
)

function readMigration() {
  assert.ok(
    fs.existsSync(migrationPath),
    `Expected player stats rate migration at ${migrationPath}`
  )

  return fs.readFileSync(migrationPath, 'utf8')
}

test('player stats rate migration adds podium and rate columns to the player analytics tables', () => {
  const migration = readMigration()

  for (const tableName of [
    'player_global_stats',
    'player_global_stats_30d',
    'player_duke_stats',
    'player_duke_stats_30d',
  ]) {
    assert.match(
      migration,
      new RegExp(
        `alter table public\\.${tableName}[\\s\\S]*podiums integer not null default 0`,
        'i'
      )
    )
    assert.match(
      migration,
      new RegExp(
        `alter table public\\.${tableName}[\\s\\S]*win_rate numeric\\(10, 2\\) not null default 0`,
        'i'
      )
    )
    assert.match(
      migration,
      new RegExp(
        `alter table public\\.${tableName}[\\s\\S]*podium_rate numeric\\(10, 2\\) not null default 0`,
        'i'
      )
    )
    assert.match(
      migration,
      new RegExp(
        `alter table public\\.${tableName}[\\s\\S]*avg_finish_percentile numeric\\(10, 2\\) not null default 0`,
        'i'
      )
    )
  }
})

test('player stats rate migration rebuilds player analytics with normalized finish and rate formulas', () => {
  const migration = readMigration()

  assert.match(
    migration,
    /truncate table[\s\S]*public\.player_duke_stats_30d[\s\S]*public\.player_duke_stats[\s\S]*public\.player_global_stats_30d[\s\S]*public\.player_global_stats[\s\S]*public\.duke_global_stats/i
  )
  assert.doesNotMatch(migration, /delete from public\.player_duke_stats_30d;/i)
  assert.doesNotMatch(migration, /delete from public\.player_duke_stats;/i)
  assert.doesNotMatch(migration, /delete from public\.player_global_stats_30d;/i)
  assert.doesNotMatch(migration, /delete from public\.player_global_stats;/i)
  assert.doesNotMatch(migration, /delete from public\.duke_global_stats;/i)
  assert.doesNotMatch(migration, /coalesce\(ss\.placement,\s*rank\(\)\s+over/i)
  assert.doesNotMatch(migration, /coalesce\(ss\.is_winner,\s*coalesce\(ss\.placement,\s*rank\(\)\s+over/i)
  assert.match(migration, /as finish_percentile/i)
  assert.match(migration, /when rs\.player_count <= 1 then 100::numeric/i)
  assert.match(migration, /count\(\*\) filter \(where ar\.placement <= 3\)::int as podiums/i)
  assert.match(migration, /round\(avg\(ar\.finish_percentile\), 2\) as avg_finish_percentile/i)
  assert.match(migration, /as win_rate/i)
  assert.match(migration, /as podium_rate/i)
  assert.match(migration, /select private\.rebuild_public_analytics\(\);/i)
})
