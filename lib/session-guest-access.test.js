import assert from 'node:assert/strict'
import test from 'node:test'

import {
  SESSION_DUPLICATE_GUEST_MESSAGE,
  SESSION_PLAYER_GUEST_ONLY_MESSAGE,
  addGuestPlayerToSessionWithAccessCheck,
} from './session-guest-access.ts'

test('addGuestPlayerToSessionWithAccessCheck rejects users who are not in the session before inserting', async () => {
  let inserted = false

  await assert.rejects(
    () =>
      addGuestPlayerToSessionWithAccessCheck(
        'session-1',
        {
          guest_profile_id: 'guest-1',
          display_name: 'Mara',
        },
        {
          getCurrentUserId: async () => 'user-2',
          isCurrentUserInSession: async () => false,
          hasGuestProfileInSession: async () => false,
          getSessionParticipantCount: async () => 2,
          insertGuestEntry: async () => {
            inserted = true
            return {
              id: 'score-1',
              guest_profile_id: 'guest-1',
              guest_entry_id: 'entry-1',
              player_name: 'Mara',
            }
          },
        }
      ),
    new RegExp(SESSION_PLAYER_GUEST_ONLY_MESSAGE.replace('.', '\\.'))
  )

  assert.equal(inserted, false)
})

test('addGuestPlayerToSessionWithAccessCheck inserts for a joined session player', async () => {
  const result = await addGuestPlayerToSessionWithAccessCheck(
    'session-1',
    {
      guest_profile_id: 'guest-1',
      display_name: 'Mara',
    },
      {
        getCurrentUserId: async () => 'user-2',
        isCurrentUserInSession: async () => true,
        hasGuestProfileInSession: async () => false,
        getSessionParticipantCount: async () => 4,
        insertGuestEntry: async (payload) => ({
          id: 'score-1',
        guest_profile_id: payload.guestProfileId,
        guest_entry_id: 'entry-1',
        player_name: payload.displayName,
      }),
    }
  )

  assert.deepEqual(result, {
    id: 'score-1',
    guest_profile_id: 'guest-1',
    guest_entry_id: 'entry-1',
    player_name: 'Mara',
  })
})

test('addGuestPlayerToSessionWithAccessCheck rejects guests once the table already has 5 players', async () => {
  let inserted = false

  await assert.rejects(
    () =>
      addGuestPlayerToSessionWithAccessCheck(
        'session-1',
        {
          guest_profile_id: 'guest-1',
          display_name: 'Mara',
        },
        {
          getCurrentUserId: async () => 'user-2',
          isCurrentUserInSession: async () => true,
          hasGuestProfileInSession: async () => false,
          getSessionParticipantCount: async () => 5,
          insertGuestEntry: async () => {
            inserted = true
            return {
              id: 'score-1',
              guest_profile_id: 'guest-1',
              guest_entry_id: 'entry-1',
              player_name: 'Mara',
            }
          },
        }
      ),
    /at most 5 players/i
  )

  assert.equal(inserted, false)
})

test('addGuestPlayerToSessionWithAccessCheck rejects adding the same guest profile twice to one session', async () => {
  let inserted = false

  await assert.rejects(
    () =>
      addGuestPlayerToSessionWithAccessCheck(
        'session-1',
        {
          guest_profile_id: 'guest-1',
          display_name: 'Mara',
        },
        {
          getCurrentUserId: async () => 'user-2',
          isCurrentUserInSession: async () => true,
          getSessionParticipantCount: async () => 3,
          hasGuestProfileInSession: async () => true,
          insertGuestEntry: async () => {
            inserted = true
            return {
              id: 'score-1',
              guest_profile_id: 'guest-1',
              guest_entry_id: 'entry-1',
              player_name: 'Mara',
            }
          },
        }
      ),
    new RegExp(SESSION_DUPLICATE_GUEST_MESSAGE.replace('.', '\\.'))
  )

  assert.equal(inserted, false)
})
