type AuthErrorLike = {
  message?: string | null
}

type ResetPasswordResult = {
  error?: AuthErrorLike | null
}

type ForgotPasswordDeps = {
  resetPasswordForEmail: (
    email: string,
    options: {
      redirectTo: string
    }
  ) => Promise<ResetPasswordResult>
}

export class ForgotPasswordValidationError extends Error {}

export async function requestPasswordReset(
  {
    email,
    redirectTo,
  }: {
    email: string
    redirectTo: string
  },
  deps: ForgotPasswordDeps
) {
  const normalizedEmail = email.trim().toLowerCase()

  if (!normalizedEmail) {
    throw new ForgotPasswordValidationError('Enter your email first.')
  }

  const result = await deps.resetPasswordForEmail(normalizedEmail, {
    redirectTo,
  })

  if (result.error) {
    throw new Error(result.error.message ?? 'Unknown error')
  }

  return {
    message:
      'If an account exists for that email, check your inbox for reset instructions.',
  }
}
