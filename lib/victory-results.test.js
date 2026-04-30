import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildResultsShareMessage,
  resolveVictoryWinner,
} from './victory-results.ts'

const baseEntries = [
  {
    id: 'score-1',
    scoreId: 'score-1',
    label: 'Izzy',
    playerId: 'FOCHIZZY',
    totalScore: 44,
    locked: true,
    isGuest: false,
    userId: 'user-1',
    dukeSlug: 'cornelius_the_dreamer',
    dukeName: 'Cornelius the Dreamer',
    placement: 1,
    isWinner: true,
    hasScore: true,
    guestProfileId: null,
    guestEntryId: null,
  },
  {
    id: 'score-2',
    scoreId: 'score-2',
    label: 'Mara',
    playerId: null,
    totalScore: 38,
    locked: true,
    isGuest: true,
    userId: 'user-1',
    dukeSlug: 'reese_the_firebrand',
    dukeName: 'Reese the Firebrand',
    placement: 2,
    isWinner: false,
    hasScore: true,
    guestProfileId: 'guest-1',
    guestEntryId: 'entry-1',
  },
]

test('resolveVictoryWinner prefers explicit winners before placement fallback', () => {
  assert.equal(resolveVictoryWinner(baseEntries)?.label, 'Izzy')
})

test('resolveVictoryWinner falls back to placement and then first scored entry', () => {
  const placementWinner = resolveVictoryWinner(
    baseEntries.map((entry, index) => ({
      ...entry,
      isWinner: false,
      placement: index + 1,
    }))
  )

  assert.equal(placementWinner?.placement, 1)

  const scoreOrderWinner = resolveVictoryWinner(
    baseEntries.map((entry) => ({
      ...entry,
      isWinner: false,
      placement: null,
    }))
  )

  assert.equal(scoreOrderWinner?.label, 'Izzy')
})

test('buildResultsShareMessage emits ranked final standings', () => {
  const message = buildResultsShareMessage(baseEntries)

  assert.match(message, /^Valeria Results/)
  assert.match(message, /1\. 👑 Izzy \(FOCHIZZY\) - 44 - Cornelius the Dreamer/)
  assert.match(message, /2\. Mara - 38 - Reese the Firebrand/)
})
