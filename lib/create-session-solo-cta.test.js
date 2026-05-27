import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const source = fs.readFileSync(
  path.join(process.cwd(), 'app', 'create-session.tsx'),
  'utf8'
)

test('create session setup keeps player-count buttons on one full-width row and solo mode full-width below', () => {
  assert.doesNotMatch(
    source,
    /Open the split Player versus Dark Lord score board\./
  )
  assert.match(
    source,
    /<Text style=\{styles\.soloModeButtonText\}>Solo Mode<\/Text>/
  )
  assert.match(
    source,
    /expectedRow:\s*{[\s\S]*flexDirection:\s*'row',[\s\S]*gap:\s*8,[\s\S]*marginTop:\s*10,/
  )
  assert.match(
    source,
    /expectedChip:\s*{[\s\S]*flex:\s*1,[\s\S]*minWidth:\s*0,[\s\S]*alignItems:\s*'center',[\s\S]*justifyContent:\s*'center',/
  )
  assert.match(
    source,
    /soloModeButton:\s*{[\s\S]*alignSelf:\s*'stretch',[\s\S]*width:\s*'100%',[\s\S]*alignItems:\s*'center',[\s\S]*justifyContent:\s*'center',/
  )
  assert.match(
    source,
    /soloModeButtonText:\s*{[\s\S]*textAlign:\s*'center',/
  )
})

test('create session solo CTA does not force solo mode to reopen as a fresh draft', () => {
  assert.match(
    source,
    /function handleOpenSoloMode\(\)/
  )
  assert.match(
    source,
    /function handleOpenSoloMode\(\)\s*{\s*setSelectedGameMode\('solo'\)\s*}/
  )
  assert.match(
    source,
    /if \(selectedGameMode === 'solo'\) {\s*router\.push\((?:{[\s\S]*pathname:\s*'\/solo-score' as never|['"]\/solo-score['"])\)/
  )
  assert.doesNotMatch(
    source,
    /fresh:\s*'1'/
  )
})

test('create session solo setup routes multiplayer selection back through Create Game', () => {
  assert.match(
    source,
    /const \[selectedGameMode, setSelectedGameMode\] = useState<'multiplayer' \| 'solo'>\('multiplayer'\)/
  )
  assert.match(
    source,
    /onPress=\{\(\) => {\s*setSelectedGameMode\('multiplayer'\)\s*setPendingExpectedPlayers\(count\)\s*}\}/
  )
  assert.match(
    source,
    /const canCreateGame = selectedGameMode === 'solo' \? !creating : isExpectedPlayerOption\(pendingExpectedPlayers\) && !creating/
  )
})

test('create session hub shows four equal-sized stats and recap buttons including solo stats', () => {
  assert.match(
    source,
    /const GAME_HUB_LINKS:[\s\S]*\{ label: 'Player Stats', route: '\/player-stats' as const \},[\s\S]*\{ label: 'Duke Stats', route: '\/duke-stats' as const \},[\s\S]*\{ label: 'Recent Recaps', route: '\/manage-data' as const \},[\s\S]*\{ label: 'Solo Stats', route: '\/solo-stats' as const \},/
  )
  assert.match(
    source,
    /routeLinkButton:\s*{[\s\S]*flexBasis:\s*'48%',[\s\S]*flexGrow:\s*1,[\s\S]*minHeight:\s*58,/
  )
  assert.doesNotMatch(
    source,
    /routeLinkButtonWide:/
  )
  assert.doesNotMatch(
    source,
    /link\.wide && styles\.routeLinkButtonWide/
  )
})

test('create session current table fully right-aligns the join code and keeps host helper copy to two lines beside it', () => {
  assert.match(
    source,
    /<View style=\{styles\.currentTableHeaderRow\}>[\s\S]*<View style=\{styles\.currentTableMetaRow\}>/s
  )
  assert.match(
    source,
    /Host sees every seat,\\nincluding guests\./
  )
  assert.match(
    source,
    /currentTableMetaRow:\s*{[\s\S]*width:\s*'100%',[\s\S]*flexDirection:\s*'row',[\s\S]*alignItems:\s*'stretch',[\s\S]*justifyContent:\s*'space-between',/s
  )
  assert.match(
    source,
    /currentTableMetaCopyHost:\s*{[\s\S]*minHeight:\s*56,[\s\S]*justifyContent:\s*'center',/s
  )
  assert.match(
    source,
    /joinCodeInlineChip:\s*{[\s\S]*marginLeft:\s*'auto',[\s\S]*minHeight:\s*56,[\s\S]*justifyContent:\s*'center',/s
  )
})
