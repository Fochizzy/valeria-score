import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildSoloDraftFromResult,
  isSoloStatVisibleForRole,
  resolveSoloOutcome,
  sanitizeSoloInputsForRole,
  SOLO_VICTORY_CONDITION_OPTIONS,
  validateSoloGameSetup,
} from './solo-mode.ts'

test('resolveSoloOutcome marks slay all monsters as an automatic player win', () => {
  assert.deepEqual(
    resolveSoloOutcome({
      victoryCondition: 'slay_all_monsters',
      playerTotal: 0,
      darkLordTotal: 999,
    }),
    {
      winner: 'player',
      resolution: 'player_auto',
      requiresScoring: false,
    }
  )
})

test('solo victory condition labels use the updated title casing', () => {
  assert.deepEqual(
    SOLO_VICTORY_CONDITION_OPTIONS.map((option) => option.title),
    [
      'You Slay all Monsters',
      'Monster Attacks Empty Column',
      'Five Stacks Are Exhausted',
    ]
  )
})

test('resolveSoloOutcome marks empty column attacks as an automatic dark lord win', () => {
  assert.deepEqual(
    resolveSoloOutcome({
      victoryCondition: 'monster_attacks_empty_column',
      playerTotal: 999,
      darkLordTotal: 0,
    }),
    {
      winner: 'dark_lord',
      resolution: 'dark_lord_auto',
      requiresScoring: false,
    }
  )
})

test('resolveSoloOutcome treats five exhausted stacks as contested scoring and gives ties to the dark lord', () => {
  assert.deepEqual(
    resolveSoloOutcome({
      victoryCondition: 'five_stacks_exhausted',
      playerTotal: 42,
      darkLordTotal: 42,
    }),
    {
      winner: 'dark_lord',
      resolution: 'contested',
      requiresScoring: true,
    }
  )
})

test('validateSoloGameSetup requires a victory condition before saving any solo game', () => {
  assert.deepEqual(
    validateSoloGameSetup({
      victoryCondition: null,
      playerDukeSlug: '',
      darkLordDukeSlug: '',
    }),
    {
      ok: false,
      reason: 'Choose a victory condition before ending the solo game.',
    }
  )
})

test('validateSoloGameSetup allows automatic solo wins to save without duke picks', () => {
  assert.deepEqual(
    validateSoloGameSetup({
      victoryCondition: 'slay_all_monsters',
      playerDukeSlug: '',
      darkLordDukeSlug: '',
    }),
    {
      ok: true,
      reason: '',
    }
  )
})

test('validateSoloGameSetup still requires both duke picks for contested solo games', () => {
  assert.deepEqual(
    validateSoloGameSetup({
      victoryCondition: 'five_stacks_exhausted',
      playerDukeSlug: 'cornelius_the_dreamer',
      darkLordDukeSlug: '',
    }),
    {
      ok: false,
      reason: 'Choose both dukes before ending a contested solo game.',
    }
  )
})

test('sanitizeSoloInputsForRole clears Dark Lord gold mana and fight values', () => {
  assert.deepEqual(
    sanitizeSoloInputsForRole('dark_lord', {
      gold: 9,
      magic: 7,
      fight: 5,
      vp: 4,
      hammer: 0,
      helmet: 2,
      key: 0,
      holy: 0,
      citizenCount: 0,
      monstersCount: 1,
      monsterPoints: 3,
      bossCount: 0,
      lieutenantCount: 1,
      beastCount: 0,
      minionCount: 0,
      domainCount: 2,
      domainPoints: 4,
    }),
    {
      gold: 0,
      magic: 0,
      fight: 0,
      vp: 4,
      hammer: 0,
      helmet: 2,
      key: 0,
      holy: 0,
      citizenCount: 0,
      monstersCount: 1,
      monsterPoints: 3,
      bossCount: 0,
      lieutenantCount: 1,
      beastCount: 0,
      minionCount: 0,
      domainCount: 2,
      domainPoints: 4,
    }
  )
})

test('isSoloStatVisibleForRole hides Dark Lord resource rows only', () => {
  assert.equal(isSoloStatVisibleForRole('dark_lord', 'gold'), false)
  assert.equal(isSoloStatVisibleForRole('dark_lord', 'magic'), false)
  assert.equal(isSoloStatVisibleForRole('dark_lord', 'fight'), false)
  assert.equal(isSoloStatVisibleForRole('dark_lord', 'vp'), true)
  assert.equal(isSoloStatVisibleForRole('player', 'gold'), true)
})

test('buildSoloDraftFromResult restores a saved solo result into editable draft state', () => {
  const draft = buildSoloDraftFromResult({
    id: 'solo-1',
    playerDukeSlug: 'aguilar_the_gilded_knight',
    darkLordDukeSlug: 'drakkenstrike',
    victoryCondition: 'five_stacks_exhausted',
    winner: 'dark_lord',
    playerInputs: { gold: 8, vp: 4 },
    darkLordInputs: { gold: 5, vp: 6 },
    updatedAt: '2026-05-25T20:00:00.000Z',
    createdAt: '2026-05-25T19:00:00.000Z',
  })

  assert.equal(draft.savedGameId, 'solo-1')
  assert.equal(draft.savedWinner, 'dark_lord')
  assert.equal(draft.savedAt, '2026-05-25T20:00:00.000Z')
  assert.equal(draft.player.dukeSlug, 'aguilar_the_gilded_knight')
  assert.equal(draft.darkLord.dukeSlug, 'drakkenstrike')
  assert.equal(draft.player.inputs.gold, 8)
  assert.equal(draft.darkLord.inputs.gold, 0)
  assert.equal(draft.darkLord.inputs.vp, 6)
})
