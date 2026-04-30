import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const migrationsDir = path.resolve('supabase', 'migrations')

function readMigrationFiles() {
  return fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => ({
      name,
      content: fs.readFileSync(path.join(migrationsDir, name), 'utf8'),
    }))
}

test('session_scores rankings are introduced by a migration', () => {
  const migration = readMigrationFiles().find(({ content }) => {
    return (
      content.includes('alter table public.session_scores') &&
      content.includes('add column if not exists placement integer') &&
      content.includes('add column if not exists is_winner boolean')
    )
  })

  assert.ok(
    migration,
    'Expected a migration that adds placement and is_winner columns to public.session_scores'
  )
})

test('session_scores ranking migration backfills locked rows with placement and winner data', () => {
  const migration = readMigrationFiles().find(({ content }) => {
    return (
      content.includes('add column if not exists placement integer') &&
      content.includes('add column if not exists is_winner boolean')
    )
  })

  assert.ok(migration, 'Expected a ranking column migration to exist')
  assert.match(migration.content, /rank\(\) over \(/)
  assert.match(migration.content, /partition by ss\.session_id/i)
  assert.match(migration.content, /placement = ranked_scores\.next_placement/i)
  assert.match(migration.content, /is_winner = ranked_scores\.next_placement = 1/i)
})
