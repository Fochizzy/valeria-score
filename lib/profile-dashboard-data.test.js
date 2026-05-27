import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createEmptyProfileDashboard,
  resolveProfileDashboard,
} from './profile-dashboard-data.ts'

test('createEmptyProfileDashboard produces screen-safe defaults', () => {
  assert.deepEqual(createEmptyProfileDashboard(), {
    displayName: 'Player',
    summary: {
      games: 0,
      wins: 0,
      avgScore: 0,
    },
    history: [],
    sharedGuestProfiles: [],
  })
})

test('resolveProfileDashboard normalizes Supabase rpc payloads for the profile screen', () => {
  const dashboard = resolveProfileDashboard({
    displayName: 'Izzy',
    summary: {
      games: '4',
      wins: '2',
      avgScore: '48.5',
    },
    history: [
      {
        sessionId: 'session-1',
        dukeSlug: 'cornelius_the_dreamer',
        totalScore: '52',
        rank: '1',
        playerCount: '4',
        updatedAt: '2026-04-20T12:00:00.000Z',
      },
    ],
    sharedGuestProfiles: [
      {
        id: 'guest-1',
        display_name: 'Mara',
        contact_email: null,
        public_player_id: 'mara02',
        wins: '3',
        losses: '1',
        topDuke: 'Cornelius The Dreamer',
        totalGames: '4',
        inProgressCount: '2',
        lastDraftUpdatedAt: '2026-05-27T18:05:00.000Z',
      },
    ],
  })

  assert.equal(dashboard.displayName, 'Izzy')
  assert.equal(dashboard.summary.avgScore, 48.5)
  assert.deepEqual(dashboard.history[0], {
    sessionId: 'session-1',
    dukeSlug: 'cornelius_the_dreamer',
    totalScore: 52,
    rank: 1,
    playerCount: 4,
    updatedAt: '2026-04-20T12:00:00.000Z',
  })
  assert.deepEqual(dashboard.sharedGuestProfiles[0], {
    id: 'guest-1',
    display_name: 'Mara',
    contact_email: null,
    public_player_id: 'MARA02',
    stats: {
      wins: 3,
      losses: 1,
      topDuke: 'Cornelius The Dreamer',
      totalGames: 4,
      inProgressCount: 2,
      lastDraftUpdatedAt: '2026-05-27T18:05:00.000Z',
    },
  })
  assert.equal('draftDuke' in dashboard.sharedGuestProfiles[0].stats, false)
  assert.equal('draftScoreTotal' in dashboard.sharedGuestProfiles[0].stats, false)
})
