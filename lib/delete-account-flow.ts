import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js'

type DeleteAccountInvokeResult = {
  data?: {
    success?: boolean
    error?: string
  } | null
  error?: {
    message?: string | null
  } | null
}

type SignOutResult = {
  error?: {
    message?: string | null
  } | null
}

function getPayloadMessage(payload: unknown) {
  if (!payload) return ''
  if (typeof payload === 'string') return payload.trim()

  if (typeof payload === 'object') {
    const record = payload as Record<string, unknown>

    if (typeof record.error === 'string' && record.error.trim()) {
      return record.error.trim()
    }

    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message.trim()
    }
  }

  return ''
}

async function readFunctionErrorContext(context: unknown) {
  if (!context || typeof context !== 'object') return ''

  const maybeResponse = context as {
    json?: () => Promise<unknown>
    text?: () => Promise<string>
  }

  if (typeof maybeResponse.json === 'function') {
    try {
      const payload = await maybeResponse.json()
      const message = getPayloadMessage(payload)
      if (message) return message
    } catch {}
  }

  if (typeof maybeResponse.text === 'function') {
    try {
      const text = (await maybeResponse.text())?.trim()
      if (!text) return ''

      try {
        const payload = JSON.parse(text) as unknown
        const message = getPayloadMessage(payload)
        return message || text
      } catch {
        return text
      }
    } catch {}
  }

  return getPayloadMessage(context)
}

export async function resolveDeleteAccountErrorMessage(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    const detail = await readFunctionErrorContext(error.context)
    return detail || error.message || 'Unable to delete account.'
  }

  if (error instanceof FunctionsRelayError) {
    return 'The delete-account function could not be reached through Supabase. Confirm it is deployed, then try again.'
  }

  if (error instanceof FunctionsFetchError) {
    return 'The app could not reach the delete-account function. Check your connection and confirm the function is deployed.'
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message.trim()
    }
  }

  return 'Unable to delete account.'
}

export async function deleteAccountAndSignOut(deps: {
  invokeDeleteAccount: () => Promise<DeleteAccountInvokeResult>
  signOutLocal: () => Promise<SignOutResult>
}) {
  const { data, error } = await deps.invokeDeleteAccount()

  if (error) {
    throw new Error(await resolveDeleteAccountErrorMessage(error))
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  const signOutResult = await deps.signOutLocal()

  if (signOutResult.error) {
    throw new Error(signOutResult.error.message ?? 'Unable to clear local session.')
  }
}
