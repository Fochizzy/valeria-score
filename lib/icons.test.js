import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const repoRoot = path.resolve(import.meta.dirname, '..')

const approvedAssetNames = new Set([
  'icons.boss.png',
  'icons.citizen.png',
  'icons.claw.png',
  'icons.domain.png',
  'icons.domain_points.png',
  'icons.fight.png',
  'icons.gold.png',
  'icons.hammer.png',
  'icons.helmet.png',
  'icons.holy.png',
  'icons.key.png',
  'icons.mana.png',
  'icons.minion.png',
  'icons.monsters.png',
  'icons.monsters_points.png',
  'icons.second.png',
  'icons.vp1.png',
  'icons.vp2.png',
])

const iconSourceFiles = ['data/scoreIcons.ts']

function getRequiredIconPaths(sourcePath) {
  const absoluteSourcePath = path.join(repoRoot, sourcePath)
  const source = readFileSync(absoluteSourcePath, 'utf8')

  return Array.from(
    source.matchAll(/require\('(\.\.\/assets\/icons\/[^']+)'\)/g),
    (match) => match[1]
  )
}

test('score icon helpers only reference approved score-page icons that exist', () => {
  for (const sourcePath of iconSourceFiles) {
    const requiredIconPaths = getRequiredIconPaths(sourcePath)
    const sourceDir = path.dirname(path.join(repoRoot, sourcePath))

    assert.notEqual(
      requiredIconPaths.length,
      0,
      `${sourcePath} should reference score icon assets`
    )

    for (const relativeIconPath of requiredIconPaths) {
      const iconName = path.basename(relativeIconPath)
      const absoluteIconPath = path.resolve(sourceDir, relativeIconPath)

      assert.equal(
        approvedAssetNames.has(iconName),
        true,
        `${sourcePath} should only use approved score-page icons, found ${iconName}`
      )
      assert.equal(
        existsSync(absoluteIconPath),
        true,
        `${sourcePath} should point at an existing icon file: ${relativeIconPath}`
      )
    }
  }
})
