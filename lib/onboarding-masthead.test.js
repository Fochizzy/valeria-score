import fs from 'node:fs'
import assert from 'node:assert/strict'
import test from 'node:test'

import { getOnboardingMastheadContent } from './onboarding-masthead.ts'

const mastheadSource = fs.readFileSync(
  new URL('../components/OnboardingMasthead.tsx', import.meta.url),
  'utf8'
)

test('returns login masthead copy without a progress label', () => {
  assert.deepEqual(getOnboardingMastheadContent('login'), {
    kicker: 'Valeria Score',
    title: 'Login',
    subtitle: 'Sign in to continue to your sessions and scores.',
  })
})

test('returns create-user masthead copy without a progress label', () => {
  assert.deepEqual(getOnboardingMastheadContent('create-user'), {
    kicker: 'Valeria Score',
    title: 'Create User',
    subtitle: 'Create your account, then choose your public player ID.',
  })
})

test('returns choose-player-id masthead copy without a progress label', () => {
  assert.deepEqual(getOnboardingMastheadContent('choose-player-id'), {
    kicker: 'Public Identity',
    title: 'Choose Player ID',
    subtitle: 'Other players will use this public ID to recognize you in shared games.',
  })
})

test('centers the onboarding logo frame inside the hero', () => {
  assert.match(mastheadSource, /logoFrame:\s*{[\s\S]*alignSelf:\s*'center',/)
})
