import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createUserOrRecoverExistingAccount,
  isExistingUserSignUpError,
} from './create-user-flow.ts'

test('isExistingUserSignUpError detects duplicate-account messages', () => {
  assert.equal(isExistingUserSignUpError('User already registered'), true)
  assert.equal(isExistingUserSignUpError('A user with this email already exists'), true)
  assert.equal(isExistingUserSignUpError('Invalid login credentials'), false)
})

test('createUserOrRecoverExistingAccount signs in and recreates a missing profile when email already exists', async () => {
  const calls = []

  const result = await createUserOrRecoverExistingAccount(
    {
      email: 'player@example.com',
      password: 'hunter2',
      displayName: 'Player',
    },
    {
      signUp: async () => {
        calls.push('signUp')
        return {
          data: { session: null },
          error: { message: 'User already registered' },
        }
      },
      signInWithPassword: async () => {
        calls.push('signInWithPassword')
        return {
          error: null,
        }
      },
      signOut: async () => {
        calls.push('signOut')
      },
      ensureProfileRow: async () => {
        calls.push('ensureProfileRow')
      },
      getMyProfile: async () => {
        calls.push('getMyProfile')
        return { public_player_id: null }
      },
    }
  )

  assert.deepEqual(calls, [
    'signUp',
    'signInWithPassword',
    'ensureProfileRow',
    'getMyProfile',
  ])
  assert.deepEqual(result, {
    recoveredExistingAccount: true,
    nextRoute: '/choose-player-id',
  })
})

test('createUserOrRecoverExistingAccount treats an identity-less signup response as an existing account', async () => {
  const calls = []

  const result = await createUserOrRecoverExistingAccount(
    {
      email: 'player@example.com',
      password: 'hunter2',
      displayName: 'Player',
    },
    {
      signUp: async () => {
        calls.push('signUp')
        return {
          data: {
            session: null,
            user: {
              email: 'player@example.com',
              identities: [],
            },
          },
          error: null,
        }
      },
      signInWithPassword: async () => {
        calls.push('signInWithPassword')
        return {
          error: null,
        }
      },
      signOut: async () => {
        calls.push('signOut')
      },
      ensureProfileRow: async () => {
        calls.push('ensureProfileRow')
      },
      getMyProfile: async () => {
        calls.push('getMyProfile')
        return { public_player_id: 'KINGDOM42' }
      },
    }
  )

  assert.deepEqual(calls, [
    'signUp',
    'signInWithPassword',
    'ensureProfileRow',
    'getMyProfile',
  ])
  assert.deepEqual(result, {
    recoveredExistingAccount: true,
    nextRoute: '/create-session',
  })
})

test('createUserOrRecoverExistingAccount sends new users to /login (force email confirmation) and signs them out', async () => {
  const calls = []

  const result = await createUserOrRecoverExistingAccount(
    {
      email: 'new@example.com',
      password: 'hunter2',
      displayName: 'New Player',
    },
    {
      signUp: async () => {
        calls.push('signUp')
        return {
          data: { session: { access_token: 'token' } },
          error: null,
        }
      },
      signInWithPassword: async () => {
        throw new Error('signInWithPassword should not be called for new users')
      },
      signOut: async () => {
        calls.push('signOut')
      },
      ensureProfileRow: async () => {
        throw new Error('ensureProfileRow should not be called for new users — they must confirm email first')
      },
      getMyProfile: async () => {
        throw new Error('getMyProfile should not be called for new users')
      },
    }
  )

  assert.deepEqual(calls, ['signUp', 'signOut'])
  assert.deepEqual(result, {
    recoveredExistingAccount: false,
    nextRoute: '/login',
  })
})

test('createUserOrRecoverExistingAccount tolerates a signOut failure and still routes to /login', async () => {
  const result = await createUserOrRecoverExistingAccount(
    {
      email: 'new@example.com',
      password: 'hunter2',
      displayName: 'New Player',
    },
    {
      signUp: async () => ({
        data: { session: { access_token: 'token' } },
        error: null,
      }),
      signInWithPassword: async () => {
        throw new Error('should not be called')
      },
      signOut: async () => {
        throw new Error('local sign-out failed')
      },
      ensureProfileRow: async () => undefined,
      getMyProfile: async () => ({ public_player_id: null }),
    }
  )

  assert.deepEqual(result, {
    recoveredExistingAccount: false,
    nextRoute: '/login',
  })
})

test('createUserOrRecoverExistingAccount still routes to /login when supabase already returned no session (email-confirm setup)', async () => {
  const result = await createUserOrRecoverExistingAccount(
    {
      email: 'new@example.com',
      password: 'hunter2',
      displayName: 'New Player',
    },
    {
      signUp: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async () => {
        throw new Error('should not be called')
      },
      signOut: async () => {
        throw new Error('signOut should not be called when no session was returned')
      },
      ensureProfileRow: async () => undefined,
      getMyProfile: async () => ({ public_player_id: null }),
    }
  )

  assert.deepEqual(result, {
    recoveredExistingAccount: false,
    nextRoute: '/login',
  })
})

test('createUserOrRecoverExistingAccount keeps a real identity-backed signup on the email-confirm path', async () => {
  const calls = []

  const result = await createUserOrRecoverExistingAccount(
    {
      email: 'new@example.com',
      password: 'hunter2',
      displayName: 'New Player',
    },
    {
      signUp: async () => {
        calls.push('signUp')
        return {
          data: {
            session: null,
            user: {
              email: 'new@example.com',
              identities: [{ provider: 'email' }],
            },
          },
          error: null,
        }
      },
      signInWithPassword: async () => {
        calls.push('signInWithPassword')
        throw new Error('signInWithPassword should not be called for a real new signup')
      },
      signOut: async () => {
        calls.push('signOut')
      },
      ensureProfileRow: async () => {
        calls.push('ensureProfileRow')
      },
      getMyProfile: async () => {
        calls.push('getMyProfile')
        return { public_player_id: null }
      },
    }
  )

  assert.deepEqual(calls, ['signUp'])
  assert.deepEqual(result, {
    recoveredExistingAccount: false,
    nextRoute: '/login',
  })
})
