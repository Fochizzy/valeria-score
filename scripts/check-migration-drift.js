/**
 * Fails CI when supabase/migrations/ and the production migration history
 * disagree — the drift that once let leave_all_games exist locally but not
 * in production.
 *
 * History before 2026-05-25 predates the filename-alignment convention
 * (commit d54c938) and is grandfathered; everything after must match in
 * both directions.
 */
const fs = require('fs')
const path = require('path')

const CUTOFF = '20260525000000'

const projectRef = process.env.SUPABASE_PROJECT_REF
const accessToken = process.env.SUPABASE_ACCESS_TOKEN

if (!projectRef || !accessToken) {
  console.error('[drift] SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN are required.')
  process.exit(1)
}

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')

const localVersions = new Map(
  fs
    .readdirSync(migrationsDir)
    .filter((file) => /^\d{14}_.+\.sql$/.test(file))
    .map((file) => [file.slice(0, 14), file.slice(15, -4)])
    .filter(([version]) => version >= CUTOFF)
)

async function main() {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/migrations`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!response.ok) {
    console.error(`[drift] Management API returned ${response.status}.`)
    process.exit(1)
  }

  const remote = await response.json()
  const remoteVersions = new Map(
    remote
      .map((row) => [String(row.version), row.name ?? ''])
      .filter(([version]) => version >= CUTOFF)
  )

  const problems = []

  for (const [version, name] of localVersions) {
    if (!remoteVersions.has(version)) {
      problems.push(`local migration not in production history: ${version}_${name}`)
    }
  }

  for (const [version, name] of remoteVersions) {
    if (!localVersions.has(version)) {
      problems.push(`production history has no local file: ${version} (${name})`)
    }
  }

  if (problems.length > 0) {
    console.error('[drift] Repo and production migration history disagree:')
    for (const problem of problems) {
      console.error(`  - ${problem}`)
    }
    process.exit(1)
  }

  console.log(
    `[drift] In sync: ${localVersions.size} migrations match production history (cutoff ${CUTOFF}).`
  )
}

main().catch((error) => {
  console.error('[drift] Check failed:', error)
  process.exit(1)
})
