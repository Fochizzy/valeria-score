import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const bottomNavAssetNames = ['nav-score.png', 'nav-compare.png', 'nav-profile.png']
const bottomNavAssetDir = path.join(process.cwd(), 'assets', 'nav')
const analyticsPageSurfacePath = path.join(
  process.cwd(),
  'constants',
  'analyticsPageSurface.ts'
)

test('bottom nav image assets exist for each tab', () => {
  for (const assetName of bottomNavAssetNames) {
    const assetPath = path.join(bottomNavAssetDir, assetName)
    assert.equal(
      fs.existsSync(assetPath),
      true,
      `Expected BottomNav asset to exist: ${assetPath}`
    )
  }
})

test('analytics page artwork references resolve to real asset files', () => {
  const source = fs.readFileSync(analyticsPageSurfacePath, 'utf8')
  const requireMatches = [...source.matchAll(/require\('(..\/assets\/[^']+)'\)/g)]

  assert.ok(requireMatches.length > 0, 'Expected analyticsPageSurface.ts to reference artwork')

  for (const [, relativeAssetPath] of requireMatches) {
    const normalizedRelativeAssetPath = relativeAssetPath.replace(/\//g, path.sep)
    const assetPath = path.resolve(path.dirname(analyticsPageSurfacePath), normalizedRelativeAssetPath)

    assert.equal(
      fs.existsSync(assetPath),
      true,
      `Expected analytics page artwork to exist: ${assetPath}`
    )
  }
})
