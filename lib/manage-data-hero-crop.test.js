import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const manageDataSource = fs.readFileSync(
  path.join(process.cwd(), 'app', 'manage-data.tsx'),
  'utf8'
)

test('manage data hero keeps the top of Valeria visible while cropping out Card Kingdoms', () => {
  assert.match(
    manageDataSource,
    /logoCrop:\s*{[\s\S]*height:\s*88,[\s\S]*overflow:\s*'hidden',/
  )
  assert.doesNotMatch(manageDataSource, /logo:\s*{[\s\S]*translateY:\s*-/)
  assert.match(
    manageDataSource,
    /cardsStack:\s*{[\s\S]*marginTop:\s*18,/
  )
  assert.match(
    manageDataSource,
    /content:\s*{[\s\S]*paddingTop:\s*8,[\s\S]*paddingBottom:\s*20,/
  )
})
