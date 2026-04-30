type AuthErrorLike = {
  message?: string | null
}

type SetSessionResult = {
  error?: AuthErrorLike | null
}

type UpdateUserResult = {
  error?: AuthErrorLike | null
}

type PasswordRecoveryTokens = {
  accessToken: string
  refreshToken: string
}

type ResetPasswordDeps = {
  setSession: (tokens: PasswordRecoveryTokens) => Promise<SetSessionResult>
}

type UpdateRecoveredPasswordDeps = {
  updateUser: (payload: { password: string }) => Promise<UpdateUserResult>
}

export class ResetPasswordValidationError extends Error {}

function getParamValue(url: string, key: string) {
  const parsed = new URL(url)
  const hashParams = new URLSearchParams(parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.hash)

  return parsed.searchParams.get(key) ?? hashParams.get(key)
}

function extractPasswordRecoveryTokens(url: string): PasswordRecoveryTokens | null {
  const accessToken = getParamValue(url, 'access_token')
  const refreshToken = getParamValue(url, 'refresh_token')

  if (!accessToken || !refreshToken) {
    return null
  }

  return {
    accessToken,
    refreshToken,
  }
}

export async function establishPasswordRecoverySession(url: string, deps: ResetPasswordDeps) {
  const tokens = extractPasswordRecoveryTokens(url)

  if (!tokens) {
    throw new Error('Reset link is missing recovery information. Request a new password reset email.')
  }

  const result = await deps.setSession(tokens)

  if (result.error) {
    throw new Error(result.error.message ?? 'Unknown error')
  }
}

export async function updateRecoveredPassword(
  {
    password,
    confirmPassword,
  }: {
    password: string
    confirmPassword: string
  },
  deps: UpdateRecoveredPasswordDeps
) {
  if (!password) {
    throw new ResetPasswordValidationError('Enter a new password.')
  }

  if (password.length < 6) {
    throw new ResetPasswordValidationError('Use at least 6 characters.')
  }

  if (password !== confirmPassword) {
    throw new ResetPasswordValidationError('Passwords do not match.')
  }

  const result = await deps.updateUser({
    password,
  })

  if (result.error) {
    throw new Error(result.error.message ?? 'Unknown error')
  }

  return {
    message: 'Password updated. You can continue into the app with your new password.',
  }
}
