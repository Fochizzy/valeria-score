import assert from 'node:assert/strict'
import test from 'node:test'

import { buildCompareEntryScoreRoute } from './compare-score-route.ts'

test('buildCompareEntryScoreRoute opens owned guest rows in guest score mode', () => {
  const route = buildCompareEntryScoreRoute(
    {
      id: 'score-guest-1',
      scoreId: 'score-guest-1',
      label: 'Mara',
      playerId: null,
      totalScore: 0,
      locked: false,
      isGuest: true,
      userId: 'user-1',
      dukeSlug: null,
      dukeName: 'No Duke Yet',
      placement: null,
      isWinner: false,
      hasScore: true,
      guestProfileId: 'guest-1',
      guestEntryId: 'entry-1',
    },
    {
      sessionId: 'session-1',
      joinCode: 'ABCD12',
      currentUserId: 'user-1',
    }
  )

  assert.deepEqual(route, {
    pathname: '/score',
    params: {
      sessionId: 'session-1',
      joinCode: 'ABCD12',
      guestMode: '1',
      guestName: 'Mara',
      guestProfileId: 'guest-1',
      guestEntryId: 'entry-1',
    },
  })
})

test('buildCompareEntryScoreRoute ignores guest rows owned by someone else', () => {
  const route = buildCompareEntryScoreRoute(
    {
      id: 'score-guest-1',
      scoreId: 'score-guest-1',
      label: 'Mara',
      playerId: null,
      totalScore: 0,
      locked: false,
      isGuest: true,
      userId: 'user-1',
      dukeSlug: null,
      dukeName: 'No Duke Yet',
      placement: null,
      isWinner: false,
      hasScore: false,
      guestProfileId: 'guest-1',
      guestEntryId: 'entry-1',
    },
    {
      sessionId: 'session-1',
      joinCode: 'ABCD12',
      currentUserId: 'user-2',
    }
  )

  assert.equal(route, null)
})

test('buildCompareEntryScoreRoute opens the current user row in regular score mode', () => {
  const route = buildCompareEntryScoreRoute(
    {
      id: 'score-1',
      scoreId: 'score-1',
      label: 'Izzy',
      playerId: 'FOCHIZZY',
      totalScore: 31,
      locked: false,
      isGuest: false,
      userId: 'user-1',
      dukeSlug: 'cornelius_the_dreamer',
      dukeName: 'Cornelius the Dreamer',
      placement: 1,
      isWinner: true,
      hasScore: true,
      guestProfileId: null,
      guestEntryId: null,
    },
    {
      sessionId: 'session-1',
      joinCode: 'ABCD12',
      currentUserId: 'user-1',
    }
  )

  assert.deepEqual(route, {
    pathname: '/score',
    params: {
      sessionId: 'session-1',
      joinCode: 'ABCD12',
    },
  })
})

test('buildCompareEntryScoreRoute ignores non-guest rows that belong to someone else', () => {
  const route = buildCompareEntryScoreRoute(
    {
      id: 'score-1',
      scoreId: 'score-1',
      label: 'Izzy',
      playerId: 'FOCHIZZY',
      totalScore: 31,
      locked: false,
      isGuest: false,
      userId: 'user-1',
      dukeSlug: 'cornelius_the_dreamer',
      dukeName: 'Cornelius the Dreamer',
      placement: 1,
      isWinner: true,
      hasScore: true,
      guestProfileId: null,
      guestEntryId: null,
    },
    {
      sessionId: 'session-1',
      joinCode: 'ABCD12',
      currentUserId: 'user-2',
    }
  )

  assert.equal(route, null)
})

// Phase 3 added-player rows. These come from add_player_to_session and have
// player_name set (so isGuest evaluates to true) but no guest profile/entry
// — owner_user_id points at the linked player, scored_by_user_id at the
// adder. The adder should be able to tap to edit until the linked player
// joins the session and the auto-merge trigger flips scored_by_user_id.

test('buildCompareEntryScoreRoute lets the adder edit a player they added as a guest', () => {
  const route = buildCompareEntryScoreRoute(
    {
      id: 'score-added-1',
      scoreId: 'score-added-1',
      label: 'GregMTG',
      playerId: 'GREGMTG',
      totalScore: 0,
      locked: false,
      // player_name is set on add_player_to_session inserts, so the
      // identity helper marks the row as a guest even though it links a
      // real user.
      isGuest: true,
      userId: 'added-player-user-id',
      scoredByUserId: 'adder-user-id',
      dukeSlug: null,
      dukeName: 'No Duke Yet',
      placement: null,
      isWinner: false,
      hasScore: false,
      guestProfileId: null,
      guestEntryId: null,
    },
    {
      sessionId: 'session-1',
      joinCode: 'ABCD12',
      currentUserId: 'adder-user-id',
    }
  )

  assert.deepEqual(route, {
    pathname: '/score',
    params: {
      sessionId: 'session-1',
      joinCode: 'ABCD12',
      addedUserId: 'added-player-user-id',
      addedPlayerName: 'GregMTG',
      addedPlayerId: 'GREGMTG',
    },
  })
})

test('buildCompareEntryScoreRoute blocks the adder once the added player has logged in', () => {
  // After the linked player joins the session the auto-merge trigger sets
  // scored_by_user_id = the joining user. The original adder no longer
  // matches the editor and they are not the linked player either, so the
  // route should be null — only the now-logged-in player can edit.
  const route = buildCompareEntryScoreRoute(
    {
      id: 'score-added-1',
      scoreId: 'score-added-1',
      label: 'GregMTG',
      playerId: 'GREGMTG',
      totalScore: 0,
      locked: false,
      isGuest: true,
      userId: 'added-player-user-id',
      scoredByUserId: 'added-player-user-id',
      dukeSlug: null,
      dukeName: 'No Duke Yet',
      placement: null,
      isWinner: false,
      hasScore: false,
      guestProfileId: null,
      guestEntryId: null,
    },
    {
      sessionId: 'session-1',
      joinCode: 'ABCD12',
      currentUserId: 'adder-user-id',
    }
  )

  assert.equal(route, null)
})

test('buildCompareEntryScoreRoute lets the now-logged-in player edit their own added-player row', () => {
  // After the auto-merge trigger flips scored_by_user_id to the joining
  // player, that player is now both the linked user AND the editor. The
  // self-played branch should match and route to /score.
  const route = buildCompareEntryScoreRoute(
    {
      id: 'score-added-1',
      scoreId: 'score-added-1',
      label: 'GregMTG',
      playerId: 'GREGMTG',
      totalScore: 0,
      locked: false,
      isGuest: true,
      userId: 'added-player-user-id',
      scoredByUserId: 'added-player-user-id',
      dukeSlug: null,
      dukeName: 'No Duke Yet',
      placement: null,
      isWinner: false,
      hasScore: false,
      guestProfileId: null,
      guestEntryId: null,
    },
    {
      sessionId: 'session-1',
      joinCode: 'ABCD12',
      currentUserId: 'added-player-user-id',
    }
  )

  assert.deepEqual(route, {
    pathname: '/score',
    params: {
      sessionId: 'session-1',
      joinCode: 'ABCD12',
    },
  })
})
