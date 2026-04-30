import assert from 'node:assert/strict'
import test from 'node:test'

import { didAppBecomeActive } from './app-state-refresh.ts'

test('didAppBecomeActive only reacts to real background or inactive returns', () => {
  assert.equal(didAppBecomeActive('background', 'active'), true)
  assert.equal(didAppBecomeActive('inactive', 'active'), true)

  assert.equal(didAppBecomeActive('active', 'active'), false)
  assert.equal(didAppBecomeActive('active', 'background'), false)
  assert.equal(didAppBecomeActive(null, 'active'), false)
  assert.equal(didAppBecomeActive(undefined, 'active'), false)
  assert.equal(didAppBecomeActive('', 'active'), false)
})
