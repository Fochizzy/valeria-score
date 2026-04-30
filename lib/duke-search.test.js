import assert from 'node:assert/strict'
import test from 'node:test'

import { filterDukesByQuery } from './duke-search.ts'

const dukes = [
  { slug: 'aguilar_the_gilded_knight', name: 'Aguilar the Gilded Knight' },
  { slug: 'cornelius_the_dreamer', name: 'Cornelius the Dreamer' },
  { slug: 'reese_the_firebrand', name: 'Reese the Firebrand' },
]

test('filterDukesByQuery returns all dukes for a blank query', () => {
  assert.deepEqual(filterDukesByQuery(dukes, '   '), dukes)
})

test('filterDukesByQuery matches duke names case-insensitively', () => {
  assert.deepEqual(filterDukesByQuery(dukes, 'dream'), [
    { slug: 'cornelius_the_dreamer', name: 'Cornelius the Dreamer' },
  ])
})

test('filterDukesByQuery keeps the original order of matching dukes', () => {
  assert.deepEqual(filterDukesByQuery(dukes, 'the'), dukes)
})
