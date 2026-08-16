import * as Sentry from '@sentry/react-native'

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN

/**
 * Crash + error reporting. Fully inert until EXPO_PUBLIC_SENTRY_DSN is set,
 * so local dev and builds without a Sentry project behave exactly as before.
 */
export function initMonitoring() {
  if (!sentryDsn) return

  Sentry.init({
    dsn: sentryDsn,
    // Errors and crashes only — keep performance tracing off until we want it.
    tracesSampleRate: 0,
    // Don't report while developing locally.
    enabled: !__DEV__,
  })
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!sentryDsn) return

  Sentry.captureException(error, context ? { extra: context } : undefined)
}

/**
 * Tag reports with the signed-in user so multi-player issues can be traced
 * to a session participant. Pass null on logout.
 */
export function setMonitoringUser(userId: string | null) {
  if (!sentryDsn) return

  Sentry.setUser(userId ? { id: userId } : null)
}

export const wrapRootComponent = sentryDsn
  ? Sentry.wrap.bind(Sentry)
  : <T,>(component: T): T => component
