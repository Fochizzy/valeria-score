export type AuthLinkSessionTokens = {
  accessToken: string
  refreshToken: string
}

export type AuthLinkFallbackRoute = '/auth-callback' | '/reset-password'

export function extractSessionTokensFromUrl(
  url: string | null | undefined
): AuthLinkSessionTokens | null {
  if (!url) return null

  const hashIndex = url.indexOf('#')
  if (hashIndex === -1) return null

  const fragment = url.substring(hashIndex + 1)
  const params = new URLSearchParams(fragment)
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')

  if (!accessToken || !refreshToken) return null

  return {
    accessToken,
    refreshToken,
  }
}

export function getAuthLinkFallbackRoute(
  url: string | null | undefined
): AuthLinkFallbackRoute | null {
  if (!extractSessionTokensFromUrl(url)) return null

  const hashIndex = url?.indexOf('#') ?? -1
  const fragment = hashIndex >= 0 ? url!.substring(hashIndex + 1) : ''
  const params = new URLSearchParams(fragment)

  return params.get('type') === 'recovery' ? '/reset-password' : '/auth-callback'
}
