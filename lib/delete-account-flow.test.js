import assert from 'node:assert/strict'
import test from 'node:test'
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js'

import {
  deleteAccountAndSignOut,
  resolveDeleteAccountErrorMessage,
} from './delete-account-flow.ts'

test('deleteAccountAndSignOut invokes the delete-account function and clears the local session', async () => {
  const calls = []

  await deleteAccountAndSignOut({
    invokeDeleteAccount: async () => {
      calls.push('invokeDeleteAccount')
      return {
        data: { success: true },
        error: null,
      }
    },
    signOutLocal: async () => {
      calls.push('signOutLocal')
      return { error: null }
    },
  })

  assert.deepEqual(calls, ['invokeDeleteAccount', 'signOutLocal'])
})

test('deleteAccountAndSignOut surfaces a function payload error before trying to sign out', async () => {
  const calls = []

  await assert.rejects(
    () =>
      deleteAccountAndSignOut({
        invokeDeleteAccount: async () => {
          calls.push('invokeDeleteAccount')
          return {
            data: { error: 'Cannot delete account' },
            error: null,
          }
        },
        signOutLocal: async () => {
          calls.push('signOutLocal')
          return { error: null }
        },
      }),
    /Cannot delete account/
  )

  assert.deepEqual(calls, ['invokeDeleteAccount'])
})

test('resolveDeleteAccountErrorMessage unwraps JSON payloads from function HTTP errors', async () => {
  const error = new FunctionsHttpError({
    status: 500,
    json: async () => ({ error: 'Cannot delete account while cleanup is still running.' }),
    text: async () => 'unused',
  })

  const message = await resolveDeleteAccountErrorMessage(error)

  assert.equal(message, 'Cannot delete account while cleanup is still running.')
})

test('resolveDeleteAccountErrorMessage gives actionable guidance for relay and fetch errors', async () => {
  const relayMessage = await resolveDeleteAccountErrorMessage(
    new FunctionsRelayError({ region: 'us-east-1' })
  )
  const fetchMessage = await resolveDeleteAccountErrorMessage(
    new FunctionsFetchError({ reason: 'network down' })
  )

  assert.match(relayMessage, /delete-account function/i)
  assert.match(fetchMessage, /reach the delete-account function/i)
})
