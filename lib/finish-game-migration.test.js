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
    .filter((name) => /finish_game_requires_saved_participants\.sql$/i.test(name))
    .sort()

  assert.ok(matches.length > 0, 'Expected a migration that hardens finish_game readiness checks')

  return path.join(migrationsDir, matches[matches.length - 1])
}

function readMigration() {
  return fs.readFileSync(resolveMigrationPath(), 'utf8')
}

test('finish_game hardening migration counts session members and guest seats before allowing finish', () => {
  const migration = readMigration()

  assert.match(
    migration,
    /create\s+or\s+replace\s+function public\.finish_game\(p_session_id uuid\)/i
  )
  assert.match(
    migration,
    /count\(\*\)::int as participant_count[\s\S]*from public\.session_players sp[\s\S]*where sp\.session_id = p_session_id/i
  )
  assert.match(
    migration,
    /count\(\*\)::int as participant_count[\s\S]*from public\.session_scores ss[\s\S]*where ss\.session_id = p_session_id[\s\S]*and\s*\([\s\S]*ss\.guest_profile_id is not null[\s\S]*or ss\.guest_entry_id is not null[\s\S]*or ss\.player_name is not null[\s\S]*\)/i
  )
  assert.match(
    migration,
    /required_score_count := greatest\([\s\S]*expected_player_count[\s\S]*session_player_count[\s\S]*guest_entry_count[\s\S]*1[\s\S]*\)/i
  )
  assert.match(
    migration,
    /where ss\.session_id = p_session_id[\s\S]*and ss\.duke_slug is not null/i
  )
})
