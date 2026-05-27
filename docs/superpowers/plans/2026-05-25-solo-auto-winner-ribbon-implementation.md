# Solo Auto Winner Ribbon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the existing winner ribbon immediately on the solo score screen for the two automatic solo endings, while keeping contested solo games save-gated.

**Architecture:** Keep winner resolution in `lib/solo-mode.ts` unchanged and implement this as a UI-only display-state change in `app/solo-score.tsx`. Add a focused source-level regression that locks in immediate ribbon rendering for automatic outcomes and no immediate ribbon for contested scoring.

**Tech Stack:** Expo Router, React Native, TypeScript, Node `node:test` source-regression tests

---

### Task 1: Lock the solo score ribbon behavior with a failing regression

**Files:**
- Create: `C:\Users\izzyh\Desktop\valeria-score\lib\solo-score-auto-winner-ribbon.test.js`
- Modify: `C:\Users\izzyh\Desktop\valeria-score\app\solo-score.tsx`
- Test: `C:\Users\izzyh\Desktop\valeria-score\lib\solo-score-auto-winner-ribbon.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node .\lib\solo-score-auto-winner-ribbon.test.js`
Expected: FAIL because `app/solo-score.tsx` still uses `savedWinner` as the only ribbon gate.

- [ ] **Step 3: Write minimal implementation**

```tsx
type SoloSideCardProps = {
  role: SoloSideRole
  title: string
  duke: DukeCard | null
  inputs: SoloDraft['player']['inputs']
  total: number
  scoringRequired: boolean
  previewWinner: boolean
  showWinnerRibbon: boolean
  onSelectDuke: () => void
  onLongPressDuke: () => void
  onChangeInput: (key: keyof SoloDraft['player']['inputs'], value: number) => void
}

function SoloSideCard({
  role,
  title,
  duke,
  inputs,
  total,
  scoringRequired,
  previewWinner,
  showWinnerRibbon,
  onSelectDuke,
  onLongPressDuke,
  onChangeInput,
}: SoloSideCardProps) {
  const winnerBanner = showWinnerRibbon
    ? buildSoloWinnerBanner(role === 'player' ? 'player' : 'dark_lord')
    : ''

  return (
    <View
      style={[
        styles.sideCard,
        {
          borderColor: palette.ring,
          backgroundColor: palette.panel,
        },
        previewWinner && styles.sideCardPreviewWinner,
        previewWinner && { shadowColor: palette.ring, shadowOpacity: 0.34, elevation: 10 },
      ]}
    >
      {showWinnerRibbon ? (
        <View style={[styles.winnerBanner, { backgroundColor: palette.ring }]}>
          <Text style={styles.winnerBannerText}>{winnerBanner}</Text>
        </View>
      ) : null}
    </View>
  )
}

const previewWinner = draft.savedWinner ?? currentOutcome?.winner ?? null
const immediateWinnerRibbon =
  currentOutcome && !currentOutcome.requiresScoring ? currentOutcome.winner : null

<SoloSideCard
  role="player"
  title="Player"
  duke={playerDuke}
  inputs={playerInputs}
  total={playerTotal}
  scoringRequired={scoringRequired}
  previewWinner={previewWinner === 'player'}
  showWinnerRibbon={draft.savedWinner === 'player' || immediateWinnerRibbon === 'player'}
  onSelectDuke={() => {
    void persistDraftAndOpen('/duke-select', 'player')
  }}
  onLongPressDuke={() => {
    void persistDraftAndOpen('/duke-select', 'player')
  }}
  onChangeInput={(key, value) => updateSideInput('player', key, value)}
/>

<SoloSideCard
  role="dark_lord"
  title="Dark Lord"
  duke={darkLordDuke}
  inputs={darkLordInputs}
  total={darkLordTotal}
  scoringRequired={scoringRequired}
  previewWinner={previewWinner === 'dark_lord'}
  showWinnerRibbon={draft.savedWinner === 'dark_lord' || immediateWinnerRibbon === 'dark_lord'}
  onSelectDuke={() => {
    void persistDraftAndOpen('/duke-select', 'dark_lord')
  }}
  onLongPressDuke={() => {
    void persistDraftAndOpen('/duke-select', 'dark_lord')
  }}
  onChangeInput={(key, value) => updateSideInput('dark_lord', key, value)}
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node .\lib\solo-score-auto-winner-ribbon.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/solo-score-auto-winner-ribbon.test.js app/solo-score.tsx
git commit -m "feat: show auto-win solo ribbons before save"
```

### Task 2: Verify the solo winner rules stayed intact

**Files:**
- Modify: `C:\Users\izzyh\Desktop\valeria-score\app\solo-score.tsx`
- Test: `C:\Users\izzyh\Desktop\valeria-score\lib\solo-mode.test.js`
- Test: `C:\Users\izzyh\Desktop\valeria-score\lib\solo-score-auto-winner-ribbon.test.js`

- [ ] **Step 1: Run the existing solo outcome tests**

```javascript
import {
  isSoloStatVisibleForRole,
  resolveSoloOutcome,
  sanitizeSoloInputsForRole,
  validateSoloGameSetup,
} from './solo-mode.ts'

test('resolveSoloOutcome marks slay all monsters as an automatic player win', () => {
  assert.deepEqual(
    resolveSoloOutcome({
      victoryCondition: 'slay_all_monsters',
      playerTotal: 0,
      darkLordTotal: 999,
    }),
    {
      winner: 'player',
      resolution: 'player_auto',
      requiresScoring: false,
    }
  )
})
```

Run: `node .\lib\solo-mode.test.js`
Expected: PASS

- [ ] **Step 2: Run the focused ribbon regression again**

Run: `node .\lib\solo-score-auto-winner-ribbon.test.js`
Expected: PASS

- [ ] **Step 3: Run TypeScript verification**

Run: `node .\node_modules\typescript\bin\tsc --noEmit`
Expected: exit code `0`

- [ ] **Step 4: Commit any verification-driven follow-up**

```bash
git add app/solo-score.tsx lib/solo-score-auto-winner-ribbon.test.js
git commit -m "test: verify solo auto ribbon behavior"
```
