import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ResetPasswordValidationError,
  establishPasswordRecoverySession,
  updateRecoveredPassword,
} from './reset-password-flow.ts'

test('establishPasswordRecoverySession reads access and refresh tokens from the recovery link hash', async () => {
  const sessions = []

  await establishPasswordRecoverySession(
    'valeriascore://reset-password#access_token=access-123&refresh_token=refresh-456&type=recovery',
    {
      setSession: async (session) => {
        sessions.push(session)
        return { error: null }
      },
    }
  )

  assert.deepEqual(sessions, [
    {
      accessToken: 'access-123',
      refreshToken: 'refresh-456',
    },
  ])
})

test('establishPasswordRecoverySession rejects links without recovery tokens', async () => {
  await assert.rejects(
    () =>
      establishPasswordRecoverySession('valeriascore://reset-password', {
        setSession: async () => ({ error: null }),
      }),
    /Reset link is missing recovery information/
  )
})

test('updateRecoveredPassword validates the password confirmation before calling Supabase', async () => {
  let called = false

  await assert.rejects(
    () =>
      updateRecoveredPassword(
        {
          password: 'hunter2',
          confirmPassword: 'different',
        },
        {
          updateUser: async () => {
            called = true
            return { error: null }
          },
        }
      ),
    ResetPasswordValidationError
  )

  assert.equal(called, false)
})

test('updateRecoveredPassword updates the password and returns a success message', async () => {
  const payloads = []

  const result = await updateRecoveredPassword(
    {
      password: 'hunter2',
      confirmPassword: 'hunter2',
    },
    {
      updateUser: async (payload) => {
        payloads.push(payload)
        return { error: null }
      },
    }
  )

  assert.deepEqual(payloads, [{ password: 'hunter2' }])
  assert.equal(
    result.message,
    'Password updated. You can continue into the app with your new password.'
  )
})
