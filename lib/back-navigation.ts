import type { Href } from 'expo-router'

export const DEFAULT_BACK_FALLBACK_HREF = '/create-session' as const satisfies Href

export type SafeBackIntent =
  | { type: 'back' }
  | {
      type: 'replace'
      href: Href
    }

type ResolveSafeBackIntentInput = {
  canGoBack: boolean
  fallbackHref?: Href
}

type PerformSafeBackNavigationInput = ResolveSafeBackIntentInput & {
  back: () => void
  replace: (href: Href) => void
}

export function resolveSafeBackIntent({
  canGoBack,
  fallbackHref = DEFAULT_BACK_FALLBACK_HREF,
}: ResolveSafeBackIntentInput): SafeBackIntent {
  if (canGoBack) {
    return { type: 'back' }
  }

  return {
    type: 'replace',
    href: fallbackHref,
  }
}

export function performSafeBackNavigation({
  canGoBack,
  fallbackHref,
  back,
  replace,
}: PerformSafeBackNavigationInput) {
  const intent = resolveSafeBackIntent({
    canGoBack,
    fallbackHref,
  })

  if (intent.type === 'back') {
    back()
    return intent
  }

  replace(intent.href)
  return intent
}
