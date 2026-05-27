import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const dukeSelectSource = fs.readFileSync(
  path.join(process.cwd(), 'app', 'duke-select.tsx'),
  'utf8'
)

test('selected duke preview uses portrait-aware sizing so full tall duke art stays visible', () => {
  assert.match(
    dukeSelectSource,
    /const portraitDukeSlugs = new Set\(\[/
  )
  assert.match(
    dukeSelectSource,
    /const selectedPreviewIsPortrait = selectedCard \? portraitDukeSlugs\.has\(selectedCard\.slug\) : false/
  )
  assert.match(
    dukeSelectSource,
    /style=\{\[\s*styles\.selectedImageWrap,\s*selectedPreviewIsPortrait && styles\.selectedImageWrapPortrait,\s*\]\}/
  )
  assert.match(
    dukeSelectSource,
    /resizeMode=\{selectedPreviewIsPortrait \? 'contain' : 'cover'\}/
  )
  assert.match(
    dukeSelectSource,
    /selectedImageWrapPortrait:\s*{[\s\S]*aspectRatio:\s*1061\s*\/\s*1482,/
  )
})

test('selected duke confirmation fits as a single non-scrolling page with a full logo header', () => {
  assert.match(
    dukeSelectSource,
    /if \(selectedCard\) \{[\s\S]*<View style=\{styles\.screen\}>[\s\S]*styles\.selectedContent/s
  )
  assert.match(
    dukeSelectSource,
    /logoWrap:\s*{[\s\S]*alignItems:\s*'center',[\s\S]*justifyContent:\s*'center',/s
  )
  assert.match(
    dukeSelectSource,
    /logo:\s*{[\s\S]*width:\s*196,[\s\S]*height:\s*72,/s
  )
  assert.match(
    dukeSelectSource,
    /selectedCard:\s*{[\s\S]*flex:\s*1,[\s\S]*minHeight:\s*0,/s
  )
  assert.match(
    dukeSelectSource,
    /selectedImageWrap:\s*{[\s\S]*flex:\s*1,[\s\S]*minHeight:\s*0,/s
  )
})
