const fs = require('fs')
const path = require('path')
const process = require('node:process')
const test = require('node:test')
const assert = require('node:assert/strict')

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')

// Anchored on the full basename. `/claim_guest_profile.*\.sql$/` also matches
// the two earlier definitions of this function, and picking the lexically
// largest of them only happens to land on the right file.
const MIGRATION_BASENAME =
  /^\d+_claim_guest_profile_allows_self_linked_conversion\.sql$/i

function readClaimGuestProfileMigration() {
  assert.ok(
    fs.existsSync(migrationsDir),
    `Expected Supabase migrations directory at ${migrationsDir}`
  )

  const matches = fs
    .readdirSync(migrationsDir)
    .filter((name) => MIGRATION_BASENAME.test(name))

  assert.equal(
    matches.length,
    1,
    `Expected exactly one migration matching ${MIGRATION_BASENAME}, found ${matches.length}: ${matches.join(', ')}`
  )

  return fs.readFileSync(path.join(migrationsDir, matches[0]), 'utf8')
}

test('claim guest profile migration converts both unlinked and self-linked guest rows', () => {
  assert.match(
    readClaimGuestProfileMigration(),
    /select \*\s+into v_guest\s+from public\.guest_profiles\s+where upper\(btrim\(public_player_id\)\) = v_normalized_public_player_id\s+and \(\s*linked_user_id is null\s+or linked_user_id = v_user_id\s*\)/i
  )
})

test('claim guest profile migration refuses to guess when a Player ID matches more than one guest', () => {
  const migration = readClaimGuestProfileMigration()

  // guest_profiles lost its unique index on public_player_id, so the widened
  // predicate can match a row belonging to someone else. An unordered limit 1
  // could re-point their scores and then delete their profile.
  assert.match(
    migration,
    /select count\(\*\)::int\s+into v_match_count\s+from public\.guest_profiles\s+where upper\(btrim\(public_player_id\)\) = v_normalized_public_player_id/i
  )
  assert.match(migration, /if v_match_count > 1 then\s+raise exception/i)
  assert.match(
    migration,
    /order by \(linked_user_id = v_user_id\) desc nulls last, id\s+limit 1;/i
  )
})

test('claim guest profile migration blocks a claim that would give one user two seats in a game', () => {
  assert.match(
    readClaimGuestProfileMigration(),
    /if exists \(\s*select 1\s+from public\.session_scores guest_row\s+join public\.session_scores own_row\s+on own_row\.session_id = guest_row\.session_id\s+and own_row\.owner_user_id = v_user_id\s+and own_row\.id <> guest_row\.id\s+where guest_row\.guest_profile_id = v_guest\.id\s*\) then\s+raise exception/i
  )
})

test('claim guest profile migration hands over scored_by_user_id with ownership', () => {
  // Both the update and the delete RLS policies on session_scores key off
  // scored_by_user_id, and the delete policy has no session-creator fallback,
  // so leaving it on the host locks the new owner out of their own rows.
  assert.match(
    readClaimGuestProfileMigration(),
    /update public\.session_scores\s+set\s+owner_user_id = v_user_id,\s+scored_by_user_id = v_user_id,\s+guest_profile_id = null,\s+guest_entry_id = null\s+where guest_profile_id = v_guest\.id;/i
  )
})

test('claim guest profile migration still deletes the guest row after conversion', () => {
  assert.match(
    readClaimGuestProfileMigration(),
    /delete from public\.guest_profiles where id = v_guest\.id;/i
  )
})
