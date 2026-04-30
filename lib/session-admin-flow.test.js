import assert from 'node:assert/strict'
import test from 'node:test'

import {
  deleteInProgressSessionViaRpc,
  finishGameViaRpc,
} from './session-admin-flow.ts'

test('deleteInProgressSessionViaRpc calls the delete_in_progress_session rpc', async () => {
  const calls = []

  await deleteInProgressSessionViaRpc('session-1', {
    invokeRpc: async (fn, args) => {
      calls.push([fn, args])
      return { error: null }
    },
  })

  assert.deepEqual(calls, [
    ['delete_in_progress_session', { p_session_id: 'session-1' }],
  ])
})

test('deleteInProgressSessionViaRpc falls back to delete_game when the newer rpc is missing', async () => {
  const calls = []

  await deleteInProgressSessionViaRpc('session-1', {
    invokeRpc: async (fn, args) => {
      calls.push([fn, args])

      if (fn === 'delete_in_progress_session') {
        return {
          error: {
            message:
              'Could not find the function public.delete_in_progress_session(p_session_id) in the schema cache',
          },
        }
      }

      return { error: null }
    },
  })

  assert.deepEqual(calls, [
    ['delete_in_progress_session', { p_session_id: 'session-1' }],
    ['delete_game', { p_session_id: 'session-1' }],
  ])
})

test('deleteInProgressSessionViaRpc surfaces the original error when fallback is not applicable', async () => {
  await assert.rejects(
    () =>
      deleteInProgressSessionViaRpc('session-1', {
        invokeRpc: async () => ({
          error: {
            message: 'Only the session creator can delete this in-progress session',
          },
        }),
      }),
    /Only the session creator can delete this in-progress session/
  )
})

test('finishGameViaRpc calls the finish_game rpc', async () => {
  const calls = []

  await finishGameViaRpc('session-1', {
    invokeRpc: async (fn, args) => {
      calls.push([fn, args])
      return { error: null }
    },
  })

  assert.deepEqual(calls, [['finish_game', { p_session_id: 'session-1' }]])
})

test('finishGameViaRpc surfaces rpc errors', async () => {
  await assert.rejects(
    () =>
      finishGameViaRpc('session-1', {
        invokeRpc: async () => ({
          error: { message: 'Only the session creator can finish this game.' },
        }),
      }),
    /Only the session creator can finish this game\./
  )
})
