import assert from 'node:assert/strict'
import test from 'node:test'

import { logoutAndClearActiveSessionState } from './logout.ts'

test('logoutAndClearActiveSessionState signs out before clearing stored session context', async () => {
  const calls = []

  await logoutAndClearActiveSessionState({
    signOut: async () => {
      calls.push('signOut')
      return { error: null }
    },
    clearActiveSessionState: async () => {
      calls.push('clearActiveSessionState')
    },
  })

  assert.deepEqual(calls, ['signOut', 'clearActiveSessionState'])
})

test('logoutAndClearActiveSessionState stops when sign out fails', async () => {
  const error = new Error('sign out failed')

  await assert.rejects(
    logoutAndClearActiveSessionState({
      signOut: async () => ({ error }),
      clearActiveSessionState: async () => {
        throw new Error('should not run')
      },
    }),
    error
  )
})
