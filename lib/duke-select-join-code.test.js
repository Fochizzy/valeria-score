import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const dukeSelectSource = fs.readFileSync(
  path.join(process.cwd(), 'app', 'duke-select.tsx'),
  'utf8'
)

test('duke selector surfaces the current game code with copy feedback', () => {
  assert.match(
    dukeSelectSource,
    /import \{ copyJoinCodeWithFeedback \} from '\.\.\/lib\/copy-join-code-client'/
  )
  assert.match(
    dukeSelectSource,
    /const currentJoinCode = typeof params\.joinCode === 'string' \? params\.joinCode : ''/
  )
  assert.match(
    dukeSelectSource,
    /const handleCopyJoinCode = useCallback\(async \(\) => \{[\s\S]*await copyJoinCodeWithFeedback\(currentJoinCode\)[\s\S]*\}, \[currentJoinCode\]\)/
  )
  assert.match(
    dukeSelectSource,
    /<Text style=\{styles\.joinCodeLabel\}>Game Code<\/Text>/
  )
  assert.match(
    dukeSelectSource,
    /accessibilityLabel=\{`Copy game code \$\{currentJoinCode\}`\}/
  )
  assert.match(
    dukeSelectSource,
    /onPress=\{\(\) => void handleCopyJoinCode\(\)\}/
  )
})

test('duke selector puts pick your duke on the left and a smaller game-code chip on the same row', () => {
  assert.match(
    dukeSelectSource,
    /<View style=\{styles\.logoWrap\}>[\s\S]*<View style=\{styles\.heroTitleRow\}>[\s\S]*styles\.heroTitleWithChip[\s\S]*styles\.joinCodeChip/s
  )
  assert.match(
    dukeSelectSource,
    /heroTitleRow:\s*{[\s\S]*width:\s*'100%',[\s\S]*flexDirection:\s*'row',[\s\S]*alignItems:\s*'center',[\s\S]*justifyContent:\s*'space-between',/s
  )
  assert.match(
    dukeSelectSource,
    /heroTitleWithChip:\s*{[\s\S]*flex:\s*1,[\s\S]*textAlign:\s*'left',[\s\S]*marginTop:\s*0,/s
  )
  assert.match(
    dukeSelectSource,
    /joinCodeChip:\s*{[\s\S]*minHeight:\s*40,[\s\S]*paddingHorizontal:\s*10,[\s\S]*paddingVertical:\s*5,/s
  )
  assert.match(
    dukeSelectSource,
    /joinCodeValue:\s*{[\s\S]*fontSize:\s*13,/s
  )
})

test('duke selector hides the game code entirely in solo mode', () => {
  assert.match(
    dukeSelectSource,
    /const isSoloSelection = returnTo === '\/solo-score' \|\| Boolean\(soloRole\)/
  )
  assert.match(
    dukeSelectSource,
    /const showJoinCode = Boolean\(currentJoinCode\) && !isSoloSelection/
  )
  assert.match(
    dukeSelectSource,
    /\{showJoinCode \? \(/ 
  )
})
