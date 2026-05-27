import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const scoreSource = fs.readFileSync(
  path.join(process.cwd(), 'app', 'score.tsx'),
  'utf8'
)

test('score screen uses a portrait-aware duke thumbnail for tall duke art', () => {
  assert.match(scoreSource, /const portraitDukeSlugs = new Set\(\[/)
  assert.match(
    scoreSource,
    /const selectedDukeThumbIsPortrait = selectedDuke \? portraitDukeSlugs\.has\(selectedDuke\.slug\) : false/
  )
  assert.match(
    scoreSource,
    /style=\{\[\s*styles\.dukeThumbWrap,\s*selectedDukeThumbIsPortrait && styles\.dukeThumbWrapPortrait,\s*\]\}/
  )
  assert.match(
    scoreSource,
    /resizeMode=\{selectedDukeThumbIsPortrait \? 'contain' : 'cover'\}/
  )
  assert.match(
    scoreSource,
    /dukeThumbWrapPortrait:\s*{[\s\S]*width:\s*108,[\s\S]*height:\s*151,/
  )
})
