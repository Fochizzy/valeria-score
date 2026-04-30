import assert from 'node:assert/strict'
import test from 'node:test'

import { getBottomNavAppearance } from './bottom-nav-appearance.ts'

test('score screen makes compare and profile footer buttons transparent and larger', () => {
  assert.deepEqual(getBottomNavAppearance('compare', 'score'), {
    mode: 'score-footer-secondary',
    minHeight: 92,
    iconSize: 88,
    labelSize: 11,
    gap: 0,
    paddingVertical: 2,
    iconOpacity: 0.92,
    useTabSurface: false,
  })

  assert.deepEqual(getBottomNavAppearance('profile', 'score'), {
    mode: 'score-footer-secondary',
    minHeight: 92,
    iconSize: 88,
    labelSize: 11,
    gap: 0,
    paddingVertical: 2,
    iconOpacity: 0.92,
    useTabSurface: false,
  })
})

test('non-score screens keep the existing active and inactive footer button sizing', () => {
  assert.deepEqual(getBottomNavAppearance('compare', 'compare'), {
    mode: 'active',
    minHeight: 100,
    iconSize: 96,
    labelSize: 11,
    gap: 0,
    paddingVertical: 2,
    iconOpacity: 1,
    useTabSurface: false,
  })

  assert.deepEqual(getBottomNavAppearance('profile', 'compare'), {
    mode: 'inactive',
    minHeight: 92,
    iconSize: 88,
    labelSize: 11,
    gap: 0,
    paddingVertical: 2,
    iconOpacity: 0.86,
    useTabSurface: false,
  })
})
