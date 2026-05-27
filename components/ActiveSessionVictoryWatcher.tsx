import { usePathname, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { didAppBecomeActive } from '../lib/app-state-refresh'
import {
  shouldAllowActiveSessionVictoryRoute,
  shouldAutoRouteActiveSessionToVictory,
} from '../lib/active-session-victory-route'
import { subscribeToSessionActivity, subscribeToSessionScores } from '../lib/realtime'
import { loadSessionLockState } from '../lib/scores'
import { getActiveJoinCode, getActiveSessionId } from '../lib/sessions'
import { shouldAutoRouteToVictoryOnLock } from '../lib/session-score-lock'
import { buildVictoryRoute } from '../lib/victory-route'

type ActiveSessionState = {
  joinCode: string
  sessionId: string
}

const EMPTY_ACTIVE_SESSION: ActiveSessionState = Object.freeze({
  joinCode: '',
  sessionId: '',
})

export default function ActiveSessionVictoryWatcher() {
  const pathname = usePathname()
  const router = useRouter()
  const appStateRef = useRef(AppState.currentState)
  const routedSessionIdRef = useRef('')
  const [activeSession, setActiveSession] = useState<ActiveSessionState>(EMPTY_ACTIVE_SESSION)

  const routeToVictory = useCallback(
    (sessionId: string, joinCode: string) => {
      if (
        !shouldAllowActiveSessionVictoryRoute({
          pathname,
          sessionId,
          alreadyRoutedSessionId: routedSessionIdRef.current,
        })
      ) {
        return false
      }

      routedSessionIdRef.current = sessionId
      router.replace(buildVictoryRoute(sessionId, joinCode) as never)
      return true
    },
    [pathname, router]
  )

  const loadStoredActiveSession = useCallback(async () => {
    const [storedSessionId, storedJoinCode] = await Promise.all([
      getActiveSessionId(),
      getActiveJoinCode(),
    ])

    const nextState = {
      sessionId: String(storedSessionId ?? '').trim(),
      joinCode: String(storedJoinCode ?? '').trim(),
    }

    setActiveSession((current) =>
      current.sessionId === nextState.sessionId && current.joinCode === nextState.joinCode
        ? current
        : nextState
    )

    return nextState
  }, [])

  const refreshVictoryState = useCallback(
    async (session = activeSession) => {
      if (!session.sessionId) {
        return
      }

      try {
        const lockState = await loadSessionLockState(session.sessionId)

        if (
          !shouldAutoRouteActiveSessionToVictory({
            pathname,
            sessionId: session.sessionId,
            totalEntries: lockState.totalEntries,
            lockedEntries: lockState.lockedEntries,
            alreadyRoutedSessionId: routedSessionIdRef.current,
          })
        ) {
          return
        }

        routeToVictory(session.sessionId, session.joinCode)
      } catch (error) {
        console.error('Failed to refresh active-session victory state.', error)
      }
    },
    [activeSession, pathname, routeToVictory]
  )

  useEffect(() => {
    void loadStoredActiveSession()
  }, [loadStoredActiveSession, pathname])

  useEffect(() => {
    routedSessionIdRef.current = ''
  }, [activeSession.sessionId])

  useEffect(() => {
    if (!activeSession.sessionId) {
      return
    }

    void refreshVictoryState(activeSession)
  }, [activeSession, refreshVictoryState])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (!didAppBecomeActive(appStateRef.current, nextState)) {
        appStateRef.current = nextState
        return
      }

      void (async () => {
        const nextActiveSession = await loadStoredActiveSession()
        await refreshVictoryState(nextActiveSession)
      })()

      appStateRef.current = nextState
    })

    return () => {
      subscription.remove()
    }
  }, [loadStoredActiveSession, refreshVictoryState])

  useEffect(() => {
    if (!activeSession.sessionId) {
      return
    }

    return subscribeToSessionScores(activeSession.sessionId, (payload) => {
      if (
        !shouldAutoRouteToVictoryOnLock({
          sessionId: activeSession.sessionId,
          payload,
          alreadyRouted: routedSessionIdRef.current === activeSession.sessionId,
        })
      ) {
        return
      }

      routeToVictory(activeSession.sessionId, activeSession.joinCode)
    })
  }, [activeSession.joinCode, activeSession.sessionId, routeToVictory])

  useEffect(() => {
    if (!activeSession.sessionId) {
      return
    }

    return subscribeToSessionActivity(activeSession.sessionId, () => {
      void refreshVictoryState(activeSession)
    })
  }, [activeSession, refreshVictoryState])

  return null
}
