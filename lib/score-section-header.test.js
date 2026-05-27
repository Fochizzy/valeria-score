import assert from 'node:assert/strict'
import test from 'node:test'

import { getScoreSectionHeaderMeta } from './score-section-header.ts'

test('editable score sections replace the count badge with the hold hint', () => {
  assert.deepEqual(getScoreSectionHeaderMeta({ isLocked: false }), {
    hintText: 'Hold for +/- 10',
    showCountBadge: false,
  })
})

test('locked score sections keep the count badge removed', () => {
  assert.deepEqual(getScoreSectionHeaderMeta({ isLocked: true }), {
    hintText: null,
    showCountBadge: false,
  })
})
