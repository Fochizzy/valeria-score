import assert from 'node:assert/strict'
import test from 'node:test'

import { getHeaderLayoutMetrics } from './header-layout.ts'

test('compact headers add breathing room even when the safe-area inset is zero', () => {
  assert.deepEqual(
    getHeaderLayoutMetrics({
      compact: true,
      safeAreaTop: 0,
      rightButtonVariant: 'default',
    }),
    {
      wrapPaddingTop: 6,
      topRowMinHeight: 44,
    }
  )
})

test('compact headers reserve extra room for the tall manage-account action', () => {
  assert.deepEqual(
    getHeaderLayoutMetrics({
      compact: true,
      safeAreaTop: 0,
      rightButtonVariant: 'tall',
    }),
    {
      wrapPaddingTop: 12,
      topRowMinHeight: 84,
    }
  )
})

test('safe-area insets can increase compact header padding without changing the tall button height', () => {
  assert.deepEqual(
    getHeaderLayoutMetrics({
      compact: true,
      safeAreaTop: 20,
      rightButtonVariant: 'tall',
    }),
    {
      wrapPaddingTop: 32,
      topRowMinHeight: 84,
    }
  )
})
