import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const bottomNavSource = readFileSync(
  path.resolve(import.meta.dirname, '../components/BottomNav.tsx'),
  'utf8'
)

test('bottom nav does not render separate text labels below nav icons', () => {
  assert.equal(
    bottomNavSource.includes('{item.label}'),
    false,
    'BottomNav should not render label text when the nav art already includes embedded words.'
  )
})
