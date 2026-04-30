import assert from 'node:assert/strict'
import test from 'node:test'

import {
  RESOURCE_FORMULA_DIVIDER,
  RESOURCE_FORMULA_ICON_SIZE,
  RESOURCE_FORMULA_LEADING_SLOT_SIZE,
  getScoreRowAccentTone,
  getScoreRowLayout,
} from './score-row-layout.ts'

test('RESOURCE_FORMULA_DIVIDER uses a division symbol', () => {
  assert.equal(RESOURCE_FORMULA_DIVIDER, '÷')
})

test('resource formula reserves extra leading space for the first icon', () => {
  assert.equal(RESOURCE_FORMULA_ICON_SIZE, 12)
  assert.equal(RESOURCE_FORMULA_LEADING_SLOT_SIZE, 18)
  assert.ok(RESOURCE_FORMULA_LEADING_SLOT_SIZE > RESOURCE_FORMULA_ICON_SIZE)
})

test('getScoreRowLayout uses centered math styling for gold mana and fight rows', () => {
  assert.deepEqual(getScoreRowLayout('Gold'), {
    hideLabel: true,
    plainRuleText: true,
    resourceFormula: true,
    compactLabel: false,
    trailingInlineRule: false,
  })
  assert.deepEqual(getScoreRowLayout('Mana'), {
    hideLabel: true,
    plainRuleText: true,
    resourceFormula: true,
    compactLabel: false,
    trailingInlineRule: false,
  })
  assert.deepEqual(getScoreRowLayout('Fight'), {
    hideLabel: true,
    plainRuleText: true,
    resourceFormula: true,
    compactLabel: false,
    trailingInlineRule: false,
  })
})

test('getScoreRowLayout keeps default styling for short non-resource rows', () => {
  assert.deepEqual(getScoreRowLayout('Key'), {
    hideLabel: false,
    plainRuleText: false,
    resourceFormula: false,
    compactLabel: false,
    trailingInlineRule: true,
  })
})

test('getScoreRowLayout keeps points labels full-size and lines their rule pills to the edge', () => {
  assert.deepEqual(getScoreRowLayout('Victory Points'), {
    hideLabel: false,
    plainRuleText: false,
    resourceFormula: false,
    compactLabel: false,
    trailingInlineRule: true,
  })
  assert.deepEqual(getScoreRowLayout('Monster Points'), {
    hideLabel: false,
    plainRuleText: false,
    resourceFormula: false,
    compactLabel: false,
    trailingInlineRule: true,
  })
  assert.deepEqual(getScoreRowLayout('Domain Points'), {
    hideLabel: false,
    plainRuleText: false,
    resourceFormula: false,
    compactLabel: false,
    trailingInlineRule: true,
  })
  assert.deepEqual(getScoreRowLayout('Domains'), {
    hideLabel: false,
    plainRuleText: false,
    resourceFormula: false,
    compactLabel: false,
    trailingInlineRule: true,
  })
})

test('getScoreRowAccentTone colors resource formula rows by their row type', () => {
  assert.equal(getScoreRowAccentTone('Gold'), 'gold')
  assert.equal(getScoreRowAccentTone('Fight'), 'fight')
  assert.equal(getScoreRowAccentTone('Mana'), 'mana')
})

test('getScoreRowAccentTone colors requested multiplier pills', () => {
  assert.equal(getScoreRowAccentTone('Monsters'), 'gray')
  assert.equal(getScoreRowAccentTone('Domains'), 'green')
  assert.equal(getScoreRowAccentTone('Domain Points'), 'green')
  assert.equal(getScoreRowAccentTone('Monster Points'), 'gray')
})
