import assert from 'node:assert/strict'
import test from 'node:test'

import {
  deleteGuestProfile,
  leaveAllGames,
  deleteMyAccountAndData,
  deleteMyProfile,
  deleteOwnedGame,
  leaveOwnedOrJoinedGame,
} from './manage-delete-flow.ts'

test('deleteMyProfile calls the delete_my_profile rpc', async () => {
  const calls = []

  await deleteMyProfile({
    invokeRpc: async (fn, args) => {
      calls.push([fn, args])
      return { error: null }
    },
  })

  assert.deepEqual(calls, [['delete_my_profile', undefined]])
})

test('deleteMyAccountAndData deletes the account before signing out locally', async () => {
  const calls = []

  await deleteMyAccountAndData({
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

test('deleteGuestProfile scopes both cleanup deletes to the current user', async () => {
  const calls = []

  await deleteGuestProfile('guest-1', {
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

test('deleteOwnedGame calls the delete_game rpc', async () => {
  const calls = []

  await deleteOwnedGame('session-1', {
    invokeRpc: async (fn, args) => {
      calls.push([fn, args])
      return { error: null }
    },
  })

  assert.deepEqual(calls, [['delete_game', { p_session_id: 'session-1' }]])
})

test('leaveOwnedOrJoinedGame calls the leave_game rpc', async () => {
  const calls = []

  await leaveOwnedOrJoinedGame('session-1', {
    invokeRpc: async (fn, args) => {
      calls.push([fn, args])
      return { error: null }
    },
  })

  assert.deepEqual(calls, [['leave_game', { p_session_id: 'session-1' }]])
})

test('leaveAllGames calls the leave_all_games rpc', async () => {
  const calls = []

  await leaveAllGames({
    invokeRpc: async (fn, args) => {
      calls.push([fn, args])
      return { error: null }
    },
  })

  assert.deepEqual(calls, [['leave_all_games', undefined]])
})
