import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const manageDataSource = fs.readFileSync(
  path.join(process.cwd(), 'app', 'manage-data.tsx'),
  'utf8'
)

const soloScoreSource = fs.readFileSync(
  path.join(process.cwd(), 'app', 'solo-score.tsx'),
  'utf8'
)

test('manage data history screen includes solo history actions and labels', () => {
  assert.match(manageDataSource, /loadSoloResults/)
  assert.match(manageDataSource, /deleteSoloGameResult/)
  assert.match(manageDataSource, /buildManageDataHistoryItems/)
  assert.match(manageDataSource, /Solo Game/)
  assert.match(manageDataSource, /Edit Solo Game/)
  assert.match(manageDataSource, /Delete Solo Game/)
})

test('solo score screen can hydrate an existing saved solo result by id', () => {
  assert.match(soloScoreSource, /soloGameId\?: string/)
  assert.match(soloScoreSource, /loadSoloResultById/)
  assert.match(soloScoreSource, /buildSoloDraftFromResult/)
})
