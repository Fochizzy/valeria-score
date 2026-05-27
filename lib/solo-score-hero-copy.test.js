import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const soloScoreSource = fs.readFileSync(
  path.join(process.cwd(), 'app', 'solo-score.tsx'),
  'utf8'
)

test('solo score no longer shows the pre-victory-condition helper sentence', () => {
  assert.doesNotMatch(
    soloScoreSource,
    /Choose a victory condition to unlock the solo finish rules\./
  )
})
