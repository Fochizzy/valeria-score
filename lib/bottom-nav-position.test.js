import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const bottomNavSource = readFileSync(
  path.resolve(import.meta.dirname, '../components/BottomNav.tsx'),
  'utf8'
)

test('bottom nav is anchored from the bottom safe area instead of the top header rail', () => {
  assert.match(bottomNavSource, /getBottomNavBottomOffset/)
  assert.match(bottomNavSource, /bottom:\s*getBottomNavBottomOffset\(insets\.bottom\)/)
  assert.doesNotMatch(bottomNavSource, /top:\s*getBottomNavTopOffset/)
})
