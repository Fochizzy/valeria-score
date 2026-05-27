import type { Href } from 'expo-router'

type RouteParamValue = string | string[] | null | undefined
type RouteParams = Record<string, RouteParamValue>

export type TrackedRouteHistoryState = {
  entries: Href[]
  pendingBackNavigation: boolean
  discardCurrentOnNextVisit: boolean
}

export function createTrackedRouteHistoryState(): TrackedRouteHistoryState {
  return {
    entries: [],
    pendingBackNavigation: false,
    discardCurrentOnNextVisit: false,
  }
}

export function buildTrackedRouteHref(
  pathname: string,
  params: RouteParams = {}
): Href {
  const queryParts = Object.entries(params)
    .flatMap(([key, value]) => {
      if (Array.isArray(value)) {
        return value
          .filter((item) => typeof item === 'string' && item.length > 0)
          .map((item) => [key, item] as const)
      }

      if (typeof value !== 'string' || value.length === 0) {
        return []
      }

      return [[key, value] as const]
    })
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) {
        return leftValue.localeCompare(rightValue)
      }
      return leftKey.localeCompare(rightKey)
    })
    .map(
      ([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )

  if (!queryParts.length) {
    return pathname as Href
  }

  return `${pathname}?${queryParts.join('&')}` as Href
}

export function getTrackedRouteHistoryPreviousHref(
  state: TrackedRouteHistoryState
): Href | null {
  if (state.entries.length < 2) return null
  return state.entries[state.entries.length - 2] ?? null
}

export function markTrackedRouteBackNavigation(
  state: TrackedRouteHistoryState
): TrackedRouteHistoryState {
  if (state.entries.length < 2) {
    return {
      ...state,
      pendingBackNavigation: false,
      discardCurrentOnNextVisit: false,
    }
  }

  return {
    ...state,
    pendingBackNavigation: true,
    discardCurrentOnNextVisit: false,
  }
}

export function discardCurrentTrackedRouteOnNextVisit(
  state: TrackedRouteHistoryState
): TrackedRouteHistoryState {
  if (!state.entries.length) return state

  return {
    ...state,
    pendingBackNavigation: false,
    discardCurrentOnNextVisit: true,
  }
}

export function recordTrackedRouteVisit(
  state: TrackedRouteHistoryState,
  href: Href
): TrackedRouteHistoryState {
  const nextHref = href

  if (state.pendingBackNavigation) {
    if (
      state.entries.length > 1 &&
      state.entries[state.entries.length - 2] === nextHref
    ) {
      return {
        entries: state.entries.slice(0, -1),
        pendingBackNavigation: false,
        discardCurrentOnNextVisit: false,
      }
    }

    return recordTrackedRouteVisit(
      {
        ...state,
        pendingBackNavigation: false,
      },
      nextHref
    )
  }

  if (state.discardCurrentOnNextVisit) {
    const trimmedEntries = state.entries.slice(0, -1)

    if (trimmedEntries[trimmedEntries.length - 1] === nextHref) {
      return {
        entries: trimmedEntries,
        pendingBackNavigation: false,
        discardCurrentOnNextVisit: false,
      }
    }

    return {
      entries: [...trimmedEntries, nextHref],
      pendingBackNavigation: false,
      discardCurrentOnNextVisit: false,
    }
  }

  if (state.entries[state.entries.length - 1] === nextHref) {
    return {
      ...state,
      pendingBackNavigation: false,
      discardCurrentOnNextVisit: false,
    }
  }

  return {
    entries: [...state.entries, nextHref],
    pendingBackNavigation: false,
    discardCurrentOnNextVisit: false,
  }
}

let trackedRouteHistoryState = createTrackedRouteHistoryState()

export function noteTrackedRouteVisit(href: Href) {
  trackedRouteHistoryState = recordTrackedRouteVisit(trackedRouteHistoryState, href)
  return trackedRouteHistoryState
}

export function getTrackedPreviousRoute() {
  return getTrackedRouteHistoryPreviousHref(trackedRouteHistoryState)
}

export function markTrackedBackNavigation() {
  trackedRouteHistoryState = markTrackedRouteBackNavigation(trackedRouteHistoryState)
  return trackedRouteHistoryState
}

export function discardCurrentTrackedRoute() {
  trackedRouteHistoryState = discardCurrentTrackedRouteOnNextVisit(
    trackedRouteHistoryState
  )
  return trackedRouteHistoryState
}

export function resetTrackedRouteHistory(href?: Href | null) {
  trackedRouteHistoryState = createTrackedRouteHistoryState()

  if (href) {
    trackedRouteHistoryState = recordTrackedRouteVisit(
      trackedRouteHistoryState,
      href
    )
  }

  return trackedRouteHistoryState
}
