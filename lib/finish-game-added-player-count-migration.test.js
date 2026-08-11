const fs = require('fs')
const path = require('path')
const process = require('node:process')
const test = require('node:test')
const assert = require('node:assert/strict')

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
const MIGRATION_BASENAME = /^\d+_fix_finish_game_added_player_counts\.sql$/i

const FINISH_GAME_HEADER =
  'create or replace function public.finish_game(p_session_id uuid)'
const FINISH_GAME_WITH_TIEBREAK_HEADER =
  'create or replace function public.finish_game_with_tiebreak('

// Every pattern below joins tokens with \s+ rather than [\s\S]*. An unanchored
// span can pair a WHERE clause from one query with a predicate from a
// different function a hundred lines away, which makes the assertion pass even
// when the query it names has been deleted outright.
const SEAT_COUNT_QUERY =
  /into unjoined_seat_count\s+from public\.session_scores ss\s+where ss\.session_id = p_session_id\s+and \(\s*ss\.guest_profile_id is not null\s+or ss\.guest_entry_id is not null\s+or not exists \(\s*select 1\s+from public\.session_players sp\s+where sp\.session_id = ss\.session_id\s+and sp\.user_id = ss\.owner_user_id\s*\)\s*\);/

const REQUIRED_SCORE_COUNT_FORMULA =
  /required_score_count := greatest\(\s*expected_player_count,\s*coalesce\(session_player_count, 0\) \+ coalesce\(unjoined_seat_count, 0\),\s*2\s*\);/

const RECAP_IDENTITY_GUARD =
  /when ss\.guest_profile_id is null\s+and ss\.guest_entry_id is null\s+and ss\.owner_user_id is not null/

const LEGACY_RECAP_IDENTITY_GUARD =
  /when ss\.guest_profile_id is null\s+and ss\.guest_entry_id is null\s+and ss\.player_name is null/

const RECAP_CASE_TERMINATOR = /end as next_recap_player_(?:name|id)/

const PROFILES_JOIN = /left join public\.profiles p/

const UNGATED_PROFILES_JOIN =
  /left join public\.profiles p\s+on p\.id = ss\.owner_user_id\s+and ss\.guest_profile_id is null\s+and ss\.guest_entry_id is null\s+left join public\.guest_profiles gp/

function resolveMigrationPath() {
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

  return path.join(migrationsDir, matches[0])
}

function readMigration() {
  return fs.readFileSync(resolveMigrationPath(), 'utf8')
}

function countMatches(text, pattern) {
  const found = text.match(new RegExp(pattern.source, 'gi'))
  return found ? found.length : 0
}

function extractFunctionBody(sql, header) {
  const start = sql.indexOf(header)
  assert.ok(start >= 0, `Expected "${header}" in the migration`)

  const rest = sql.slice(start + header.length)
  const nextHeader = rest.search(/create\s+or\s+replace\s+function/i)

  return nextHeader === -1 ? rest : rest.slice(0, nextHeader)
}

function finishGameBodies() {
  const migration = readMigration()

  return [
    ['finish_game', extractFunctionBody(migration, FINISH_GAME_HEADER)],
    [
      'finish_game_with_tiebreak',
      extractFunctionBody(migration, FINISH_GAME_WITH_TIEBREAK_HEADER),
    ],
  ]
}

test('both finish paths count every seat that session_players does not already cover', () => {
  for (const [name, body] of finishGameBodies()) {
    assert.equal(
      countMatches(body, SEAT_COUNT_QUERY),
      1,
      `${name} should build unjoined_seat_count from exactly one session_scores query that also counts rows whose owner is not in session_players`
    )
    assert.equal(
      countMatches(body, REQUIRED_SCORE_COUNT_FORMULA),
      1,
      `${name} should add unjoined_seat_count to session_player_count when deriving required_score_count`
    )
  }
})

test('neither finish path treats player_name as a guest marker', () => {
  for (const [name, body] of finishGameBodies()) {
    assert.equal(
      countMatches(body, /ss\.player_name is not null/),
      0,
      `${name} must not count seats by player_name — added players and converted guests keep it while owning a real account`
    )
    assert.equal(
      countMatches(body, LEGACY_RECAP_IDENTITY_GUARD),
      0,
      `${name} must not resolve recap identity by player_name`
    )
  }
})

test('every recap identity branch keys on the guest ids and the row owner', () => {
  for (const [name, body] of finishGameBodies()) {
    const recapCases = countMatches(body, RECAP_CASE_TERMINATOR)

    assert.ok(recapCases > 0, `${name} should still write recap identity columns`)
    assert.equal(
      countMatches(body, RECAP_IDENTITY_GUARD),
      recapCases,
      `${name} has ${recapCases} recap identity cases but only ${countMatches(
        body,
        RECAP_IDENTITY_GUARD
      )} of them route owner-backed rows to the profiles branch`
    )
  }
})

test('the profiles join is never gated on player_name', () => {
  for (const [name, body] of finishGameBodies()) {
    const profileJoins = countMatches(body, PROFILES_JOIN)

    assert.ok(profileJoins > 0, `${name} should join profiles for recap identity`)
    assert.equal(
      countMatches(body, UNGATED_PROFILES_JOIN),
      profileJoins,
      `${name} has ${profileJoins} profiles joins but only ${countMatches(
        body,
        UNGATED_PROFILES_JOIN
      )} of them let added and converted players match`
    )
  }
})
