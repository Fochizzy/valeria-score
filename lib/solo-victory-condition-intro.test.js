import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const soloVictoryConditionSource = fs.readFileSync(
  path.join(process.cwd(), 'app', 'solo-victory-condition.tsx'),
  'utf8'
)

test('solo victory condition screen no longer shows the intro rule pill copy', () => {
  assert.doesNotMatch(
    soloVictoryConditionSource,
    /Pick the ending rule/
  )
  assert.doesNotMatch(
    soloVictoryConditionSource,
    /Automatic endings mark the winner without scoring\.\s*Exhausted stacks use both score\s*totals\./
  )
})
