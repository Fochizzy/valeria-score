import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScoreCommitPayload,
  buildScoreDraftPayload,
} from './score-save-payload.ts'

test('buildScoreCommitPayload keeps guest identity fields when saving a guest score', () => {
  const payload = buildScoreCommitPayload({
    sessionId: 'session-1',
    dukeSlug: 'cornelius_the_dreamer',
    inputs: {
      gold: 3,
      magic: 2,
      fight: 1,
      vp: 0,
      hammer: 0,
      helmet: 0,
      key: 0,
      holy: 0,
      citizenCount: 0,
      monstersCount: 0,
      monsterPoints: 0,
      bossCount: 0,
      lieutenantCount: 0,
      beastCount: 0,
      minionCount: 0,
      domainCount: 0,
      domainPoints: 0,
    },
    totalScore: 27,
    guestMode: true,
    guestName: 'Mara',
    guestProfileId: 'guest-1',
    guestEntryId: 'entry-1',
    ownerUserId: 'user-1',
    lockScore: false,
    includedInStats: false,
    updatedAt: '2026-04-22T14:00:00.000Z',
  })

  assert.equal(payload.session_id, 'session-1')
  assert.equal(payload.duke_slug, 'cornelius_the_dreamer')
  assert.equal(payload.score_total, 27)
  assert.equal(payload.owner_user_id, 'user-1')
  assert.equal(payload.player_name, 'Mara')
  assert.equal(payload.guest_profile_id, 'guest-1')
  assert.equal(payload.guest_entry_id, 'entry-1')
  assert.equal(payload.game_locked, false)
  assert.equal(payload.included_in_stats, false)
  assert.equal(payload.updated_at, '2026-04-22T14:00:00.000Z')
  assert.equal(payload.inputs.gold, 3)
  assert.equal(payload.inputs.magic, 2)
  assert.equal(payload.draft_duke_slug, null)
  assert.equal(payload.draft_inputs, null)
  assert.equal(payload.draft_score_total, null)
  assert.equal(payload.draft_updated_at, null)
})

test('buildScoreCommitPayload clears guest identity fields for a normal player score', () => {
  const payload = buildScoreCommitPayload({
    sessionId: 'session-1',
    dukeSlug: 'aguilar_the_gilded_knight',
    inputs: {
      gold: 0,
      magic: 0,
      fight: 0,
      vp: 4,
      hammer: 1,
      helmet: 0,
      key: 0,
      holy: 0,
      citizenCount: 0,
      monstersCount: 0,
      monsterPoints: 0,
      bossCount: 0,
      lieutenantCount: 0,
      beastCount: 0,
      minionCount: 0,
      domainCount: 0,
      domainPoints: 0,
    },
    totalScore: 19,
    ownerUserId: 'user-2',
    lockScore: true,
    includedInStats: true,
    updatedAt: '2026-04-22T14:00:00.000Z',
  })

  assert.equal(payload.owner_user_id, 'user-2')
  assert.equal(payload.player_name, null)
  assert.equal(payload.guest_profile_id, null)
  assert.equal(payload.guest_entry_id, null)
  assert.equal(payload.game_locked, true)
  assert.equal(payload.included_in_stats, true)
  assert.equal(payload.inputs.hammer, 1)
  assert.equal(payload.inputs.vp, 4)
  assert.equal(payload.draft_duke_slug, null)
  assert.equal(payload.draft_inputs, null)
  assert.equal(payload.draft_score_total, null)
  assert.equal(payload.draft_updated_at, null)
})

test('buildScoreCommitPayload stamps the current session revision for save confirmation', () => {
  const payload = buildScoreCommitPayload({
    sessionId: 'session-1',
    dukeSlug: 'aguilar_the_gilded_knight',
    inputs: {
      gold: 1,
      magic: 0,
      fight: 2,
      vp: 3,
      hammer: 0,
      helmet: 0,
      key: 0,
      holy: 0,
      citizenCount: 0,
      monstersCount: 0,
      monsterPoints: 0,
      bossCount: 0,
      lieutenantCount: 0,
      beastCount: 0,
      minionCount: 0,
      domainCount: 0,
      domainPoints: 0,
    },
    totalScore: 18,
    ownerUserId: 'user-2',
    confirmedRevision: 3,
  })

  assert.equal(payload.confirmed_revision, 3)
})

test('buildScoreDraftPayload writes only draft fields for guest autosave', () => {
  const payload = buildScoreDraftPayload({
    sessionId: 'session-1',
    dukeSlug: 'cornelius_the_dreamer',
    inputs: {
      gold: 3,
      magic: 1,
      fight: 0,
      vp: 4,
      hammer: 0,
      helmet: 0,
      key: 0,
      holy: 0,
      citizenCount: 0,
      monstersCount: 0,
      monsterPoints: 0,
      bossCount: 0,
      lieutenantCount: 0,
      beastCount: 0,
      minionCount: 0,
      domainCount: 0,
      domainPoints: 0,
    },
    totalScore: 29,
    updatedAt: '2026-05-27T18:00:00.000Z',
  })

  assert.deepEqual(payload, {
    draft_duke_slug: 'cornelius_the_dreamer',
    draft_inputs: payload.draft_inputs,
    draft_score_total: 29,
    draft_updated_at: '2026-05-27T18:00:00.000Z',
  })
  assert.equal(payload.duke_slug, undefined)
  assert.equal(payload.score_total, undefined)
})
