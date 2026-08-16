import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildFinishedGamePushes,
  chunkPushes,
  selectRecipientUserIds,
} from './notify-service.ts'

test('selectRecipientUserIds excludes the finisher, nulls, and duplicates', () => {
  const recipients = selectRecipientUserIds(
    ['user-a', 'user-b', null, 'user-a', 'finisher', 'user-c'],
    'finisher'
  )

  assert.deepEqual(recipients.sort(), ['user-a', 'user-b', 'user-c'])
})

test('selectRecipientUserIds returns empty for a solo table', () => {
  assert.deepEqual(selectRecipientUserIds(['finisher', null], 'finisher'), [])
  assert.deepEqual(selectRecipientUserIds([], 'finisher'), [])
})

test('buildFinishedGamePushes builds one push per unique token', () => {
  const pushes = buildFinishedGamePushes(
    [
      { token: 'ExponentPushToken[aaa]', user_id: 'user-a' },
      { token: 'ExponentPushToken[bbb]', user_id: 'user-b' },
      { token: 'ExponentPushToken[aaa]', user_id: 'user-a' },
      { token: '', user_id: 'user-c' },
    ],
    { sessionId: 'session-1', joinCode: 'ABC123' }
  )

  assert.equal(pushes.length, 2)
  assert.equal(pushes[0].to, 'ExponentPushToken[aaa]')
  assert.equal(pushes[0].title, 'Game finished!')
  assert.equal(pushes[0].channelId, 'default')
  assert.deepEqual(pushes[0].data, { sessionId: 'session-1', joinCode: 'ABC123' })
})

test('chunkPushes splits into Expo API sized batches', () => {
  const items = Array.from({ length: 205 }, (_, index) => index)
  const chunks = chunkPushes(items, 100)

  assert.equal(chunks.length, 3)
  assert.equal(chunks[0].length, 100)
  assert.equal(chunks[2].length, 5)
  assert.equal(chunks[2][4], 204)
})

test('chunkPushes handles empty input', () => {
  assert.deepEqual(chunkPushes([], 100), [])
})
