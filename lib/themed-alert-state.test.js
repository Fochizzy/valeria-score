import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clearThemedAlertQueue,
  dismissCurrentThemedAlert,
  enqueueThemedAlert,
  getCurrentThemedAlert,
  normalizeThemedAlertButtons,
  pressCurrentThemedAlert,
} from './themed-alert-state.ts'

test('normalizeThemedAlertButtons falls back to a single OK action', () => {
  assert.deepEqual(normalizeThemedAlertButtons(), [{ text: 'OK' }])
})

test('pressCurrentThemedAlert advances the queue and runs the pressed action', () => {
  clearThemedAlertQueue()
  let pressed = 0

  enqueueThemedAlert({
    title: 'First',
    buttons: [{ text: 'Continue', onPress: () => { pressed += 1 } }],
  })
  enqueueThemedAlert({
    title: 'Second',
    buttons: [{ text: 'Done' }],
  })

  assert.equal(getCurrentThemedAlert()?.title, 'First')
  pressCurrentThemedAlert(0)
  assert.equal(pressed, 1)
  assert.equal(getCurrentThemedAlert()?.title, 'Second')

  clearThemedAlertQueue()
})

test('dismissCurrentThemedAlert runs onDismiss and reveals the next dialog', () => {
  clearThemedAlertQueue()
  let dismissed = 0

  enqueueThemedAlert({
    title: 'Dismiss me',
    options: {
      onDismiss: () => {
        dismissed += 1
      },
    },
  })
  enqueueThemedAlert({
    title: 'Next up',
  })

  dismissCurrentThemedAlert()
  assert.equal(dismissed, 1)
  assert.equal(getCurrentThemedAlert()?.title, 'Next up')

  clearThemedAlertQueue()
})
