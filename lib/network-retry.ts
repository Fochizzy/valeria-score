const NETWORK_ERROR_PATTERN =
  /network request failed|failed to fetch|fetch failed|network error|timeout|timed out|socket|econnrefused|econnreset|enotfound|abort/i

export type RetryOptions = {
  retries?: number
  delayMs?: number
  sleep?: (ms: number) => Promise<void>
}

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

/**
 * True when an error looks like a connectivity blip (device offline, flaky
 * table Wi-Fi) rather than a server-side rejection such as an RLS denial.
 */
export function isLikelyNetworkError(error: unknown): boolean {
  if (!error) return false

  const message =
    typeof error === 'string'
      ? error
      : typeof (error as { message?: unknown }).message === 'string'
        ? ((error as { message: string }).message)
        : ''

  return NETWORK_ERROR_PATTERN.test(message)
}

/**
 * Run an async operation, retrying only when the failure looks like a
 * transient network problem. Non-network failures (validation, RLS,
 * conflicts) are rethrown immediately so real errors surface unchanged.
 */
export async function runWithNetworkRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const retries = options.retries ?? 2
  const delayMs = options.delayMs ?? 700
  const sleep = options.sleep ?? defaultSleep

  let attempt = 0

  for (;;) {
    try {
      return await operation()
    } catch (error) {
      if (attempt >= retries || !isLikelyNetworkError(error)) {
        throw error
      }

      // Linear backoff: 700ms, 1400ms... enough to ride out a Wi-Fi hiccup
      // without making the Save button feel stuck.
      await sleep(delayMs * (attempt + 1))
      attempt += 1
    }
  }
}
