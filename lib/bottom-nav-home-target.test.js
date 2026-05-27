import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const bottomNavPath = path.join(process.cwd(), 'components', 'BottomNav.tsx')

test('bottom nav home chip uses the home artwork and opens create session', () => {
  const source = fs.readFileSync(bottomNavPath, 'utf8')

  assert.match(source, /nav-home\.png/)
  assert.match(source, /const handleHomePress = useCallback\(\(\) => \{/)
  assert.match(source, /router\.replace\('\/create-session'\)/)
  assert.doesNotMatch(source, /router\.replace\('\/create-user'\)/)
  assert.doesNotMatch(source, /performSafeBackNavigation/)
})
