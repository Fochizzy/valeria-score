import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const soloScoreSource = fs.readFileSync(
  path.join(process.cwd(), 'app', 'solo-score.tsx'),
  'utf8'
)

test('solo score can save the draft and close back to the game hub without finalizing', () => {
  assert.match(
    soloScoreSource,
    /async function handleSaveAndClose\(\)/
  )
  assert.match(
    soloScoreSource,
    /await AsyncStorage\.setItem\(SOLO_DRAFT_STORAGE_KEY, JSON\.stringify\(draft\)\)/
  )
  assert.match(
    soloScoreSource,
    /router\.replace\('\/create-session'\)/
  )
  assert.match(
    soloScoreSource,
    /Save and Close/
  )
})
