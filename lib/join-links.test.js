import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildJoinUrl,
  extractJoinCodeFromUrl,
  isCompleteJoinCode,
  normalizeJoinCode,
} from './join-links.ts'

test('normalizeJoinCode strips noise and uppercases', () => {
  assert.equal(normalizeJoinCode(' ab-c 123 '), 'ABC123')
  assert.equal(normalizeJoinCode('abc123xyz'), 'ABC123')
  assert.equal(normalizeJoinCode(null), '')
  assert.equal(normalizeJoinCode(undefined), '')
})

test('isCompleteJoinCode requires exactly six characters', () => {
  assert.equal(isCompleteJoinCode('ABC123'), true)
  assert.equal(isCompleteJoinCode('abc123'), true)
  assert.equal(isCompleteJoinCode('ABC12'), false)
  assert.equal(isCompleteJoinCode(''), false)
  assert.equal(isCompleteJoinCode(null), false)
})

test('buildJoinUrl produces the app scheme link', () => {
  assert.equal(buildJoinUrl('ABC123'), 'valeriascore://join/ABC123')
  assert.equal(buildJoinUrl('ab c123'), 'valeriascore://join/ABC123')
})

test('buildJoinUrl refuses incomplete codes', () => {
  assert.equal(buildJoinUrl('ABC12'), '')
  assert.equal(buildJoinUrl(''), '')
})

test('extractJoinCodeFromUrl reads scheme and path forms', () => {
  assert.equal(extractJoinCodeFromUrl('valeriascore://join/ABC123'), 'ABC123')
  assert.equal(extractJoinCodeFromUrl('valeriascore://join/abc123'), 'ABC123')
  assert.equal(extractJoinCodeFromUrl('/join/ABC123'), 'ABC123')
  assert.equal(extractJoinCodeFromUrl('valeriascore://join/ABC123?ref=qr'), 'ABC123')
})

test('extractJoinCodeFromUrl ignores unrelated urls', () => {
  assert.equal(extractJoinCodeFromUrl('valeriascore://score'), null)
  assert.equal(extractJoinCodeFromUrl('valeriascore://join/ABC12'), null)
  assert.equal(extractJoinCodeFromUrl('https://example.com'), null)
  assert.equal(extractJoinCodeFromUrl(null), null)
})
