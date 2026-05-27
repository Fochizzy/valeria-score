import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { shouldShowBottomNav } from './top-nav-visibility.ts'

const layoutSource = fs.readFileSync(
  path.join(process.cwd(), 'app', '_layout.tsx'),
  'utf8'
)

test('solo stats keeps the shared bottom navigation visible', () => {
  assert.equal(shouldShowBottomNav('/solo-stats'), true)
})

test('root layout registers solo stats alongside the other analytics screens', () => {
  assert.match(layoutSource, /<Stack\.Screen name="player-stats" \/>/)
  assert.match(layoutSource, /<Stack\.Screen name="duke-stats" \/>/)
  assert.match(layoutSource, /<Stack\.Screen name="global-trends" \/>/)
  assert.match(layoutSource, /<Stack\.Screen name="solo-stats" \/>/)
})
