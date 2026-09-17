import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ABOUT_BYLINE,
  ABOUT_CREDITS,
  ABOUT_DISCLAIMER,
  ABOUT_INTRO,
  ABOUT_PARAGRAPHS,
  ABOUT_TITLE,
} from './about-content.ts'

test('heading matches the About label the in-app links use', () => {
  assert.equal(ABOUT_TITLE, 'About')
})

test('intro names the app as an unofficial companion', () => {
  assert.equal(
    ABOUT_INTRO,
    'Valeria Scoring is an unofficial companion app for Valeria: Card Kingdoms.'
  )
})

test('credits name the designer, illustrator, publisher, and trademark holder', () => {
  assert.equal(
    ABOUT_CREDITS,
    'Valeria: Card Kingdoms was designed by Isaias Vallejo, illustrated by Mihajlo ' +
      'Dimitrievski, and is published by Daily Magic Games. Valeria, Valeria: Card ' +
      'Kingdoms and all related names, characters and imagery are trademarks of ' +
      'Daily Magic Games.'
  )
})

test('disclaimer keeps the unlicensed, unaffiliated, game-required wording', () => {
  assert.equal(
    ABOUT_DISCLAIMER,
    'This is a fan-made tool. It is not published, licensed or endorsed by Daily ' +
      'Magic Games, and no affiliation is claimed or implied. A copy of the game is ' +
      'required to use it.'
  )
})

test('byline credits the author', () => {
  assert.equal(ABOUT_BYLINE, 'Built by Izzy (Elizabeth) Hodnett')
})

test('paragraphs render intro, credits, then disclaimer and cannot be mutated', () => {
  assert.deepEqual(ABOUT_PARAGRAPHS, [ABOUT_INTRO, ABOUT_CREDITS, ABOUT_DISCLAIMER])
  assert.equal(Object.isFrozen(ABOUT_PARAGRAPHS), true)
})
