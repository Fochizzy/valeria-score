import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCompareGuestRemovalPlan,
  removeGuestCompareEntryWithAccessCheck,
} from './compare-guest-removal.ts'

test('buildCompareGuestRemovalPlan allows the adder (scoredByUserId) to remove their guest entry', () => {
  const plan = buildCompareGuestRemovalPlan({
    viewerCanRemove: true,
    expectedPlayerCount: 4,
    minimumPlayerCount: 3,
    entry: {
      isGuest: true,
      scoreId: 'score-1',
      guestEntryId: 'guest-entry-1',
      scoredByUserId: 'user-1',
      userId: 'user-1',
    },
  })

  assert.deepEqual(plan, {
    canRemove: true,
    nextExpectedPlayerCount: 3,
    removalMode: 'guest-entry',
  })
})

test('buildCompareGuestRemovalPlan allows the host to remove an added-player guest seat', () => {
  const plan = buildCompareGuestRemovalPlan({
    viewerCanRemove: true,
    expectedPlayerCount: 4,
    minimumPlayerCount: 3,
    entry: {
      isGuest: true,
      scoreId: 'score-1',
      guestEntryId: null,
      scoredByUserId: 'host-user-id',
      userId: 'added-player-user-id',
    },
  })

  assert.deepEqual(plan, {
    canRemove: true,
    nextExpectedPlayerCount: 3,
    removalMode: 'added-player-entry',
  })
})

test('buildCompareGuestRemovalPlan blocks removal when the viewer is not allowed to manage guest seats', () => {
  assert.deepEqual(
    buildCompareGuestRemovalPlan({
      viewerCanRemove: false,
      expectedPlayerCount: 4,
      minimumPlayerCount: 3,
      entry: {
        isGuest: true,
        scoreId: 'score-1',
        guestEntryId: 'guest-entry-1',
        scoredByUserId: 'user-1',
        userId: 'user-1',
      },
    }),
    {
      canRemove: false,
      nextExpectedPlayerCount: null,
      removalMode: null,
    }
  )
})

test('buildCompareGuestRemovalPlan blocks added-player removal once the linked player has taken over the row', () => {
  const plan = buildCompareGuestRemovalPlan({
    viewerCanRemove: true,
    expectedPlayerCount: 4,
    minimumPlayerCount: 3,
    entry: {
      isGuest: true,
      scoreId: 'score-1',
      guestEntryId: null,
      scoredByUserId: 'added-player',
      userId: 'added-player',
    },
  })

  assert.deepEqual(plan, {
    canRemove: false,
    nextExpectedPlayerCount: null,
    removalMode: null,
  })
})

test('buildCompareGuestRemovalPlan blocks non-guest rows even when the viewer matches', () => {
  assert.deepEqual(
    buildCompareGuestRemovalPlan({
      viewerCanRemove: true,
      expectedPlayerCount: 4,
      minimumPlayerCount: 3,
      entry: {
        isGuest: false,
        scoreId: 'score-1',
        guestEntryId: null,
        scoredByUserId: 'user-1',
        userId: 'user-1',
      },
    }),
    {
      canRemove: false,
      nextExpectedPlayerCount: null,
      removalMode: null,
    }
  )
})

test('buildCompareGuestRemovalPlan blocks removal when there is no removable guest-seat identity', () => {
  assert.deepEqual(
    buildCompareGuestRemovalPlan({
      viewerCanRemove: true,
      expectedPlayerCount: 4,
      minimumPlayerCount: 3,
      entry: {
        isGuest: true,
        scoreId: 'score-1',
        guestEntryId: null,
        scoredByUserId: 'user-1',
        userId: 'user-1',
      },
    }),
    {
      canRemove: false,
      nextExpectedPlayerCount: null,
      removalMode: null,
    }
  )
})

test('removeGuestCompareEntryWithAccessCheck deletes the guest seat and updates the player target', async () => {
  const calls = []

  const result = await removeGuestCompareEntryWithAccessCheck(
    {
      sessionId: 'session-1',
      scoreId: 'score-1',
      removalMode: 'guest-entry',
      guestEntryId: 'guest-entry-1',
      nextExpectedPlayerCount: 3,
    },
    {
      getCurrentUserId: async () => 'host-1',
      assertSessionCreatorAccess: async (sessionId, currentUserId) => {
        calls.push(['game_sessions_host_check', { sessionId, currentUserId }])
      },
      deleteGuestScoreRow: async (filters) => {
        calls.push(['session_scores', filters])
      },
      updateExpectedPlayerCount: async (payload) => {
        calls.push(['game_sessions', payload])
      },
    }
  )

  assert.deepEqual(calls, [
    [
      'game_sessions_host_check',
      {
        sessionId: 'session-1',
        currentUserId: 'host-1',
      },
    ],
    [
      'session_scores',
      {
        removalMode: 'guest-entry',
        sessionId: 'session-1',
        scoreId: 'score-1',
        guestEntryId: 'guest-entry-1',
      },
    ],
    [
      'game_sessions',
      {
        sessionId: 'session-1',
        expectedPlayerCount: 3,
        creatorUserId: 'host-1',
      },
    ],
  ])
  assert.deepEqual(result, { expectedPlayerCount: 3 })
})

test('removeGuestCompareEntryWithAccessCheck deletes an added-player seat by score and owner id', async () => {
  const calls = []

  const result = await removeGuestCompareEntryWithAccessCheck(
    {
      sessionId: 'session-1',
      scoreId: 'score-1',
      removalMode: 'added-player-entry',
      ownerUserId: 'added-player-user-id',
      nextExpectedPlayerCount: 3,
    },
    {
      getCurrentUserId: async () => 'host-1',
      assertSessionCreatorAccess: async (sessionId, currentUserId) => {
        calls.push(['game_sessions_host_check', { sessionId, currentUserId }])
      },
      deleteGuestScoreRow: async (filters) => {
        calls.push(['session_scores', filters])
      },
      updateExpectedPlayerCount: async (payload) => {
        calls.push(['game_sessions', payload])
      },
    }
  )

  assert.deepEqual(calls, [
    [
      'game_sessions_host_check',
      {
        sessionId: 'session-1',
        currentUserId: 'host-1',
      },
    ],
    [
      'session_scores',
      {
        removalMode: 'added-player-entry',
        sessionId: 'session-1',
        scoreId: 'score-1',
        ownerUserId: 'added-player-user-id',
      },
    ],
    [
      'game_sessions',
      {
        sessionId: 'session-1',
        expectedPlayerCount: 3,
        creatorUserId: 'host-1',
      },
    ],
  ])
  assert.deepEqual(result, { expectedPlayerCount: 3 })
})

test('removeGuestCompareEntryWithAccessCheck blocks removals when access check throws', async () => {
  const calls = []

  await assert.rejects(
    () =>
      removeGuestCompareEntryWithAccessCheck(
        {
          sessionId: 'session-1',
          scoreId: 'score-1',
          removalMode: 'guest-entry',
          guestEntryId: 'guest-entry-1',
          nextExpectedPlayerCount: 3,
        },
        {
          getCurrentUserId: async () => 'user-2',
          assertSessionCreatorAccess: async () => {
            throw new Error('Only the host can remove guests from this game.')
          },
          deleteGuestScoreRow: async () => {
            calls.push('delete')
          },
          updateExpectedPlayerCount: async () => {
            calls.push('update')
          },
        }
      ),
    /Only the host can remove guests from this game\./
  )

  assert.deepEqual(calls, [])
})

test('removeGuestCompareEntryWithAccessCheck requires an authenticated user', async () => {
  await assert.rejects(
    () =>
      removeGuestCompareEntryWithAccessCheck(
        {
          sessionId: 'session-1',
          scoreId: 'score-1',
          removalMode: 'guest-entry',
          guestEntryId: 'guest-entry-1',
          nextExpectedPlayerCount: 3,
        },
        {
          getCurrentUserId: async () => null,
          assertSessionCreatorAccess: async () => {},
          deleteGuestScoreRow: async () => {},
          updateExpectedPlayerCount: async () => {},
        }
    ),
    /User not authenticated/
  )
})

test('removeGuestCompareEntryWithAccessCheck requires an owner id for added-player removals', async () => {
  await assert.rejects(
    () =>
      removeGuestCompareEntryWithAccessCheck(
        {
          sessionId: 'session-1',
          scoreId: 'score-1',
          removalMode: 'added-player-entry',
          nextExpectedPlayerCount: 3,
        },
        {
          getCurrentUserId: async () => 'host-1',
          assertSessionCreatorAccess: async () => {},
          deleteGuestScoreRow: async () => {},
          updateExpectedPlayerCount: async () => {},
        }
      ),
    /Missing added player owner id/
  )
})
