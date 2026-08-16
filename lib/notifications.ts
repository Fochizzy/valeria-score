import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'

import { supabase } from './supabase'

let registeredThisRun = false

/**
 * Show pushes as banners while the app is foregrounded. Realtime already
 * updates open screens, so foreground pushes stay quiet (no sound/badge).
 */
export function configureNotificationHandling() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  })
}

/**
 * Ask for permission, fetch the Expo push token, and bind it to the signed-in
 * user. Safe to call on every launch: it registers at most once per app run
 * and swallows every failure (no FCM credentials yet, emulator, permission
 * denied) so it can never disturb the scoring flow.
 */
export async function registerPushTokenForCurrentUser(): Promise<void> {
  if (registeredThisRun || Platform.OS === 'web') {
    return
  }

  registeredThisRun = true

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      registeredThisRun = false
      return
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Game updates',
        importance: Notifications.AndroidImportance.DEFAULT,
      })
    }

    const permissions = await Notifications.getPermissionsAsync()
    let status = permissions.status

    if (status !== 'granted') {
      const request = await Notifications.requestPermissionsAsync()
      status = request.status
    }

    if (status !== 'granted') {
      return
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId

    if (!projectId) {
      return
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })

    if (!token) {
      return
    }

    await supabase.from('push_tokens').upsert(
      {
        token,
        user_id: user.id,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'token' }
    )
  } catch (error) {
    // Expected until FCM credentials are configured; never surface to users.
    console.log('Push token registration skipped:', error)
  }
}

type NotificationRouteData = {
  sessionId?: string
  joinCode?: string
}

export function extractVictoryRouteFromNotification(
  data: Record<string, unknown> | null | undefined
): { sessionId: string; joinCode: string } | null {
  const sessionId = typeof data?.sessionId === 'string' ? data.sessionId : ''

  if (!sessionId) {
    return null
  }

  const joinCode = typeof data?.joinCode === 'string' ? data.joinCode : ''

  return { sessionId, joinCode }
}

/**
 * Ask the backend to notify the other players that the game was finished.
 * Fire-and-forget: a push is a bonus, never a blocker on finishing a game.
 */
export async function notifyGameFinished(sessionId: string): Promise<void> {
  try {
    await supabase.functions.invoke('notify-game-finished', {
      body: { sessionId },
    })
  } catch (error) {
    console.log('Game finished push skipped:', error)
  }
}

export type { NotificationRouteData }
