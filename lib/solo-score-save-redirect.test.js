import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const soloScoreSource = fs.readFileSync(
  path.join(process.cwd(), 'app', 'solo-score.tsx'),
  'utf8'
)

test('solo score routes successful end-game saves to solo statistics', () => {
  assert.match(
    soloScoreSource,
    /async function handleEndGameAndSave\(\)/
  )
  assert.match(
    soloScoreSource,
    /const savedRow = await saveSoloGameResult\(\{/
  )
  assert.match(
    soloScoreSource,
    /router\.replace\('\/solo-stats' as never\)/
  )
  assert.doesNotMatch(
    soloScoreSource,
    /requestAnimationFrame\(\(\) => \{\s*scrollViewRef\.current\?\.scrollTo/
  )
})
