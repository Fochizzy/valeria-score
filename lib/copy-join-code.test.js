import assert from 'node:assert/strict'
import test from 'node:test'

import { copyJoinCodeWithFeedback } from './copy-join-code.ts'

test('copyJoinCodeWithFeedback copies the join code and triggers feedback', async () => {
  const calls = []

  const result = await copyJoinCodeWithFeedback('ABC123', {
    setClipboardString: async (value) => {
      calls.push(['copy', value])
    },
    triggerSelectionFeedback: async () => {
      calls.push(['haptic'])
    },
    showAlert: (title, message) => {
      calls.push(['alert', title, message])
    },
  })

  assert.equal(result, true)
  assert.deepEqual(calls, [
    ['copy', 'ABC123'],
    ['haptic'],
    ['alert', 'Copied', 'Join code copied to clipboard.'],
  ])
})

test('copyJoinCodeWithFeedback ignores blank join codes', async () => {
  const calls = []

  const result = await copyJoinCodeWithFeedback('   ', {
    setClipboardString: async () => {
      calls.push(['copy'])
    },
    triggerSelectionFeedback: async () => {
      calls.push(['haptic'])
    },
    showAlert: () => {
      calls.push(['alert'])
    },
  })

  assert.equal(result, false)
  assert.deepEqual(calls, [])
})
