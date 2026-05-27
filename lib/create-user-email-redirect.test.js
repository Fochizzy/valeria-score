import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import {
  buildEmailConfirmationRedirectUrl,
  EMAIL_CONFIRMATION_REDIRECT_PATH,
  buildResetPasswordRedirectUrl,
  RESET_PASSWORD_REDIRECT_PATH,
} from './email-confirmation-redirect.ts'

const createUserPath = path.join(process.cwd(), 'app', 'create-user.tsx')
const loginPath = path.join(process.cwd(), 'app', 'login.tsx')

test('create-user screen uses the app deep link for email confirmation', () => {
  const createUserSource = fs.readFileSync(createUserPath, 'utf8')
  const loginSource = fs.readFileSync(loginPath, 'utf8')

  const calls = []
  const redirectUrl = buildEmailConfirmationRedirectUrl((nextPath, options) => {
    calls.push({ nextPath, options })
    return `valeriascore:///${nextPath}`
  })
  assert.equal(redirectUrl, 'valeriascore:///auth-callback')
  assert.equal(EMAIL_CONFIRMATION_REDIRECT_PATH, 'auth-callback')
  assert.deepEqual(calls, [
    {
      nextPath: 'auth-callback',
      options: {
        scheme: 'valeriascore',
        isTripleSlashed: true,
      },
    },
  ])

  const resetCalls = []
  const resetRedirectUrl = buildResetPasswordRedirectUrl((nextPath, options) => {
    resetCalls.push({ nextPath, options })
    return `valeriascore:///${nextPath}`
  })
  assert.equal(resetRedirectUrl, 'valeriascore:///reset-password')
  assert.equal(RESET_PASSWORD_REDIRECT_PATH, 'reset-password')
  assert.deepEqual(resetCalls, [
    {
      nextPath: 'reset-password',
      options: {
        scheme: 'valeriascore',
        isTripleSlashed: true,
      },
    },
  ])

  assert.doesNotMatch(
    createUserSource,
    /emailRedirectTo:\s*['"]https:\/\/[^'"]+\.supabase\.co['"]/,
    'email verification should not redirect back to the bare Supabase host'
  )

  assert.match(
    createUserSource,
    /emailRedirectTo:\s*buildEmailConfirmationRedirectUrl\(Linking\.createURL\)/,
    'create-user should use the shared runtime redirect helper'
  )

  assert.match(
    loginSource,
    /redirectTo:\s*buildResetPasswordRedirectUrl\(Linking\.createURL\)/,
    'login should use the shared runtime redirect helper for password reset links'
  )
})
