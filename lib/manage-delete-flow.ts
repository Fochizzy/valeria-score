import { deleteAccountAndSignOut } from './delete-account-flow.ts'
import { deleteGuestProfileWithCleanup } from './guest-profile-delete-flow.ts'

type RpcResult = {
  error?: {
    message?: string | null
  } | null
}

type RpcInvoker = (fn: string, args?: Record<string, unknown>) => Promise<RpcResult>

type DeleteMyAccountDeps = Parameters<typeof deleteAccountAndSignOut>[0]
type DeleteGuestProfileDeps = Parameters<typeof deleteGuestProfileWithCleanup>[1]

function getRpcErrorMessage(result: RpcResult, fallbackMessage: string) {
  return result.error?.message ?? fallbackMessage
}

async function invokeRpcOrThrow(
  rpcName: string,
  args: Record<string, unknown> | undefined,
  deps: { invokeRpc: RpcInvoker },
  fallbackMessage: string
) {
  const result = await deps.invokeRpc(rpcName, args)

  if (result.error) {
    throw new Error(getRpcErrorMessage(result, fallbackMessage))
  }
}

export async function deleteMyProfile(deps: { invokeRpc: RpcInvoker }) {
  await invokeRpcOrThrow('delete_my_profile', undefined, deps, 'Unable to delete profile.')
}

export async function deleteMyAccountAndData(deps: DeleteMyAccountDeps) {
  await deleteAccountAndSignOut(deps)
}

export async function deleteGuestProfile(guestId: string, deps: DeleteGuestProfileDeps) {
  await deleteGuestProfileWithCleanup(guestId, deps)
}

export async function deleteOwnedGame(sessionId: string, deps: { invokeRpc: RpcInvoker }) {
  await invokeRpcOrThrow(
    'delete_game',
    {
      p_session_id: sessionId,
    },
    deps,
    'Unable to delete game.'
  )
}

export async function leaveOwnedOrJoinedGame(
  sessionId: string,
  deps: { invokeRpc: RpcInvoker }
) {
  await invokeRpcOrThrow(
    'leave_game',
    {
      p_session_id: sessionId,
    },
    deps,
    'Unable to leave game.'
  )
}

export async function leaveAllGames(deps: { invokeRpc: RpcInvoker }) {
  await invokeRpcOrThrow('leave_all_games', undefined, deps, 'Unable to leave all games.')
}
