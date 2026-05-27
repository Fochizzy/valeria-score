import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const screenSource = fs.readFileSync(
  path.join(process.cwd(), 'app', 'global-trends.tsx'),
  'utf8'
)

test('global trends stat tile values are allowed to wrap instead of truncating', () => {
  assert.doesNotMatch(
    screenSource,
    /<Text style=\{styles\.statTileValue\}\s+numberOfLines=\{1\}>/
  )
  assert.match(screenSource, /<Text style=\{styles\.statTileValue\}>/)
})
