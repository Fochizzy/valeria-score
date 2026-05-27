import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const dukeSelectSource = fs.readFileSync(
  path.join(process.cwd(), 'app', 'duke-select.tsx'),
  'utf8'
)

test('duke select hero shows the full Valeria logo without clipping it', () => {
  assert.match(
    dukeSelectSource,
    /<View style=\{styles\.logoCrop\}>/
  )
  assert.match(
    dukeSelectSource,
    /<Image source=\{logo\} style=\{styles\.logo\} resizeMode="contain" \/>/
  )
  assert.match(
    dukeSelectSource,
    /logoWrap:\s*{[\s\S]*marginTop:\s*8,/
  )
  assert.match(
    dukeSelectSource,
    /logoCrop:\s*{[\s\S]*height:\s*72,/
  )
  assert.match(
    dukeSelectSource,
    /logo:\s*{[\s\S]*width:\s*196,[\s\S]*height:\s*72,/
  )
})
