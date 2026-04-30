import assert from 'node:assert/strict'
import test from 'node:test'

import { deleteGuestProfileWithCleanup } from './guest-profile-delete-flow.ts'

test('deleteGuestProfileWithCleanup deletes guest-owned session scores before the guest profile row', async () => {
  const calls = []

  await deleteGuestProfileWithCleanup('guest-1', {
    getCurrentUserId: async () => 'user-1',
    deleteSessionScores: async (filters) => {
      calls.push(['session_scores', filters])
      return { error: null }
    },
    deleteGuestProfileRow: async (filters) => {
      calls.push(['guest_profiles', filters])
      return { error: null }
    },
  })

  assert.deepEqual(calls, [
    ['session_scores', { guestId: 'guest-1', ownerUserId: 'user-1' }],
    ['guest_profiles', { guestId: 'guest-1', ownerUserId: 'user-1' }],
  ])
})

test('deleteGuestProfileWithCleanup requires an authenticated user before deleting anything', async () => {
  await assert.rejects(
    () =>
      deleteGuestProfileWithCleanup('guest-1', {
        getCurrentUserId: async () => null,
        deleteSessionScores: async () => ({ error: null }),
        deleteGuestProfileRow: async () => ({ error: null }),
      }),
    /User not authenticated/
  )
})

test('deleteGuestProfileWithCleanup stops when deleting session scores fails', async () => {
  const calls = []

  await assert.rejects(
    () =>
      deleteGuestProfileWithCleanup('guest-1', {
        getCurrentUserId: async () => 'user-1',
        deleteSessionScores: async () => {
          calls.push('session_scores')
          return {
            error: {
              message: 'Could not delete guest-owned session scores.',
            },
          }
        },
        deleteGuestProfileRow: async () => {
          calls.push('guest_profiles')
          return { error: null }
        },
      }),
    /Could not delete guest-owned session scores\./
  )

  assert.deepEqual(calls, ['session_scores'])
})
