import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const soloScoreSource = fs.readFileSync(
  path.join(process.cwd(), 'app', 'solo-score.tsx'),
  'utf8'
)

test('solo score shows winner ribbons immediately for automatic outcomes only', () => {
  assert.match(
    soloScoreSource,
    /showWinnerRibbon: boolean/
  )
  assert.match(
    soloScoreSource,
    /const immediateWinnerRibbon = currentOutcome && !currentOutcome\.requiresScoring \? currentOutcome\.winner : null/
  )
  assert.match(
    soloScoreSource,
    /const winnerBanner = showWinnerRibbon \? buildSoloWinnerBanner\(role === 'player' \? 'player' : 'dark_lord'\) : ''/
  )
  assert.match(
    soloScoreSource,
    /showWinnerRibbon=\{draft\.savedWinner === 'player' \|\| immediateWinnerRibbon === 'player'\}/
  )
  assert.match(
    soloScoreSource,
    /showWinnerRibbon=\{draft\.savedWinner === 'dark_lord' \|\| immediateWinnerRibbon === 'dark_lord'\}/
  )
})

test('solo score uses a dedicated winner-banner style instead of the seat ring color', () => {
  assert.match(
    soloScoreSource,
    /<View style=\{\[styles\.winnerBanner,\s*styles\.winnerBannerWinner\]\}>/
  )
  assert.doesNotMatch(
    soloScoreSource,
    /<View style=\{\[styles\.winnerBanner,\s*\{\s*backgroundColor:\s*palette\.ring\s*\}\]\}>/
  )
  assert.match(
    soloScoreSource,
    /winnerBannerWinner:\s*{[\s\S]*backgroundColor:\s*theme\.colors\.gold,[\s\S]*borderColor:\s*theme\.colors\.holy,[\s\S]*shadowColor:\s*theme\.colors\.gold,/s
  )
  assert.match(
    soloScoreSource,
    /winnerBannerText:\s*{[\s\S]*color:\s*theme\.colors\.background,[\s\S]*fontSize:\s*15,/s
  )
})
