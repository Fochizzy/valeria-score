import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CLAIM_GUEST_PUBLIC_PLAYER_ID_KEY,
  buildSignUpClaimMetadata,
  executePendingGuestClaim,
  normalizeClaimGuestInput,
  readPendingGuestClaim,
} from './claim-guest-flow.ts'

test('normalizeClaimGuestInput returns null when both fields are empty', () => {
  assert.equal(normalizeClaimGuestInput(null), null)
  assert.equal(normalizeClaimGuestInput({ publicPlayerId: '' }), null)
  assert.equal(normalizeClaimGuestInput({ publicPlayerId: '\t' }), null)
})

test('normalizeClaimGuestInput trims and returns the cleaned player id', () => {
  assert.deepEqual(normalizeClaimGuestInput({ publicPlayerId: ' MARY42 ' }), {
    publicPlayerId: 'MARY42',
  })
})

test('normalizeClaimGuestInput treats an empty expanded claim section as no pending claim', () => {
  assert.equal(normalizeClaimGuestInput({ publicPlayerId: '   ' }), null)
})

test('buildSignUpClaimMetadata round-trips through readPendingGuestClaim', () => {
  const metadata = buildSignUpClaimMetadata({
    publicPlayerId: 'MARY42',
  })
  assert.equal(metadata[CLAIM_GUEST_PUBLIC_PLAYER_ID_KEY], 'MARY42')

  assert.deepEqual(readPendingGuestClaim(metadata), {
    publicPlayerId: 'MARY42',
  })
})

test('buildSignUpClaimMetadata returns {} when nothing is pending', () => {
  assert.deepEqual(buildSignUpClaimMetadata(null), {})
})

test('readPendingGuestClaim returns null when fields are missing or blank', () => {
  assert.equal(readPendingGuestClaim(null), null)
  assert.equal(readPendingGuestClaim({}), null)
  assert.deepEqual(
    readPendingGuestClaim({
      [CLAIM_GUEST_PUBLIC_PLAYER_ID_KEY]: 'MARY42',
    }),
    {
      publicPlayerId: 'MARY42',
    }
  )
  assert.equal(
    readPendingGuestClaim({
      [CLAIM_GUEST_PUBLIC_PLAYER_ID_KEY]: '',
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
    { event: 'rpc', input: { publicPlayerId: 'MARY42' } },
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
      [CLAIM_GUEST_PUBLIC_PLAYER_ID_KEY]: 'MARY42',
    },
    {
      callClaimRpc: async () => ({
        data: null,
        error: { message: 'No unclaimed guest matches that Player ID' },
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
