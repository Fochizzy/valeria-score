import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const migrationsDir = path.resolve('supabase', 'migrations')

function readMigrationFiles() {
  return fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => fs.readFileSync(path.join(migrationsDir, name), 'utf8'))
}

test('a migration hardens public.set_updated_at with an explicit search_path', () => {
  const matchingMigration = readMigrationFiles().find((content) => {
    return (
      content.includes('create or replace function public.set_updated_at()') &&
      content.includes("set search_path = ''")
    )
  })

  assert.ok(
    matchingMigration,
    'Expected a migration that recreates public.set_updated_at() with set search_path = \'\''
  )
})
