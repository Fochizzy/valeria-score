import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const appRoot = path.join(repoRoot, 'app')
const layoutPath = path.join(appRoot, '_layout.tsx')

const legacyRouteDirectories = [path.join(appRoot, 'session')]

const legacyRouteFiles = [
  path.join(appRoot, 'auth.tsx'),
  path.join(appRoot, 'create-game.tsx'),
  path.join(appRoot, 'home.tsx'),
  path.join(appRoot, 'session.tsx'),
  path.join(appRoot, 'session', '[id].tsx'),
]

const forbiddenRouteStrings = ['/home', '/create-game', '/session/[id]']

function walkSourceFiles(rootDir) {
  const entries = readdirSync(rootDir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name)

    if (entry.isDirectory()) {
      files.push(...walkSourceFiles(fullPath))
      continue
    }

    if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
      files.push(fullPath)
    }
  }

  return files
}

test('legacy route files are removed', () => {
  for (const filePath of legacyRouteFiles) {
    assert.equal(existsSync(filePath), false, `${path.relative(repoRoot, filePath)} should be removed`)
  }
})

test('legacy route directories are removed', () => {
  for (const directoryPath of legacyRouteDirectories) {
    assert.equal(
      existsSync(directoryPath),
      false,
      `${path.relative(repoRoot, directoryPath)} should be removed`
    )
  }
})

test('root stack does not register legacy screens', () => {
  const layoutSource = readFileSync(layoutPath, 'utf8')

  assert.doesNotMatch(layoutSource, /name="create-game"/)
  assert.doesNotMatch(layoutSource, /name="session\/\[id\]"/)
  assert.doesNotMatch(layoutSource, /name="home"/)
})

test('source files do not navigate to removed legacy routes', () => {
  const sourceRoots = ['app', 'components', 'lib'].map((dir) => path.join(repoRoot, dir))
  const sourceFiles = sourceRoots
    .flatMap((dir) => walkSourceFiles(dir))
    .filter((filePath) => filePath !== fileURLToPath(import.meta.url))

  for (const filePath of sourceFiles) {
    const source = readFileSync(filePath, 'utf8')

    for (const forbiddenRoute of forbiddenRouteStrings) {
      assert.equal(
        source.includes(forbiddenRoute),
        false,
        `${path.relative(repoRoot, filePath)} should not reference ${forbiddenRoute}`
      )
    }
  }
})
