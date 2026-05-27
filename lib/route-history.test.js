import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildTrackedRouteHref,
  createTrackedRouteHistoryState,
  discardCurrentTrackedRouteOnNextVisit,
  getTrackedRouteHistoryPreviousHref,
  markTrackedRouteBackNavigation,
  recordTrackedRouteVisit,
} from './route-history.ts'

test('buildTrackedRouteHref sorts params and skips empty values', () => {
  assert.equal(
    buildTrackedRouteHref('/score', {
      sessionId: '42',
      guestMode: '',
      joinCode: 'ABCD12',
      selectedSlug: undefined,
    }),
    '/score?joinCode=ABCD12&sessionId=42'
  )
})

test('recordTrackedRouteVisit exposes the previous route after sequential visits', () => {
  let state = createTrackedRouteHistoryState()
  state = recordTrackedRouteVisit(state, '/create-session')
  state = recordTrackedRouteVisit(state, '/duke-select?sessionId=1')
  state = recordTrackedRouteVisit(state, '/score?sessionId=1')

  assert.equal(getTrackedRouteHistoryPreviousHref(state), '/duke-select?sessionId=1')
})

test('markTrackedRouteBackNavigation pops the current route when the previous route is revisited', () => {
  let state = createTrackedRouteHistoryState()
  state = recordTrackedRouteVisit(state, '/create-session')
  state = recordTrackedRouteVisit(state, '/duke-select?sessionId=1')
  state = recordTrackedRouteVisit(state, '/score?sessionId=1')

  state = markTrackedRouteBackNavigation(state)
  state = recordTrackedRouteVisit(state, '/duke-select?sessionId=1')

  assert.equal(getTrackedRouteHistoryPreviousHref(state), '/create-session')
})

test('discardCurrentTrackedRouteOnNextVisit removes transient routes like bootstrap redirects', () => {
  let state = createTrackedRouteHistoryState()
  state = recordTrackedRouteVisit(state, '/')
  state = discardCurrentTrackedRouteOnNextVisit(state)
  state = recordTrackedRouteVisit(state, '/create-session')

  assert.equal(getTrackedRouteHistoryPreviousHref(state), null)
})
