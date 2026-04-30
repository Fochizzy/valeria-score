import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ForgotPasswordValidationError,
  requestPasswordReset,
} from './forgot-password-flow.ts'

test('requestPasswordReset rejects blank email input before calling Supabase', async () => {
  let called = false

  await assert.rejects(
    () =>
      requestPasswordReset(
        {
          email: '   ',
        },
        {
          resetPasswordForEmail: async () => {
            called = true
            return { error: null }
          },
        }
      ),
    ForgotPasswordValidationError
  )

  assert.equal(called, false)
})

test('requestPasswordReset normalizes the email and returns a generic success message', async () => {
  const calls = []

  const result = await requestPasswordReset(
    {
      email: '  Player@Example.com ',
      redirectTo: 'valeriascore://reset-password',
    },
    {
      resetPasswordForEmail: async (email, options) => {
        calls.push({ email, options })
        return { error: null }
      },
    }
  )

  assert.deepEqual(calls, [
    {
      email: 'player@example.com',
      options: {
        redirectTo: 'valeriascore://reset-password',
      },
    },
  ])
  assert.equal(
    result.message,
    'If an account exists for that email, check your inbox for reset instructions.'
  )
})

test('requestPasswordReset surfaces Supabase errors', async () => {
  await assert.rejects(
    () =>
      requestPasswordReset(
        {
          email: 'player@example.com',
          redirectTo: 'valeriascore://reset-password',
        },
        {
          resetPasswordForEmail: async () => ({
            error: { message: 'Email rate limit exceeded' },
          }),
        }
      ),
    /Email rate limit exceeded/
  )
})
