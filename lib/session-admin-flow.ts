type RpcResult = {
  error?: {
    message?: string | null
  } | null
}

type RpcInvoker = (fn: string, args: Record<string, unknown>) => Promise<RpcResult>

function getRpcErrorMessage(result: RpcResult) {
  return result.error?.message ?? 'Unable to complete the session action.'
}

function isMissingRpcError(message: string, rpcName: string) {
  return (
    message.includes(`public.${rpcName}`) &&
    message.toLowerCase().includes('schema cache')
  )
}

function requireSessionId(sessionId: string) {
  const safeSessionId = String(sessionId ?? '').trim()

  if (!safeSessionId) {
    throw new Error('Missing session id')
  }

  return safeSessionId
}

async function invokeSessionRpc(
  sessionId: string,
  rpcName: string,
  deps: { invokeRpc: RpcInvoker }
) {
  const safeSessionId = requireSessionId(sessionId)
  const result = await deps.invokeRpc(rpcName, {
    p_session_id: safeSessionId,
  })

  if (result.error) {
    throw new Error(getRpcErrorMessage(result))
  }
}

export async function deleteInProgressSessionViaRpc(
  sessionId: string,
  deps: { invokeRpc: RpcInvoker }
) {
  try {
    await invokeSessionRpc(sessionId, 'delete_in_progress_session', deps)
  } catch (error: any) {
    const message = error?.message ?? 'Unable to complete the session action.'

    if (!isMissingRpcError(message, 'delete_in_progress_session')) {
      throw error
    }

    await invokeSessionRpc(sessionId, 'delete_game', deps)
  }
}

export async function finishGameViaRpc(
  sessionId: string,
  deps: { invokeRpc: RpcInvoker }
) {
  await invokeSessionRpc(sessionId, 'finish_game', deps)
}
