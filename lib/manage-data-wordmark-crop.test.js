import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const manageDataSource = fs.readFileSync(
  path.join(process.cwd(), 'app', 'manage-data.tsx'),
  'utf8'
)

test('manage-data wordmark crop keeps the Valeria edges visible while still hiding lower logo text', () => {
  assert.match(manageDataSource, /logoCrop:\s*{[\s\S]*width:\s*340,/)
  assert.match(manageDataSource, /logoCrop:\s*{[\s\S]*height:\s*88,/)
  assert.match(manageDataSource, /logoCrop:\s*{[\s\S]*overflow:\s*'hidden',/)
  assert.match(manageDataSource, /logo:\s*{[\s\S]*width:\s*328,/)
})
