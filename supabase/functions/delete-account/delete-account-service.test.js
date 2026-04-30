import assert from 'node:assert/strict'
import test from 'node:test'

import { deleteAccountAndData } from './delete-account-service.ts'

test('deleteAccountAndData removes owned sessions, guest data, user data, profile, and auth user in order', async () => {
  const calls = []

  await deleteAccountAndData('user-1', {
    getOwnedInProgressSessionIds: async (userId) => {
      calls.push(['getOwnedInProgressSessionIds', userId])
      return ['session-1', 'session-2']
    },
    getOwnedGuestProfileIds: async (userId) => {
      calls.push(['getOwnedGuestProfileIds', userId])
      return ['guest-1']
    },
    deletePlayerScoresBySessionIds: async (sessionIds) => {
      calls.push(['deletePlayerScoresBySessionIds', sessionIds])
    },
    deleteSessionScoresBySessionIds: async (sessionIds) => {
      calls.push(['deleteSessionScoresBySessionIds', sessionIds])
    },
    deleteSessionPlayersBySessionIds: async (sessionIds) => {
      calls.push(['deleteSessionPlayersBySessionIds', sessionIds])
    },
    deleteGameSessionsByIds: async (sessionIds) => {
      calls.push(['deleteGameSessionsByIds', sessionIds])
    },
    deletePlayerScoresByGuestIds: async (guestIds) => {
      calls.push(['deletePlayerScoresByGuestIds', guestIds])
    },
    detachLockedSessionScoresByGuestIds: async (guestIds) => {
      calls.push(['detachLockedSessionScoresByGuestIds', guestIds])
    },
    deleteUnlockedSessionScoresByGuestIds: async (guestIds) => {
      calls.push(['deleteUnlockedSessionScoresByGuestIds', guestIds])
    },
    deletePlayerScoresByUserId: async (userId) => {
      calls.push(['deletePlayerScoresByUserId', userId])
    },
    deletePlayerScoresByOwnerUserId: async (userId) => {
      calls.push(['deletePlayerScoresByOwnerUserId', userId])
    },
    anonymizeLockedSessionScoresByOwnerUserId: async (userId) => {
      calls.push(['anonymizeLockedSessionScoresByOwnerUserId', userId])
    },
    deleteUnlockedSessionScoresByOwnerUserId: async (userId) => {
      calls.push(['deleteUnlockedSessionScoresByOwnerUserId', userId])
    },
    deleteSessionPlayersByUserId: async (userId) => {
      calls.push(['deleteSessionPlayersByUserId', userId])
    },
    unlinkGuestProfilesByLinkedUserId: async (userId) => {
      calls.push(['unlinkGuestProfilesByLinkedUserId', userId])
    },
    deleteGuestProfilesByOwnerUserId: async (userId) => {
      calls.push(['deleteGuestProfilesByOwnerUserId', userId])
    },
    deleteProfileById: async (userId) => {
      calls.push(['deleteProfileById', userId])
    },
    deleteAuthUserById: async (userId) => {
      calls.push(['deleteAuthUserById', userId])
    },
  })

  assert.deepEqual(calls, [
    ['getOwnedInProgressSessionIds', 'user-1'],
    ['getOwnedGuestProfileIds', 'user-1'],
    ['deletePlayerScoresBySessionIds', ['session-1', 'session-2']],
    ['deleteSessionScoresBySessionIds', ['session-1', 'session-2']],
    ['deleteSessionPlayersBySessionIds', ['session-1', 'session-2']],
    ['deleteGameSessionsByIds', ['session-1', 'session-2']],
    ['deletePlayerScoresByGuestIds', ['guest-1']],
    ['detachLockedSessionScoresByGuestIds', ['guest-1']],
    ['deleteUnlockedSessionScoresByGuestIds', ['guest-1']],
    ['deletePlayerScoresByUserId', 'user-1'],
    ['deletePlayerScoresByOwnerUserId', 'user-1'],
    ['anonymizeLockedSessionScoresByOwnerUserId', 'user-1'],
    ['deleteUnlockedSessionScoresByOwnerUserId', 'user-1'],
    ['deleteSessionPlayersByUserId', 'user-1'],
    ['unlinkGuestProfilesByLinkedUserId', 'user-1'],
    ['deleteGuestProfilesByOwnerUserId', 'user-1'],
    ['deleteProfileById', 'user-1'],
    ['deleteAuthUserById', 'user-1'],
  ])
})

test('deleteAccountAndData skips owned-session and owned-guest cleanup when nothing is owned', async () => {
  const calls = []

  await deleteAccountAndData('user-1', {
    getOwnedInProgressSessionIds: async () => [],
    getOwnedGuestProfileIds: async () => [],
    deletePlayerScoresBySessionIds: async () => {
      calls.push('deletePlayerScoresBySessionIds')
    },
    deleteSessionScoresBySessionIds: async () => {
      calls.push('deleteSessionScoresBySessionIds')
    },
    deleteSessionPlayersBySessionIds: async () => {
      calls.push('deleteSessionPlayersBySessionIds')
    },
    deleteGameSessionsByIds: async () => {
      calls.push('deleteGameSessionsByIds')
    },
    deletePlayerScoresByGuestIds: async () => {
      calls.push('deletePlayerScoresByGuestIds')
    },
    detachLockedSessionScoresByGuestIds: async () => {
      calls.push('detachLockedSessionScoresByGuestIds')
    },
    deleteUnlockedSessionScoresByGuestIds: async () => {
      calls.push('deleteUnlockedSessionScoresByGuestIds')
    },
    deletePlayerScoresByUserId: async (userId) => {
      calls.push(['deletePlayerScoresByUserId', userId])
    },
    deletePlayerScoresByOwnerUserId: async (userId) => {
      calls.push(['deletePlayerScoresByOwnerUserId', userId])
    },
    anonymizeLockedSessionScoresByOwnerUserId: async (userId) => {
      calls.push(['anonymizeLockedSessionScoresByOwnerUserId', userId])
    },
    deleteUnlockedSessionScoresByOwnerUserId: async (userId) => {
      calls.push(['deleteUnlockedSessionScoresByOwnerUserId', userId])
    },
    deleteSessionPlayersByUserId: async (userId) => {
      calls.push(['deleteSessionPlayersByUserId', userId])
    },
    unlinkGuestProfilesByLinkedUserId: async (userId) => {
      calls.push(['unlinkGuestProfilesByLinkedUserId', userId])
    },
    deleteGuestProfilesByOwnerUserId: async (userId) => {
      calls.push(['deleteGuestProfilesByOwnerUserId', userId])
    },
    deleteProfileById: async (userId) => {
      calls.push(['deleteProfileById', userId])
    },
    deleteAuthUserById: async (userId) => {
      calls.push(['deleteAuthUserById', userId])
    },
  })

  assert.deepEqual(calls, [
    ['deletePlayerScoresByUserId', 'user-1'],
    ['deletePlayerScoresByOwnerUserId', 'user-1'],
    ['anonymizeLockedSessionScoresByOwnerUserId', 'user-1'],
    ['deleteUnlockedSessionScoresByOwnerUserId', 'user-1'],
    ['deleteSessionPlayersByUserId', 'user-1'],
    ['unlinkGuestProfilesByLinkedUserId', 'user-1'],
    ['deleteGuestProfilesByOwnerUserId', 'user-1'],
    ['deleteProfileById', 'user-1'],
    ['deleteAuthUserById', 'user-1'],
  ])
})

test('deleteAccountAndData stops when a delete step fails', async () => {
  const calls = []

  await assert.rejects(
    () =>
      deleteAccountAndData('user-1', {
        getOwnedInProgressSessionIds: async () => ['session-1'],
        getOwnedGuestProfileIds: async () => [],
        deletePlayerScoresBySessionIds: async () => {
          calls.push('deletePlayerScoresBySessionIds')
        },
        deleteSessionScoresBySessionIds: async () => {
          calls.push('deleteSessionScoresBySessionIds')
          throw new Error('session score cleanup failed')
        },
        deleteSessionPlayersBySessionIds: async () => {
          calls.push('deleteSessionPlayersBySessionIds')
        },
        deleteGameSessionsByIds: async () => {
          calls.push('deleteGameSessionsByIds')
        },
        deletePlayerScoresByGuestIds: async () => undefined,
        detachLockedSessionScoresByGuestIds: async () => undefined,
        deleteUnlockedSessionScoresByGuestIds: async () => undefined,
        deletePlayerScoresByUserId: async () => undefined,
        deletePlayerScoresByOwnerUserId: async () => undefined,
        anonymizeLockedSessionScoresByOwnerUserId: async () => undefined,
        deleteUnlockedSessionScoresByOwnerUserId: async () => undefined,
        deleteSessionPlayersByUserId: async () => undefined,
        unlinkGuestProfilesByLinkedUserId: async () => undefined,
        deleteGuestProfilesByOwnerUserId: async () => undefined,
        deleteProfileById: async () => undefined,
        deleteAuthUserById: async () => undefined,
      }),
    /session score cleanup failed/
  )

  assert.deepEqual(calls, [
    'deletePlayerScoresBySessionIds',
    'deleteSessionScoresBySessionIds',
  ])
})
