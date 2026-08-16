import assert from 'node:assert/strict'
import test from 'node:test'

import { isLikelyNetworkError, runWithNetworkRetry } from './network-retry.ts'

test('isLikelyNetworkError matches common connectivity failures', () => {
  assert.equal(isLikelyNetworkError(new TypeError('Network request failed')), true)
  assert.equal(isLikelyNetworkError(new Error('fetch failed')), true)
  assert.equal(isLikelyNetworkError(new Error('Request timed out')), true)
  assert.equal(isLikelyNetworkError({ message: 'TypeError: Failed to fetch' }), true)
})

test('isLikelyNetworkError leaves application errors alone', () => {
  assert.equal(isLikelyNetworkError(new Error('Missing seat row for draft autosave.')), false)
  assert.equal(
    isLikelyNetworkError(new Error('new row violates row-level security policy')),
    false
  )
  assert.equal(isLikelyNetworkError(null), false)
  assert.equal(isLikelyNetworkError(undefined), false)
  assert.equal(isLikelyNetworkError({}), false)
})

test('runWithNetworkRetry returns the first successful result', async () => {
  let calls = 0

  const result = await runWithNetworkRetry(async () => {
    calls += 1
    return 'saved'
  })

  assert.equal(result, 'saved')
  assert.equal(calls, 1)
})

test('runWithNetworkRetry retries transient network failures', async () => {
  let calls = 0
  const sleeps = []

  const result = await runWithNetworkRetry(
    async () => {
      calls += 1
      if (calls < 3) {
        throw new TypeError('Network request failed')
      }
      return 'saved'
    },
    { retries: 2, delayMs: 100, sleep: async (ms) => sleeps.push(ms) }
  )

  assert.equal(result, 'saved')
  assert.equal(calls, 3)
  assert.deepEqual(sleeps, [100, 200])
})

test('runWithNetworkRetry gives up after the retry budget', async () => {
  let calls = 0

  await assert.rejects(
    runWithNetworkRetry(
      async () => {
        calls += 1
        throw new Error('fetch failed')
      },
      { retries: 2, sleep: async () => {} }
    ),
    /fetch failed/
  )

  assert.equal(calls, 3)
})

test('runWithNetworkRetry rethrows non-network errors immediately', async () => {
  let calls = 0

  await assert.rejects(
    runWithNetworkRetry(
      async () => {
        calls += 1
        throw new Error('duplicate key value violates unique constraint')
      },
      { retries: 5, sleep: async () => {} }
    ),
    /duplicate key/
  )

  assert.equal(calls, 1)
})
