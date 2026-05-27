import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const loginSource = fs.readFileSync(path.join(process.cwd(), 'app', 'login.tsx'), 'utf8')

test('login wordmark crop keeps the top of Valeria visible while hiding Card Kingdoms', () => {
  assert.match(loginSource, /const logo = require\('\.\.\/assets\/valeria_wordmark\.png'\)/)
  assert.match(loginSource, /logoCrop:\s*{[\s\S]*height:\s*112,/)
  assert.match(loginSource, /logo:\s*{[\s\S]*height:\s*112,/)
  assert.doesNotMatch(loginSource, /logo:\s*{[\s\S]*translateY:\s*-/)
})
