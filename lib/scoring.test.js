import assert from 'node:assert/strict'
import test from 'node:test'

import { cards } from '../data/cards.ts'
import {
  calculateLineItems,
  calculateTotalScore,
  createEmptyInputs,
} from './scoring.ts'

const resourceDuke = {
  name: 'Resource Duke',
  slug: 'resource_duke',
  image: null,
  multipliers: {
    gold: 3,
    magic: 3,
    fight: 3,
    vp: 1,
    hammer: 2,
    helmet: 0,
    key: 0,
    holy: 0,
    citizenCount: 0,
    monstersCount: 0,
    monsterPoints: 1,
    bossCount: 0,
    lieutenantCount: 0,
    beastCount: 0,
    minionCount: 0,
    domainCount: 0,
    domainPoints: 1,
  },
}

test('calculateTotalScore divides combined gold fight and mana by the duke modifier rounded down', () => {
  const inputs = {
    ...createEmptyInputs(),
    gold: 2,
    fight: 2,
    magic: 2,
    vp: 5,
    hammer: 1,
  }

  assert.equal(calculateTotalScore(resourceDuke, inputs), 9)
})

test('calculateLineItems resource subtotals add up to the combined rounded resource score', () => {
  const inputs = {
    ...createEmptyInputs(),
    gold: 2,
    fight: 2,
    magic: 2,
    vp: 5,
    hammer: 1,
  }

  const lineItems = calculateLineItems(resourceDuke, inputs)
  const lineTotal = lineItems.reduce((sum, item) => sum + item.total, 0)

  assert.equal(lineTotal, calculateTotalScore(resourceDuke, inputs))
})

test('Mulholland the Brave scores 2 points per citizen', () => {
  const mulholland = cards.find(
    (card) => card.slug === 'mulholland_the_brave'
  )

  assert.ok(mulholland, 'Expected Mulholland the Brave to exist in duke data.')

  const inputs = {
    ...createEmptyInputs(),
    citizenCount: 3,
    vp: 4,
  }

  const citizenLine = calculateLineItems(mulholland, inputs).find(
    (item) => item.key === 'citizenCount'
  )

  assert.equal(citizenLine?.multiplier, 2)
  assert.equal(citizenLine?.total, 6)
  assert.equal(calculateTotalScore(mulholland, inputs), 10)
})

test('Cornelius the Dreamer scores 3 points per domain', () => {
  const cornelius = cards.find(
    (card) => card.slug === 'cornelius_the_dreamer'
  )

  assert.ok(cornelius, 'Expected Cornelius the Dreamer to exist in duke data.')

  const inputs = {
    ...createEmptyInputs(),
    domainCount: 4,
    domainPoints: 2,
    vp: 5,
  }

  const domainLine = calculateLineItems(cornelius, inputs).find(
    (item) => item.key === 'domainCount'
  )

  assert.equal(domainLine?.multiplier, 3)
  assert.equal(domainLine?.total, 12)
  assert.equal(calculateTotalScore(cornelius, inputs), 19)
})
