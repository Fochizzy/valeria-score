import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildDangerFlowCopy,
  buildScoreSaveFeedback,
  sessionUiCopy,
} from './p3-feedback.ts'

test('session UI copy stays consistent for shared labels', () => {
  assert.equal(sessionUiCopy.joinCodeLabel, 'Join Code')
  assert.equal(sessionUiCopy.savedLabel, 'Saved')
  assert.equal(sessionUiCopy.liveTotalLabel, 'Live Total')
  assert.equal(sessionUiCopy.lockedState, 'Locked')
  assert.equal(sessionUiCopy.savedState, 'Saved')
})

test('buildScoreSaveFeedback personalizes guest saves', () => {
  const result = buildScoreSaveFeedback({
    isGuestMode: true,
    guestName: 'Mara',
    dukeName: 'Cornelius the Dreamer',
  })

  assert.equal(result.title, 'Score Saved')
  assert.match(result.body, /Mara/)
  assert.match(result.body, /Cornelius the Dreamer/)
  assert.equal(result.actionLabel, 'Compare Scores')
})

test('buildDangerFlowCopy explains destructive delete session consequences', () => {
  const result = buildDangerFlowCopy('deleteSession', '4HGGSS')

  assert.equal(result.title, 'Delete Session?')
  assert.match(result.body, /4HGGSS/)
  assert.match(result.body, /session scores/i)
  assert.equal(result.confirmLabel, 'Delete Session')
})
