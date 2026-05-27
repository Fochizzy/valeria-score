import type { Href } from 'expo-router'

export const DEFAULT_BACK_FALLBACK_HREF = '/create-session' as const satisfies Href

export type SafeBackIntent =
  | { type: 'back' }
  | {
      type: 'replace'
      href: Href
      source: 'history' | 'fallback'
    }

type ResolveSafeBackIntentInput = {
  canGoBack: boolean
  previousHref?: Href | null
  fallbackHref?: Href
}

type PerformSafeBackNavigationInput = ResolveSafeBackIntentInput & {
  back: () => void
  replace: (href: Href) => void
  markBackNavigation?: () => void
}

export function resolveSafeBackIntent({
  canGoBack,
  previousHref,
  fallbackHref = DEFAULT_BACK_FALLBACK_HREF,
}: ResolveSafeBackIntentInput): SafeBackIntent {
  if (canGoBack) {
    return { type: 'back' }
  }

  if (previousHref) {
    return {
      type: 'replace',
      href: previousHref,
      source: 'history',
    }
  }

  return {
    type: 'replace',
    href: fallbackHref,
    source: 'fallback',
  }
}

export function performSafeBackNavigation({
  canGoBack,
  previousHref,
  fallbackHref,
  back,
  replace,
  markBackNavigation,
}: PerformSafeBackNavigationInput) {
  const intent = resolveSafeBackIntent({
    canGoBack,
    previousHref,
    fallbackHref,
  })

  if (intent.type === 'back') {
    markBackNavigation?.()
    back()
    return intent
  }

  if (intent.source === 'history') {
    markBackNavigation?.()
  }

  replace(intent.href)
  return intent
}
