import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildDukeHighlights,
  buildPlayerHighlights,
  buildProfilePlainLanguageInsights,
  buildProfileHighlights,
  buildSessionCardMeta,
} from './p3-insights.ts'

test('buildProfileHighlights derives best finish, favorite duke, and last score', () => {
  const result = buildProfileHighlights([
    {
      dukeSlug: 'cornelius_the_dreamer',
      totalScore: 61,
      rank: 1,
      updatedAt: '2026-04-21T15:28:01.000Z',
    },
    {
      dukeSlug: 'cornelius_the_dreamer',
      totalScore: 49,
      rank: 2,
      updatedAt: '2026-04-15T15:28:01.000Z',
    },
    {
      dukeSlug: 'aguilar_the_gilded_knight',
      totalScore: 52,
      rank: 3,
      updatedAt: '2026-04-10T15:28:01.000Z',
    },
  ])

  assert.equal(result[0].value, '#1')
  assert.equal(result[1].value, 'Cornelius the Dreamer')
  assert.equal(result[2].value, '61 pts')
})

test('buildPlayerHighlights picks the leader, most active player, and best average score', () => {
  const result = buildPlayerHighlights([
    {
      player_key: 'user:1',
      player_name: 'Izzy',
      public_player_id: 'IZZY01',
      player_type: 'user',
      games_played: 4,
      wins: 2,
      avg_score: 58.5,
      avg_finish: 1.8,
    },
    {
      player_key: 'guest:1',
      player_name: 'Mara',
      public_player_id: 'MARA02',
      player_type: 'guest',
      games_played: 7,
      wins: 1,
      avg_score: 62.2,
      avg_finish: 2.1,
    },
  ])

  assert.equal(result[0].value, 'Izzy')
  assert.equal(result[1].value, 'Mara')
  assert.equal(result[2].value, 'Mara')
})

test('buildDukeHighlights surfaces top win rate, most played, and best average duke', () => {
  const result = buildDukeHighlights([
    {
      duke_slug: 'cornelius_the_dreamer',
      duke_name: 'Cornelius the Dreamer',
      games_played: 8,
      avg_score: 63.1,
      win_percentage: 54.3,
    },
    {
      duke_slug: 'aguilar_the_gilded_knight',
      duke_name: 'Aguilar the Gilded Knight',
      games_played: 11,
      avg_score: 57.2,
      win_percentage: 41.5,
    },
  ])

  assert.equal(result[0].value, 'Cornelius the Dreamer')
  assert.equal(result[1].value, 'Aguilar the Gilded Knight')
  assert.equal(result[2].value, 'Cornelius the Dreamer')
})

test('buildSessionCardMeta summarizes players, save progress, and readiness state', () => {
  const result = buildSessionCardMeta({
    playerCount: 4,
    totalEntries: 3,
    lockedCount: 2,
  })

  assert.equal(result.playersValue, '4 players')
  assert.equal(result.savedValue, '2 of 3 locked')
  assert.equal(result.statusValue, 'In progress')
  assert.equal(result.isReadyToFinish, false)
})

test('buildSessionCardMeta marks sessions as ready when every entry is locked', () => {
  const result = buildSessionCardMeta({
    playerCount: 3,
    totalEntries: 3,
    lockedCount: 3,
  })

  assert.equal(result.statusValue, 'Ready to finish')
  assert.equal(result.isReadyToFinish, true)
})

test('buildProfilePlainLanguageInsights turns profile stats into readable takeaways', () => {
  const result = buildProfilePlainLanguageInsights({
    summary: {
      games: 4,
      wins: 1,
      avgScore: 56.2,
    },
    history: [
      {
        sessionId: 'session-4',
        dukeSlug: 'lekzandr_the_protector',
        totalScore: 61,
        rank: 1,
        playerCount: 4,
        updatedAt: '2026-04-22T15:28:01.000Z',
      },
      {
        sessionId: 'session-3',
        dukeSlug: 'lekzandr_the_protector',
        totalScore: 54,
        rank: 2,
        playerCount: 4,
        updatedAt: '2026-04-19T15:28:01.000Z',
      },
      {
        sessionId: 'session-2',
        dukeSlug: 'lekzandr_the_protector',
        totalScore: 58,
        rank: 2,
        playerCount: 3,
        updatedAt: '2026-04-15T15:28:01.000Z',
      },
      {
        sessionId: 'session-1',
        dukeSlug: 'aguilar_the_gilded_knight',
        totalScore: 52,
        rank: 3,
        playerCount: 4,
        updatedAt: '2026-04-10T15:28:01.000Z',
      },
    ],
  })

  assert.equal(result.length, 4)
  assert.equal(result[0].title, 'Overall Pace')
  assert.match(result[0].body, /56\.2 PTS/)
  assert.equal(result[1].title, 'Best Run')
  assert.match(result[1].body, /#1/)
  assert.equal(result[2].title, 'Favorite Duke')
  assert.match(result[2].body, /Lekzand'r the Protector/)
  assert.equal(result[3].title, 'Table Pattern')
  assert.match(result[3].body, /around #2/i)
})

test('buildProfilePlainLanguageInsights returns starter guidance when no games exist', () => {
  const result = buildProfilePlainLanguageInsights({
    summary: {
      games: 0,
      wins: 0,
      avgScore: 0,
    },
    history: [],
  })

  assert.equal(result.length, 3)
  assert.equal(result[0].title, 'Finalized Games')
  assert.match(result[0].body, /no finalized games yet/i)
})
