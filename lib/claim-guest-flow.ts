// Claim-a-guest flow.
//
// Two surfaces:
//   - normalizeClaimGuestInput: cleans up the form input from create-user before
//     it gets stuffed into auth user_metadata via signUp's options.data.
//   - executePendingGuestClaim: called from the login flow on a fresh sign-in.
//     If user_metadata carries a pending claim, this dispatches the RPC, then
//     clears the metadata so we don't re-fire on every subsequent login.

export const CLAIM_GUEST_DISPLAY_NAME_KEY = 'claim_guest_display_name'
export const CLAIM_GUEST_PUBLIC_PLAYER_ID_KEY = 'claim_guest_public_player_id'

export type PendingGuestClaim = {
  displayName: string
  publicPlayerId: string
}

export type RawSignUpClaimMetadata = {
  [CLAIM_GUEST_DISPLAY_NAME_KEY]?: string
  [CLAIM_GUEST_PUBLIC_PLAYER_ID_KEY]?: string
}

/**
 * Cleans the create-user form values into the shape that should be persisted
 * onto the new auth user as metadata. Returns null when the user didn't fill
 * out the claim section at all.
 */
export function normalizeClaimGuestInput(
  input: { displayName: string; publicPlayerId: string } | null | undefined
): PendingGuestClaim | null {
  if (!input) return null
  const displayName = (input.displayName ?? '').trim()
  const publicPlayerId = (input.publicPlayerId ?? '').trim()
  if (!displayName && !publicPlayerId) return null
  if (!displayName || !publicPlayerId) {
    throw new Error(
      'To claim a guest account, enter both the guest display name and the player ID.'
    )
  }
  return { displayName, publicPlayerId }
}

/**
 * Builds the user_metadata snippet to merge into supabase.auth.signUp's
 * options.data. Falls through to {} when no claim is pending so callers can
 * always spread the result.
 */
export function buildSignUpClaimMetadata(
  pending: PendingGuestClaim | null | undefined
): RawSignUpClaimMetadata {
  if (!pending) return {}
  return {
    [CLAIM_GUEST_DISPLAY_NAME_KEY]: pending.displayName,
    [CLAIM_GUEST_PUBLIC_PLAYER_ID_KEY]: pending.publicPlayerId,
  }
}

/**
 * Reads the pending-claim fields off user_metadata. Returns null when one or
 * both are missing/empty.
 */
export function readPendingGuestClaim(
  metadata: Record<string, unknown> | null | undefined
): PendingGuestClaim | null {
  if (!metadata) return null
  const rawDisplayName = metadata[CLAIM_GUEST_DISPLAY_NAME_KEY]
  const rawPlayerId = metadata[CLAIM_GUEST_PUBLIC_PLAYER_ID_KEY]
  const displayName = typeof rawDisplayName === 'string' ? rawDisplayName.trim() : ''
  const publicPlayerId = typeof rawPlayerId === 'string' ? rawPlayerId.trim() : ''
  if (!displayName || !publicPlayerId) return null
  return { displayName, publicPlayerId }
}

export type ClaimGuestRpcResult = {
  guest_id: string
  guest_display_name: string
  guest_public_player_id: string
  scores_transferred: number
}

export type ExecuteClaimDeps = {
  callClaimRpc: (input: PendingGuestClaim) => Promise<{
    data: ClaimGuestRpcResult | null
    error: { message?: string | null } | null
  }>
  // Clears the pending fields off user_metadata. We only call it on success.
  clearPendingMetadata: () => Promise<void>
}

export type ExecuteClaimResult =
  | { status: 'no-pending-claim' }
  | { status: 'claimed'; result: ClaimGuestRpcResult }
  | { status: 'failed'; message: string }

/**
 * Idempotent: if there's a pending claim in user_metadata, dispatch it.
 * - On success: clears metadata so it doesn't re-fire next login.
 * - On failure: leaves the metadata in place (the user can retry by logging in
 *   again or via a future settings UI), but returns a `failed` status with
 *   the surfaced message so the UI can show a non-blocking notice.
 */
export async function executePendingGuestClaim(
  metadata: Record<string, unknown> | null | undefined,
  deps: ExecuteClaimDeps
): Promise<ExecuteClaimResult> {
  const pending = readPendingGuestClaim(metadata)
  if (!pending) return { status: 'no-pending-claim' }

  const { data, error } = await deps.callClaimRpc(pending)

  if (error || !data) {
    return {
      status: 'failed',
      message: error?.message ?? 'We could not claim that guest account right now.',
    }
  }

  await deps.clearPendingMetadata()

  return { status: 'claimed', result: data }
}
