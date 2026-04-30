import assert from 'node:assert/strict'
import test from 'node:test'

import { buildBottomNavRoute } from './bottom-nav-route.ts'

test('buildBottomNavRoute preserves session params for the profile tab', () => {
  assert.deepEqual(
    buildBottomNavRoute('/profile', {
      sessionId: 'session-1',
      joinCode: 'GT4RQG',
    }),
    {
      pathname: '/profile',
      params: {
        sessionId: 'session-1',
        joinCode: 'GT4RQG',
      },
    }
  )
})

test('buildBottomNavRoute trims missing values down to empty strings', () => {
  assert.deepEqual(
    buildBottomNavRoute('/compare', {
      sessionId: '  ',
      joinCode: null,
    }),
    {
      pathname: '/compare',
      params: {
        sessionId: '',
        joinCode: '',
      },
    }
  )
})

test('buildBottomNavRoute preserves guest score context for score and compare hops', () => {
  assert.deepEqual(
    buildBottomNavRoute('/compare', {
      sessionId: 'session-1',
      joinCode: 'GT4RQG',
      guestMode: '1',
      guestName: 'GuestOne',
      guestProfileId: 'guest-profile-1',
      guestEntryId: 'guest-entry-1',
    }),
    {
      pathname: '/compare',
      params: {
        sessionId: 'session-1',
        joinCode: 'GT4RQG',
        guestMode: '1',
        guestName: 'GuestOne',
        guestProfileId: 'guest-profile-1',
        guestEntryId: 'guest-entry-1',
      },
    }
  )
})
