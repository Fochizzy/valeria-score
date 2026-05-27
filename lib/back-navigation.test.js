import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveSafeBackIntent } from './back-navigation.ts'

test('resolveSafeBackIntent keeps native back behavior when a navigator can go back', () => {
  assert.deepEqual(resolveSafeBackIntent({ canGoBack: true }), {
    type: 'back',
  })
})

test('resolveSafeBackIntent falls back to create-session when there is no history', () => {
  assert.deepEqual(resolveSafeBackIntent({ canGoBack: false }), {
    type: 'replace',
    href: '/create-session',
    source: 'fallback',
  })
})

test('resolveSafeBackIntent accepts an explicit fallback route', () => {
  assert.deepEqual(
    resolveSafeBackIntent({
      canGoBack: false,
      fallbackHref: '/compare',
    }),
    {
      type: 'replace',
      href: '/compare',
      source: 'fallback',
    }
  )
})

test('resolveSafeBackIntent prefers the tracked previous route when native back is unavailable', () => {
  assert.deepEqual(
    resolveSafeBackIntent({
      canGoBack: false,
      previousHref: '/duke-select?sessionId=1',
      fallbackHref: '/create-session',
    }),
    {
      type: 'replace',
      href: '/duke-select?sessionId=1',
      source: 'history',
    }
  )
})
