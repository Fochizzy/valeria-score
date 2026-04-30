import assert from 'node:assert/strict'
import test from 'node:test'

import { formatDukeName } from './duke-names.ts'

test('formatDukeName returns the configured empty label when no duke is selected', () => {
  assert.equal(
    formatDukeName('', { emptyLabel: 'No Duke Selected' }),
    'No Duke Selected'
  )
})

test('formatDukeName prefers the canonical card name when the slug matches a known duke', () => {
  assert.equal(formatDukeName('aguilar_the_gilded_knight'), 'Aguilar the Gilded Knight')
})

test('formatDukeName humanizes unknown slugs so display copy stays readable', () => {
  assert.equal(formatDukeName('test_duke_slug'), 'Test Duke Slug')
})
