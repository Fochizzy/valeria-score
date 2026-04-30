import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CLAIM_GUEST_DISPLAY_NAME_KEY,
  CLAIM_GUEST_PUBLIC_PLAYER_ID_KEY,
  buildSignUpClaimMetadata,
  executePendingGuestClaim,
  normalizeClaimGuestInput,
  readPendingGuestClaim,
} from './claim-guest-flow.ts'

test('normalizeClaimGuestInput returns null when both fields are empty', () => {
  assert.equal(normalizeClaimGuestInput(null), null)
  assert.equal(normalizeClaimGuestInput({ displayName: '', publicPlayerId: '' }), null)
  assert.equal(
    normalizeClaimGuestInput({ displayName: '   ', publicPlayerId: '\t' }),
    null
  )
})

test('normalizeClaimGuestInput trims and returns the cleaned pair', () => {
  assert.deepEqual(
    normalizeClaimGuestInput({
      displayName: '  Mary  ',
      publicPlayerId: ' MARY42 ',
    }),
    { displayName: 'Mary', publicPlayerId: 'MARY42' }
  )
})

test('normalizeClaimGuestInput throws when only one field is provided', () => {
  assert.throws(
    () =>
      normalizeClaimGuestInput({
        displayName: 'Mary',
        publicPlayerId: '',
      }),
    /both/i
  )
  assert.throws(
    () =>
      normalizeClaimGuestInput({
        displayName: '',
        publicPlayerId: 'MARY42',
      }),
    /both/i
  )
})

test('buildSignUpClaimMetadata round-trips through readPendingGuestClaim', () => {
  const metadata = buildSignUpClaimMetadata({
    displayName: 'Mary',
    publicPlayerId: 'MARY42',
  })
  assert.equal(metadata[CLAIM_GUEST_DISPLAY_NAME_KEY], 'Mary')
  assert.equal(metadata[CLAIM_GUEST_PUBLIC_PLAYER_ID_KEY], 'MARY42')

  assert.deepEqual(readPendingGuestClaim(metadata), {
    displayName: 'Mary',
    publicPlayerId: 'MARY42',
  })
})

test('buildSignUpClaimMetadata returns {} when nothing is pending', () => {
  assert.deepEqual(buildSignUpClaimMetadata(null), {})
})

test('readPendingGuestClaim returns null when fields are missing or blank', () => {
  assert.equal(readPendingGuestClaim(null), null)
  assert.equal(readPendingGuestClaim({}), null)
  assert.equal(
    readPendingGuestClaim({ [CLAIM_GUEST_DISPLAY_NAME_KEY]: 'Mary' }),
    null
  )
  assert.equal(
    readPendingGuestClaim({
      [CLAIM_GUEST_DISPLAY_NAME_KEY]: '',
      [CLAIM_GUEST_PUBLIC_PLAYER_ID_KEY]: 'MARY42',
    }),
    null
  )
})

test('executePendingGuestClaim reports no-pending-claim when metadata is empty', async () => {
  let rpcCalls = 0
  let clears = 0
  const result = await executePendingGuestClaim(null, {
    callClaimRpc: async () => {
      rpcCalls += 1
      return { data: null, error: null }
    },
    clearPendingMetadata: async () => {
      clears += 1
    },
  })

  assert.deepEqual(result, { status: 'no-pending-claim' })
  assert.equal(rpcCalls, 0)
  assert.equal(clears, 0)
})

test('executePendingGuestClaim runs the RPC, clears metadata on success', async () => {
  const calls = []
  const result = await executePendingGuestClaim(
    {
      [CLAIM_GUEST_DISPLAY_NAME_KEY]: 'Mary',
      [CLAIM_GUEST_PUBLIC_PLAYER_ID_KEY]: 'MARY42',
    },
    {
      callClaimRpc: async (input) => {
        calls.push({ event: 'rpc', input })
        return {
          data: {
            guest_id: 'guest-uuid',
            guest_display_name: 'Mary',
            guest_public_player_id: 'MARY42',
            scores_transferred: 8,
          },
          error: null,
        }
      },
      clearPendingMetadata: async () => {
        calls.push({ event: 'clear' })
      },
    }
  )

  assert.deepEqual(calls, [
    { event: 'rpc', input: { displayName: 'Mary', publicPlayerId: 'MARY42' } },
    { event: 'clear' },
  ])
  assert.equal(result.status, 'claimed')
  if (result.status === 'claimed') {
    assert.equal(result.result.scores_transferred, 8)
  }
})

test('executePendingGuestClaim leaves metadata in place when the RPC fails', async () => {
  let cleared = false
  const result = await executePendingGuestClaim(
    {
      [CLAIM_GUEST_DISPLAY_NAME_KEY]: 'Mary',
      [CLAIM_GUEST_PUBLIC_PLAYER_ID_KEY]: 'MARY42',
    },
    {
      callClaimRpc: async () => ({
        data: null,
        error: { message: 'No unclaimed guest matches that display name and player ID' },
      }),
      clearPendingMetadata: async () => {
        cleared = true
      },
    }
  )

  assert.equal(cleared, false)
  assert.equal(result.status, 'failed')
  if (result.status === 'failed') {
    assert.match(result.message, /No unclaimed guest/)
  }
})
