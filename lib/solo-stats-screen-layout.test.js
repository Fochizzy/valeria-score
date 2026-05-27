import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const soloStatsSource = fs.readFileSync(
  path.join(process.cwd(), 'app', 'solo-stats.tsx'),
  'utf8'
)

test('solo stats screen renders strategy sections before solo point distribution', () => {
  assert.match(soloStatsSource, /Win Patterns/)
  assert.match(soloStatsSource, /Risk Patterns/)
  assert.match(soloStatsSource, /Matchups/)
  assert.match(
    soloStatsSource,
    /Win Patterns[\s\S]*Risk Patterns[\s\S]*Matchups[\s\S]*Solo Point Distribution/
  )
})

test('solo stats screen includes ranking notes, duke-less exclusion copy, and inline matchup detail labels', () => {
  assert.match(soloStatsSource, /Min 3 games/)
  assert.match(
    soloStatsSource,
    /count in totals but not Duke or matchup rankings/
  )
  assert.doesNotMatch(soloStatsSource, /Most Played Rivalry/)
  assert.match(soloStatsSource, /Victory condition split/)
  assert.match(soloStatsSource, /Resolution split/)
  assert.match(soloStatsSource, /expandedMatchupKey/)
})
