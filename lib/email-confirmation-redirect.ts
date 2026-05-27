export const EMAIL_CONFIRMATION_REDIRECT_PATH = 'auth-callback'
export const RESET_PASSWORD_REDIRECT_PATH = 'reset-password'

type CreateUrlFn = (
  path: string,
  options?: {
    scheme?: string
    isTripleSlashed?: boolean
  }
) => string

function buildAppAuthRedirectUrl(createURL: CreateUrlFn, path: string) {
  return createURL(path, {
    scheme: 'valeriascore',
    isTripleSlashed: true,
  })
}

export function buildEmailConfirmationRedirectUrl(createURL: CreateUrlFn) {
  return buildAppAuthRedirectUrl(createURL, EMAIL_CONFIRMATION_REDIRECT_PATH)
}

export function buildResetPasswordRedirectUrl(createURL: CreateUrlFn) {
  return buildAppAuthRedirectUrl(createURL, RESET_PASSWORD_REDIRECT_PATH)
}
