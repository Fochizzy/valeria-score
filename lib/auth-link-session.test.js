import assert from 'node:assert/strict'
import test from 'node:test'

import {
  extractSessionTokensFromUrl,
  getAuthLinkFallbackRoute,
} from './auth-link-session.ts'

test('extractSessionTokensFromUrl returns the auth tokens from the URL fragment', () => {
  const tokens = extractSessionTokensFromUrl(
    'valeriascore://auth-callback#access_token=abc123&refresh_token=def456&type=signup'
  )

  assert.deepEqual(tokens, {
    accessToken: 'abc123',
    refreshToken: 'def456',
  })
})

test('extractSessionTokensFromUrl returns null when the link has no tokens', () => {
  assert.equal(extractSessionTokensFromUrl('valeriascore://auth-callback'), null)
  assert.equal(
    extractSessionTokensFromUrl(
      'https://zyoqrknojxoqwqftsrab.supabase.co/auth/v1/verify?type=signup'
    ),
    null
  )
})

test('getAuthLinkFallbackRoute routes recovery links into reset-password', () => {
  assert.equal(
    getAuthLinkFallbackRoute(
      'valeriascore://reset-password#access_token=access-123&refresh_token=refresh-456&type=recovery'
    ),
    '/reset-password'
  )
})

test('getAuthLinkFallbackRoute routes signup links into auth-callback', () => {
  assert.equal(
    getAuthLinkFallbackRoute(
      'valeriascore://auth-callback#access_token=abc123&refresh_token=def456&type=signup'
    ),
    '/auth-callback'
  )
})
