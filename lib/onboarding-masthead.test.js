import assert from 'node:assert/strict'
import test from 'node:test'

import { getOnboardingMastheadContent } from './onboarding-masthead.ts'

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
