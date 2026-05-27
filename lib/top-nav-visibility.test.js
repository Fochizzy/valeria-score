import assert from 'node:assert/strict'
import test from 'node:test'

import { shouldShowBottomNav } from './top-nav-visibility.ts'

test('score route still hides the shared bottom navigation during focused scoring', () => {
  assert.equal(shouldShowBottomNav('/score'), false)
})

test('solo score route also hides the shared bottom navigation during focused solo scoring', () => {
  assert.equal(shouldShowBottomNav('/solo-score'), false)
})

test('compare route still shows the shared bottom navigation', () => {
  assert.equal(shouldShowBottomNav('/compare'), true)
})
